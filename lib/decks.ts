import type { DeckDoc } from "./db";
import { deckStats } from "./deck-utils";
import type { Deck, DeckSummary } from "./types";

export function toDeck(doc: DeckDoc): Deck {
  return {
    id: doc._id.toString(),
    title: doc.title,
    targetRole: doc.targetRole,
    sourceIds: doc.sourceIds.map(String),
    style: doc.style,
    chapters: doc.chapters,
    progress: doc.progress ?? {},
    ...(doc.analysis ? { analysis: doc.analysis } : {}),
    ...(doc.analysisSourceId ? { analysisSourceId: doc.analysisSourceId.toString() } : {}),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function toDeckSummary(doc: DeckDoc): DeckSummary {
  const stats = deckStats(doc.chapters, doc.progress ?? {});
  return {
    id: doc._id.toString(),
    title: doc.title,
    targetRole: doc.targetRole,
    cardCount: stats.total,
    knownCount: stats.known,
    updatedAt: doc.updatedAt.toISOString(),
  };
}
