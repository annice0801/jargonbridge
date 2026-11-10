import { z } from "zod";
import { generate } from "@/lib/ai";
import { requireUser } from "@/lib/auth";
import { pockets, type PocketDoc } from "@/lib/db";
import { HttpError, route } from "@/lib/http";
import { newPocketFields, toPocketCard } from "@/lib/pockets";
import { buildSystem, pocketSetSchema } from "@/lib/prompts";

const extractSchema = z.object({
  text: z.string().trim().min(1).max(6000),
  targetRole: z.string().trim().min(1).max(60),
});

// 自定義情境提取器：貼上開會聽不懂的對話或面試被問倒的題目，一鍵做成專屬口袋卡並直接存起來。
export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const body = extractSchema.parse(await request.json());
  const raw = body.text.replaceAll("</experience>", "<\\/experience>");
  const result = await generate({
    schema: pocketSetSchema,
    system: buildSystem("pocket", []),
    messages: [
      {
        role: "user",
        content: `目標職位：${body.targetRole}\n下面是學習者今天在公司開會聽不懂的對話，或面試時被問倒的題目。找出他最需要弄懂的 1 到 5 個關鍵概念或術語，每個做成一張口袋卡。\n- scenario 改寫自這段真實情境，讓他一看就想起當時的場面。\n- question 用這段情境裡真正被問到、或最可能被追問的問法。\n- 這不是學習者的親身經歷，STAR 示範他下次遇到時可以怎麼回答，個人經驗和數字一律用「[補：…]」標出。\n<experience>\n${raw}\n</experience>`,
      },
    ],
    maxTokens: 16000,
  });
  if (result.cards.length === 0) throw new HttpError(422, "這段內容找不出可以做成卡片的概念，請多貼一點上下文");

  const now = new Date();
  const items: Omit<PocketDoc, "_id">[] = result.cards.slice(0, 5).map((card) => ({
    ...card,
    userId: user.id,
    experience: body.text.slice(0, 3000),
    origin: "extract",
    targetRole: body.targetRole,
    ...newPocketFields(now),
    createdAt: now,
    updatedAt: now,
  }));
  const { insertedIds } = await (await pockets()).insertMany(items as PocketDoc[]);
  return Response.json({ cards: items.map((item, index) => toPocketCard({ ...item, _id: insertedIds[index] })) }, { status: 201 });
});
