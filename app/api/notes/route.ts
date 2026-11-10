import { requireUser } from "@/lib/auth";
import { z } from "zod";
import { notes } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { toNote } from "@/lib/notes";
import { diagramSchema } from "@/lib/prompts";

const longText = z.string().max(20000).default("");

const createSchema = z.object({
  title: z.string().trim().min(1).max(200),
  kind: z.enum(["coach", "translation", "manual", "term"]),
  plain: longText,
  professional: longText,
  betterAnswer: longText,
  note: longText,
  targetRole: z.string().trim().max(60).default(""),
  sourceRef: z.string().max(200).default(""),
  diagram: diagramSchema.optional(),
});

export const GET = route(async () => {
  const user = await requireUser();
  const collection = await notes();
  const docs = await collection.find({ userId: user.id }).sort({ createdAt: -1 }).toArray();
  return Response.json({ notes: docs.map(toNote) });
});

export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const body = createSchema.parse(await request.json());
  if (![body.plain, body.professional, body.betterAnswer, body.note].some((text) => text.trim())) {
    throw new HttpError(400, "筆記內容是空的");
  }

  const collection = await notes();
  const now = new Date();
  // 教練的同一輪重複按儲存只會有一筆；既有筆記和你加的註記都不會被覆蓋。
  if (body.sourceRef) {
    const doc = await collection.findOneAndUpdate(
      { userId: user.id, sourceRef: body.sourceRef },
      { $setOnInsert: { ...body, userId: user.id, createdAt: now, updatedAt: now } },
      { upsert: true, returnDocument: "after" },
    );
    return Response.json({ note: toNote(doc!) }, { status: 201 });
  }
  const insert = { ...body, userId: user.id, createdAt: now, updatedAt: now };
  const { insertedId } = await collection.insertOne(insert as never);
  return Response.json({ note: toNote({ ...insert, _id: insertedId }) }, { status: 201 });
});
