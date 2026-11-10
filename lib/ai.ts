import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";
import { headers } from "next/headers";
import { requireUser } from "./auth";
import { HttpError } from "./http";

// 使用者自備的金鑰由瀏覽器放在這個標頭送來，只用在這次請求，伺服器不儲存。
export const BYOK_HEADER = "x-anthropic-key";

// 擁有者用 .env.local 的金鑰；其他人一律用自己的金鑰（BYOK），不會花到擁有者的額度。
async function resolveApiKey(): Promise<{ apiKey: string; own: boolean }> {
  const user = await requireUser();
  if (user.isOwner) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new HttpError(503, "尚未設定 ANTHROPIC_API_KEY，請先加到 .env.local 並重新啟動");
    return { apiKey, own: false };
  }
  const apiKey = (await headers()).get(BYOK_HEADER)?.trim();
  if (!apiKey) throw new HttpError(402, "請先在右上角「API 金鑰」填入你自己的 Anthropic API key");
  if (apiKey.length < 20 || apiKey.length > 300 || /\s/.test(apiKey)) throw new HttpError(400, "API key 格式不正確");
  return { apiKey, own: true };
}

const MODEL = "claude-opus-5-5";

export async function generate<S extends z.ZodType>(options: {
  schema: S;
  system: Anthropic.Beta.BetaTextBlockParam[];
  messages: Anthropic.Beta.BetaMessageParam[];
  maxTokens?: number;
}): Promise<z.infer<S>> {
  const { apiKey, own } = await resolveApiKey();
  // 每次呼叫才建立 client，更新 .env.local 的 key 後不會繼續用舊的。
  const client = new Anthropic({ apiKey, authToken: null });
  let response;
  try {
    // 用串流接收，專家解析這類長輸出才不會碰到 HTTP 逾時；拿到的仍是解析好的結構化結果。
    response = await client.beta.messages
      .stream({
        model: MODEL,
        max_tokens: options.maxTokens ?? 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: options.system,
        messages: options.messages,
        output_config: { effort: "medium", format: betaZodOutputFormat(options.schema) },
      })
      .finalMessage();
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      throw new HttpError(own ? 400 : 503, own ? "你的 Anthropic API key 無效，請到「API 金鑰」重新設定" : "ANTHROPIC_API_KEY 無效，請檢查 .env.local");
    }
    if (error instanceof Anthropic.RateLimitError) {
      throw new HttpError(429, own ? "你的 Anthropic 帳號請求太頻繁或已達用量上限，請稍後再試" : "AI 請求太頻繁或已達用量上限，請稍後再試");
    }
    if (error instanceof Anthropic.BadRequestError) {
      console.error("Claude 400:", error.message);
      throw new HttpError(502, "AI 拒絕了這次請求，可能是用量上限或內容過大");
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Claude error:", error.status, error.message);
      throw new HttpError(502, "AI 服務暫時無法回應，請稍後再試");
    }
    throw error;
  }

  if (response.stop_reason === "refusal") throw new HttpError(422, "AI 拒絕回答這段內容，請換個說法");
  if (response.stop_reason === "max_tokens") throw new HttpError(502, "AI 回覆過長被截斷，請縮小範圍再試");
  if (!response.parsed_output) throw new HttpError(502, "AI 回覆格式不正確，請再試一次");
  return response.parsed_output as z.infer<S>;
}
