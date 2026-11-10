import type { PocketDoc } from "./db";
import type { SrsState } from "./srs";
import type { PocketCard } from "./types";

// 舊版（Leitner 盒子）存的卡沒有 SRS 欄位，用新卡的預設值補上。
export function toSrs(doc: PocketDoc): SrsState {
  return {
    intervalDays: doc.intervalDays ?? 0,
    ease: doc.ease ?? 2.5,
    reps: doc.reps ?? 0,
    lapses: doc.lapses ?? 0,
    dueAt: doc.dueAt.toISOString(),
    reviewCount: doc.reviewCount ?? 0,
  };
}

export function toPocketCard(doc: PocketDoc): PocketCard {
  return {
    id: doc._id.toString(),
    scenario: doc.scenario,
    question: doc.question,
    term: doc.term,
    termMeaning: doc.termMeaning,
    goldenLine: doc.goldenLine,
    star: doc.star,
    pitfalls: doc.pitfalls,
    experience: doc.experience,
    origin: doc.origin,
    targetRole: doc.targetRole,
    ...toSrs(doc),
    createdAt: doc.createdAt.toISOString(),
  };
}

export function newPocketFields(now: Date) {
  return { intervalDays: 0, ease: 2.5, reps: 0, lapses: 0, dueAt: now, reviewCount: 0 };
}
