import { ObjectId } from "mongodb";
import { sources, type SourceDoc, type TrackDoc } from "./db";
import { HttpError } from "./http";
import type { Track, TrackSummary } from "./types";

// 1M context 之內仍設上限，超過時明確告知，不偷偷截斷資料。
const MAX_TOTAL_CHARS = 500_000;

export async function loadSources(userId: ObjectId, ids: ObjectId[]): Promise<SourceDoc[]> {
  if (ids.length === 0) return [];
  const collection = await sources();
  const docs = await collection.find({ _id: { $in: ids }, userId }).sort({ _id: 1 }).toArray();
  const total = docs.reduce((sum, doc) => sum + doc.charCount, 0);
  if (total > MAX_TOTAL_CHARS) {
    throw new HttpError(413, `選取的資料共 ${total.toLocaleString()} 字，超過 ${MAX_TOTAL_CHARS.toLocaleString()} 字上限，請少選幾筆`);
  }
  return docs;
}

export function toTrack(doc: TrackDoc): Track {
  return {
    id: doc._id.toString(),
    title: doc.title,
    targetRole: doc.targetRole,
    sourceIds: doc.sourceIds.map(String),
    style: doc.style,
    concepts: doc.concepts,
    currentIndex: doc.currentIndex,
    messages: doc.messages,
    version: doc.version,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export function toTrackSummary(doc: TrackDoc): TrackSummary {
  return {
    id: doc._id.toString(),
    title: doc.title,
    targetRole: doc.targetRole,
    masteredCount: doc.concepts.filter((concept) => concept.status === "mastered").length,
    conceptCount: doc.concepts.length,
    updatedAt: doc.updatedAt.toISOString(),
  };
}
