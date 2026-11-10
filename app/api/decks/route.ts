import { requireUser } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { generate } from "@/lib/ai";
import { decks, sources, type DeckDoc, type SourceDoc } from "@/lib/db";
import { toDeck, toDeckSummary } from "@/lib/decks";
import { HttpError, route } from "@/lib/http";
import { analysisToMarkdown } from "@/lib/markdown";
import { analysisSchema, buildSystem, deckSchema, describeStyle } from "@/lib/prompts";
import { objectIdString, styleSchema } from "@/lib/schemas";
import { loadSources } from "@/lib/tracks";

export const GET = route(async () => {
  const user = await requireUser();
  const collection = await decks();
  const docs = await collection.find({ userId: user.id }).sort({ updatedAt: -1 }).toArray();
  return Response.json({ decks: docs.map(toDeckSummary) });
});

const createSchema = z.object({
  sourceIds: z.array(objectIdString).min(1),
  targetRole: z.string().trim().min(1).max(60),
  style: styleSchema,
});

const newId = () => new ObjectId().toString();

export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const body = createSchema.parse(await request.json());
  const sourceIds = body.sourceIds.map((id) => new ObjectId(id));
  const docs = await loadSources(user.id, sourceIds);
  if (docs.length === 0) throw new HttpError(404, "找不到選取的資料");

  const ask = `目標職位：${body.targetRole}\n${describeStyle(body.style)}`;
  // 專家解析和知識卡互不依賴，同時產生可以少等一半時間。
  const [analysis, plan] = await Promise.all([
    generate({
      schema: analysisSchema,
      system: buildSystem("analysis", docs),
      messages: [{ role: "user", content: `${ask}\n請做出這份資料的專家解析簡報。` }],
      maxTokens: 48000,
    }),
    generate({
      schema: deckSchema,
      system: buildSystem("deck", docs),
      messages: [{ role: "user", content: `${ask}\n請整理這副知識卡。` }],
      maxTokens: 32000,
    }),
  ]);

  const chapters = plan.chapters
    .map((chapter) => ({
      id: newId(),
      title: chapter.title,
      story: chapter.story,
      cards: chapter.cards.map((card) => ({ id: newId(), ...card })),
    }))
    .filter((chapter) => chapter.cards.length > 0);
  if (chapters.length === 0 && analysis.slides.length === 0) {
    throw new HttpError(422, "這些資料整理不出內容，請補充資料");
  }

  const slides = analysis.slides.map((slide) => ({ id: newId(), ...slide }));
  const now = new Date();

  // 解析另存一筆資料來源，學習教練、即時翻譯都能直接引用。
  let analysisSourceId: ObjectId | undefined;
  if (slides.length > 0) {
    const content = analysisToMarkdown(plan.title, { oneLiner: analysis.oneLiner, slides });
    const sourceCollection = await sources();
    const sourceDoc: Omit<SourceDoc, "_id"> = {
      userId: user.id,
      title: `專家解析：${plan.title}`,
      category: "project",
      kind: "text",
      origin: "知識卡自動產生",
      content,
      charCount: content.length,
      createdAt: now,
    };
    analysisSourceId = (await sourceCollection.insertOne(sourceDoc as SourceDoc)).insertedId;
  }

  const doc: Omit<DeckDoc, "_id"> = {
    userId: user.id,
    title: plan.title,
    targetRole: body.targetRole,
    sourceIds,
    style: body.style,
    chapters,
    progress: {},
    analysis: { oneLiner: analysis.oneLiner, slides },
    ...(analysisSourceId ? { analysisSourceId } : {}),
    createdAt: now,
    updatedAt: now,
  };
  const collection = await decks();
  const { insertedId } = await collection.insertOne(doc as DeckDoc);
  return Response.json({ deck: toDeck({ ...doc, _id: insertedId }) }, { status: 201 });
});
