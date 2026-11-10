import type { NoteDoc } from "./db";
import type { Note } from "./types";

export function toNote(doc: NoteDoc): Note {
  return {
    id: doc._id.toString(),
    title: doc.title,
    kind: doc.kind,
    plain: doc.plain,
    professional: doc.professional,
    betterAnswer: doc.betterAnswer,
    note: doc.note,
    targetRole: doc.targetRole,
    sourceRef: doc.sourceRef,
    ...(doc.diagram ? { diagram: doc.diagram } : {}),
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
