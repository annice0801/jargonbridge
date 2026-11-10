import type { PocketDoc } from "./db";
import type { LeitnerState } from "./leitner";
import type { PocketCard } from "./types";

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
    box: doc.box,
    mastered: doc.mastered,
    dueAt: doc.dueAt.toISOString(),
    reviewCount: doc.reviewCount,
    createdAt: doc.createdAt.toISOString(),
  };
}

export const toLeitner = (doc: PocketDoc): LeitnerState => ({
  box: doc.box,
  mastered: doc.mastered,
  dueAt: doc.dueAt.toISOString(),
  reviewCount: doc.reviewCount,
});
