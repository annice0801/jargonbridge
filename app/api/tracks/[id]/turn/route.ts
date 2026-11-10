import { requireUser } from "@/lib/auth";
import type Anthropic from "@anthropic-ai/sdk";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { generate } from "@/lib/ai";
import { tracks } from "@/lib/db";
import { HttpError, parseObjectId, route } from "@/lib/http";
import { applyAssessment, REQUIRED_PASSES } from "@/lib/progress";
import { buildSystem, buildTurnContext, coachTurnSchema } from "@/lib/prompts";
import { styleSchema } from "@/lib/schemas";
import { loadSources, toTrack } from "@/lib/tracks";
import type { CoachTurn, TrackMessage } from "@/lib/types";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("start"), style: styleSchema }),
  z.object({ action: z.literal("answer"), style: styleSchema, message: z.string().trim().min(1).max(8000) }),
]);

const START_TEXT = "請開始教這個概念。";

export const POST = route(async (request: Request, context: RouteContext<"/api/tracks/[id]/turn">) => {
  const user = await requireUser();
  const { id } = await context.params;
  const body = bodySchema.parse(await request.json());
  const collection = await tracks();
  const track = await collection.findOne({ _id: parseObjectId(id), userId: user.id });
  if (!track) throw new HttpError(404, "找不到這條學習路徑");

  const concept = track.concepts[track.currentIndex];
  if (!concept) throw new HttpError(409, "這條學習路徑已全部完成");

  const history = track.messages.filter((message) => message.conceptId === concept.id);
  const lastCoach = history.findLast((message) => message.role === "coach");
  if (body.action === "start" && lastCoach) throw new HttpError(409, "這個概念已經開始了");
  if (body.action === "answer" && !lastCoach) throw new HttpError(409, "教練還沒開始這個概念");

  const docs = await loadSources(user.id, track.sourceIds);
  if (docs.length === 0) throw new HttpError(409, "這條路徑使用的資料都被刪除了");

  const answeredTechnique = lastCoach?.role === "coach" ? lastCoach.turn.technique : undefined;
  const wouldComplete =
    answeredTechnique !== undefined &&
    !concept.passedTechniques.includes(answeredTechnique) &&
    concept.passedTechniques.length + 1 >= REQUIRED_PASSES;

  const turnContext = buildTurnContext({
    targetRole: track.targetRole,
    style: body.style,
    concept,
    index: track.currentIndex,
    total: track.concepts.length,
    mastered: track.concepts.filter((item) => item.status === "mastered").map((item) => item.title),
    isFirst: body.action === "start",
    lastCheck: wouldComplete,
  });

  // 只送目前概念的對話，已掌握的概念用名稱帶過，費用才不會隨進度一直累積。
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  if (history.length > 0) messages.push({ role: "user", content: START_TEXT });
  for (const message of history) {
    messages.push(
      message.role === "user"
        ? { role: "user", content: message.text }
        : { role: "assistant", content: JSON.stringify(message.turn) },
    );
  }
  const current = body.action === "answer" ? `<learner_answer>\n${body.message}\n</learner_answer>` : START_TEXT;
  messages.push({ role: "user", content: `${turnContext}\n\n${current}` });

  const generated = await generate({ schema: coachTurnSchema, system: buildSystem("coach", docs), messages });

  const isAnswer = body.action === "answer" && answeredTechnique !== undefined;
  const turn: CoachTurn = {
    ...generated,
    assessment: {
      ...generated.assessment,
      evaluated: isAnswer,
      passed: isAnswer && generated.assessment.passed,
      score: Math.min(100, Math.max(0, Math.round(generated.assessment.score))),
    },
  };

  const progress = isAnswer
    ? applyAssessment(track.concepts, track.currentIndex, answeredTechnique, turn.assessment.passed)
    : { concepts: track.concepts, currentIndex: track.currentIndex, advanced: false, completed: false };

  const at = new Date().toISOString();
  const added: TrackMessage[] = [];
  if (body.action === "answer") {
    added.push({ id: new ObjectId().toString(), conceptId: concept.id, role: "user", text: body.message, at });
  }
  added.push({ id: new ObjectId().toString(), conceptId: concept.id, role: "coach", turn, at });

  // 用 version 擋重複送出，避免同一題被算兩次。
  const updated = await collection.findOneAndUpdate(
    { _id: track._id, version: track.version },
    {
      $push: { messages: { $each: added } },
      $set: {
        concepts: progress.concepts,
        currentIndex: progress.currentIndex,
        style: body.style,
        updatedAt: new Date(),
      },
      $inc: { version: 1 },
    },
    { returnDocument: "after" },
  );
  if (!updated) throw new HttpError(409, "這條路徑剛被更新，請重新整理");

  return Response.json({ track: toTrack(updated), advanced: progress.advanced, completed: progress.completed });
});
