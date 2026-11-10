import { requireUser } from "@/lib/auth";
import { z } from "zod";
import { pockets, type PocketDoc } from "@/lib/db";
import { route } from "@/lib/http";
import { newState } from "@/lib/leitner";
import { toPocketCard } from "@/lib/pockets";
import { pocketInputSchema } from "@/lib/schemas";

export const GET = route(async () => {
  const user = await requireUser();
  const collection = await pockets();
  const docs = await collection.find({ userId: user.id }).sort({ createdAt: -1 }).toArray();
  return Response.json({ cards: docs.map(toPocketCard) });
});

// 「我的黑話卡」：AI 轉譯後或自己填好再存。
const createSchema = z.object({
  card: pocketInputSchema,
  experience: z.string().trim().max(3000).default(""),
  targetRole: z.string().trim().max(60).default(""),
});

export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const body = createSchema.parse(await request.json());
  const now = new Date();
  const state = newState(now);
  const doc: Omit<PocketDoc, "_id"> = {
    ...body.card,
    userId: user.id,
    experience: body.experience,
    origin: "custom",
    targetRole: body.targetRole,
    box: state.box,
    mastered: state.mastered,
    dueAt: now,
    reviewCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  const collection = await pockets();
  const { insertedId } = await collection.insertOne(doc as PocketDoc);
  return Response.json({ card: toPocketCard({ ...doc, _id: insertedId }) }, { status: 201 });
});
