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

export type RadarScores = { professionalism: number; businessImpact: number; cringe: number };

// 評分與風險分析：原句和改寫後各打一次分，並列出踩雷的說法。
export type ToneRadar = {
  input: RadarScores;
  output: RadarScores;
  flags: { phrase: string; reason: string; replacement: string }[];
  verdict: string;
};

export type Translation = {
  radar: ToneRadar;
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
  origin: "ai" | "custom" | "extract";
  targetRole: string;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
  dueAt: string;
  reviewCount: number;
  createdAt: string;
};

export type PocketStreak = { today: number; goal: number; days: number };

export type SpecPriority = "Must" | "Should" | "Could" | "Won't";

// 標準 PRD / Jira 規格：從混亂的客戶對話整理出來的工程規格書。
export type Spec = {
  title: string;
  summary: string;
  background: string;
  userStories: {
    role: string;
    goal: string;
    benefit: string;
    priority: SpecPriority;
    acceptanceCriteria: { given: string; when: string; then: string }[];
  }[];
  definitionOfDone: string[];
  nonFunctional: string[];
  technicalRisks: { risk: string; impact: "high" | "medium" | "low"; mitigation: string }[];
  outOfScope: string[];
  openQuestions: string[];
};

export type SpecRecord = { id: string; title: string; input: string; audience: string; spec: Spec; createdAt: string };
