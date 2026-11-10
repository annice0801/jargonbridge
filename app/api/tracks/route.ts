import { requireUser } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { generate } from "@/lib/ai";
import { tracks, type TrackDoc } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { buildSystem, conceptListSchema } from "@/lib/prompts";
import { objectIdString, styleSchema } from "@/lib/schemas";
import { loadSources, toTrack, toTrackSummary } from "@/lib/tracks";

export const GET = route(async () => {
  const user = await requireUser();
  const collection = await tracks();
  const docs = await collection.find({ userId: user.id }, { projection: { messages: 0 } }).sort({ updatedAt: -1 }).toArray();
  return Response.json({ tracks: docs.map((doc) => toTrackSummary(doc as TrackDoc)) });
});

const createSchema = z.object({
  sourceIds: z.array(objectIdString).min(1),
  targetRole: z.string().trim().min(1).max(60),
  style: styleSchema,
});

export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const body = createSchema.parse(await request.json());
  const sourceIds = body.sourceIds.map((id) => new ObjectId(id));
  const docs = await loadSources(user.id, sourceIds);
  if (docs.length === 0) throw new HttpError(404, "找不到選取的資料");

  const plan = await generate({
    schema: conceptListSchema,
    system: buildSystem("concepts", docs),
    messages: [{ role: "user", content: `目標職位：${body.targetRole}。請整理出學習路徑，title 是這條路徑的簡短名稱。` }],
  });
  if (plan.concepts.length === 0) throw new HttpError(422, "這些資料整理不出概念，請補充內容");

  const now = new Date();
  const doc: Omit<TrackDoc, "_id"> = {
    userId: user.id,
    title: plan.title,
    targetRole: body.targetRole,
    sourceIds,
    style: body.style,
    concepts: plan.concepts.map((concept, index) => ({
      id: new ObjectId().toString(),
      title: concept.title,
      why: concept.why,
      status: index === 0 ? "learning" : "pending",
      passedTechniques: [],
    })),
    currentIndex: 0,
    messages: [],
    version: 0,
    createdAt: now,
    updatedAt: now,
  };
  const collection = await tracks();
  const { insertedId } = await collection.insertOne(doc as TrackDoc);
  return Response.json({ track: toTrack({ ...doc, _id: insertedId }) }, { status: 201 });
});
