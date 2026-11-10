import { requireUser } from "@/lib/auth";
import { z } from "zod";
import { generate } from "@/lib/ai";
import { terms, type TermDoc } from "@/lib/db";
import { route } from "@/lib/http";
import { buildSystem, describeStyle, termExplanationSchema } from "@/lib/prompts";
import { styleSchema } from "@/lib/schemas";
import { normalizeTerm } from "@/lib/terms";

const bodySchema = z.object({
  term: z.string().trim().min(1).max(80),
  context: z.string().max(2000).default(""),
  targetRole: z.string().trim().min(1).max(60),
  style: styleSchema,
});

export const POST = route(async (request: Request) => {
  const user = await requireUser();
  const body = bodySchema.parse(await request.json());
  const collection = await terms();
  // 同一個人、同一個詞、職位和白話風格只需要請 AI 產生一次。依帳號分開快取，解說裡可能帶到個人資料的上下文。
  const key = [user.id.toString(), normalizeTerm(body.term), body.targetRole, body.style.level, body.style.tone].join("|");

  const cached = await collection.findOne({ key });
  if (cached) return Response.json({ explanation: cached.explanation, cached: true });

  const explanation = await generate({
    schema: termExplanationSchema,
    system: buildSystem("term", []),
    messages: [
      {
        role: "user",
        content: `要解釋的詞彙：${body.term}\n目標職位：${body.targetRole}\n${describeStyle(body.style)}\n\n<term_context>\n${body.context}\n</term_context>`,
      },
    ],
  });

  const doc: Omit<TermDoc, "_id"> = { key, term: body.term, targetRole: body.targetRole, style: body.style, explanation, createdAt: new Date() };
  await collection.updateOne({ key }, { $setOnInsert: doc }, { upsert: true });
  return Response.json({ explanation, cached: false });
});
