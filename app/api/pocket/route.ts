import { requireUser } from "@/lib/auth";
import { z } from "zod";
import { pocketLogs, pockets, type PocketDoc } from "@/lib/db";
import { route } from "@/lib/http";
import { newPocketFields, toPocketCard } from "@/lib/pockets";
import { DAILY_CAPSULES, streakDays } from "@/lib/srs";
import { pocketInputSchema } from "@/lib/schemas";

const daySchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

// ?today=YYYY-MM-DD 用使用者當地的日期算連續打卡。
export const GET = route(async (request: Request) => {
  const user = await requireUser();
  const today = daySchema.parse(new URL(request.url).searchParams.get("today") ?? new Date().toISOString().slice(0, 10));
  const [docs, logs] = await Promise.all([
    (await pockets()).find({ userId: user.id }).sort({ createdAt: -1 }).toArray(),
    (await pocketLogs()).find({ userId: user.id }).sort({ day: -1 }).limit(400).toArray(),
  ]);
  const doneDays = logs.filter((log) => log.reviews >= DAILY_CAPSULES).map((log) => log.day);
  return Response.json({
    cards: docs.map(toPocketCard),
    streak: { today: logs.find((log) => log.day === today)?.reviews ?? 0, goal: DAILY_CAPSULES, days: streakDays(doneDays, today) },
  });
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
  const doc: Omit<PocketDoc, "_id"> = {
    ...body.card,
    userId: user.id,
    experience: body.experience,
    origin: "custom",
    targetRole: body.targetRole,
    ...newPocketFields(now),
    createdAt: now,
    updatedAt: now,
  };
  const collection = await pockets();
  const { insertedId } = await collection.insertOne(doc as PocketDoc);
  return Response.json({ card: toPocketCard({ ...doc, _id: insertedId }) }, { status: 201 });
});
