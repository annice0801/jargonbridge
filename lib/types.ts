import type { CategoryId, Style, Technique } from "./options";

export type SourceSummary = {
  id: string;
  title: string;
  category: CategoryId;
  kind: "url" | "file" | "text";
  origin: string;
  charCount: number;
  preview: string;
  createdAt: string;
};

export type Concept = {
  id: string;
  title: string;
  why: string;
  status: "pending" | "learning" | "mastered";
  passedTechniques: Technique[];
};

export type Assessment = {
  evaluated: boolean;
  passed: boolean;
  score: number;
  evidence: string;
  gaps: string[];
};

export type TermHint = { term: string; meaning: string };

export type DiagramNode = { id: string; parentId: string; label: string; note: string };

export type TermDiagram = {
  kind: "tree" | "flow" | "compare";
  title: string;
  nodes: DiagramNode[];
  columns: { name: string; points: string[] }[];
};

export type TermExplanation = {
  plain: string;
  definition: string;
  whyItMatters: string;
  pitfall: string;
  interviewLine: string;
  related: string[];
  diagram: TermDiagram;
};

export type CoachTurn = {
  technique: Technique;
  coachMessage: string;
  plain: string;
  professional: string;
  betterAnswer: string;
  question: string;
  // 舊紀錄沒有這個欄位
  terms?: TermHint[];
  assessment: Assessment;
};

export type TrackMessage =
  | { id: string; conceptId: string; role: "user"; text: string; at: string }
  | { id: string; conceptId: string; role: "coach"; turn: CoachTurn; at: string };

export type TrackSummary = {
  id: string;
  title: string;
  targetRole: string;
  masteredCount: number;
  conceptCount: number;
  updatedAt: string;
};

export type Track = {
  id: string;
  title: string;
  targetRole: string;
  sourceIds: string[];
  style: Style;
  concepts: Concept[];
  currentIndex: number;
  messages: TrackMessage[];
  version: number;
  updatedAt: string;
};

export type Translation = {
  plain: string;
  professional: string;
  betterAnswer: string;
  changes: string[];
  terms: TermHint[];
  missingFacts: string[];
};

export type NoteKind = "coach" | "translation" | "manual" | "term";

export type Note = {
  id: string;
  title: string;
  kind: NoteKind;
  plain: string;
  professional: string;
  betterAnswer: string;
  note: string;
  targetRole: string;
  sourceRef: string;
  diagram?: TermDiagram;
  createdAt: string;
  updatedAt: string;
};

export type CardStatus = "known" | "learning";

export type KnowledgeCard = {
  id: string;
  term: string;
  plain: string;
  example: string;
  inContext: string;
  definition: string;
  related: string[];
};

export type KnowledgeChapter = { id: string; title: string; story: string; cards: KnowledgeCard[] };

export type PointBasis = "stated" | "inferred" | "missing";

export type SlideKind =
  | "overview"
  | "architecture"
  | "star"
  | "decisions"
  | "metrics"
  | "prioritization"
  | "roadmap"
  | "data"
  | "robustness"
  | "interview";

export type AnalysisSlide = {
  id: string;
  kind: SlideKind;
  title: string;
  takeaway: string;
  plain: string;
  points: { text: string; basis: PointBasis; evidence: string }[];
  diagram: TermDiagram;
};

export type ProjectAnalysis = { oneLiner: string; slides: AnalysisSlide[] };

export type Deck = {
  id: string;
  analysis?: ProjectAnalysis;
  analysisSourceId?: string;
  title: string;
  targetRole: string;
  sourceIds: string[];
  style: Style;
  chapters: KnowledgeChapter[];
  progress: Record<string, CardStatus>;
  updatedAt: string;
};

export type DeckSummary = {
  id: string;
  title: string;
  targetRole: string;
  cardCount: number;
  knownCount: number;
  updatedAt: string;
};

export type PocketStar = { situation: string; task: string; action: string; result: string };

// 口袋卡：正面是生活情境直覺題，背面是黑話與 STAR 答題武器庫。
export type PocketContent = {
  scenario: string;
  question: string;
  term: string;
  termMeaning: string;
  goldenLine: string;
  star: PocketStar;
  pitfalls: string[];
};

export type PocketCard = PocketContent & {
  id: string;
  experience: string;
  origin: "ai" | "custom";
  targetRole: string;
  box: number;
  mastered: boolean;
  dueAt: string;
  reviewCount: number;
  createdAt: string;
};
