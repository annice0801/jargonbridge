import { requireUser } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { generate } from "@/lib/ai";
import { pockets, type PocketDoc } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { newPocketFields, toPocketCard } from "@/lib/pockets";
import { buildSystem, pocketSetSchema } from "@/lib/prompts";
import { objectIdString } from "@/lib/schemas";
import { loadSources } from "@/lib/tracks";

const generateSchema = z.object({
  sourceIds: z.array(objectIdString).min(1),
  targetRole: z.string().trim().min(1).max(60),
});

// 從勾選的資料一次產生一組口袋卡。
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const body = generateSchema.parse(await request.json());
  const docs = await loadSources(user.id, body.sourceIds.map((id) => new ObjectId(id)));
  if (docs.length === 0) throw new HttpError(404, "找不到選取的資料");

  const result = await generate({
    schema: pocketSetSchema,
    system: buildSystem("pocket", docs),
    messages: [
      {
        role: "user",
        content: `目標職位：${body.targetRole}\n請從資料中挑出這個職位面試最可能考的 8 到 12 個核心概念，每個做成一張口袋卡。專案經歷、PRD 與 Roadmap 決策、KPI、優先排序框架、資料架構這類主題，跟資料相關就要涵蓋。`,
      },
    ],
    maxTokens: 24000,
  });
  if (result.cards.length === 0) throw new HttpError(422, "這些資料整理不出口袋卡，請補充資料");

  const now = new Date();
  const items: Omit<PocketDoc, "_id">[] = result.cards.map((card) => ({
    ...card,
    userId: user.id,
    experience: "",
    origin: "ai",
    targetRole: body.targetRole,
    ...newPocketFields(now),
    createdAt: now,
    updatedAt: now,
  }));
  const collection = await pockets();
  const { insertedIds } = await collection.insertMany(items as PocketDoc[]);
  const cards = items.map((item, index) => toPocketCard({ ...item, _id: insertedIds[index] }));
  return Response.json({ cards }, { status: 201 });
});
