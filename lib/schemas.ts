import { z } from "zod";
import { LEVELS, TONES, type LevelId, type ToneId } from "./options";

export const styleSchema = z.object({
  level: z.enum(LEVELS.map((item) => item.id) as [LevelId, ...LevelId[]]),
  tone: z.enum(TONES.map((item) => item.id) as [ToneId, ...ToneId[]]),
});

export const objectIdString = z.string().regex(/^[0-9a-f]{24}$/i);

const field = (max: number) => z.string().trim().max(max);

// 使用者自己輸入或修改口袋卡時的檢查，必填的是正面情境、術語和金牌回答。
export const pocketInputSchema = z.object({
  scenario: field(1000).min(1),
  question: field(1000),
  term: field(120).min(1),
  termMeaning: field(500),
  goldenLine: field(2000).min(1),
  star: z.object({ situation: field(1000), task: field(1000), action: field(1500), result: field(1000) }),
  pitfalls: z.array(field(500)).max(8).transform((items) => items.filter(Boolean)),
});
