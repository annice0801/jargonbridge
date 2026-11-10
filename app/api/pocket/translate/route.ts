import { requireUser } from "@/lib/auth";
import { z } from "zod";
import { generate } from "@/lib/ai";
import { route } from "@/lib/http";
import { buildSystem, pocketContentSchema } from "@/lib/prompts";

const translateSchema = z.object({
  experience: z.string().trim().min(1).max(3000),
  targetRole: z.string().trim().min(1).max(60),
});

// 把隨手打的口語經驗轉成一張口袋卡草稿，不直接存，讓使用者先看過、改過再存。
export const POST = route(async (request: Request) => {
  await requireUser();
  const body = translateSchema.parse(await request.json());
  const experience = body.experience.replaceAll("</experience>", "<\\/experience>");
  const card = await generate({
    schema: pocketContentSchema,
    system: buildSystem("pocket", []),
    messages: [
      {
        role: "user",
        content: `目標職位：${body.targetRole}\n下面是學習者用口語寫的親身經驗。請找出這段經驗最適合對應的 PM 或工程核心概念，做成一張口袋卡。STAR 和金牌回答要保留他寫的事實，不要加他沒說過的經歷或數字。\n<experience>\n${experience}\n</experience>`,
      },
    ],
    maxTokens: 8000,
  });
  return Response.json({ card });
});
