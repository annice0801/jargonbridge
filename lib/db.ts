import { MongoClient, type Db, type ObjectId } from "mongodb";
import type { CategoryId, Style } from "./options";
import type { Spec, CardStatus, Concept, KnowledgeChapter, NoteKind, PocketContent, ProjectAnalysis, TermDiagram, TermExplanation, TrackMessage } from "./types";
import { HttpError } from "./http";

export type SourceDoc = {
  _id: ObjectId;
  userId: ObjectId;
  title: string;
  category: CategoryId;
  kind: "url" | "file" | "text";
  origin: string;
  content: string;
  charCount: number;
  createdAt: Date;
};

export type TrackDoc = {
  _id: ObjectId;
  userId: ObjectId;
  title: string;
  targetRole: string;
  sourceIds: ObjectId[];
  style: Style;
  concepts: Concept[];
  currentIndex: number;
  messages: TrackMessage[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
};

export type NoteDoc = {
  _id: ObjectId;
  userId: ObjectId;
  title: string;
  kind: NoteKind;
  plain: string;
  professional: string;
  betterAnswer: string;
  note: string;
  targetRole: string;
  sourceRef: string;
  diagram?: TermDiagram;
  createdAt: Date;
  updatedAt: Date;
};

export type TermDoc = {
  _id: ObjectId;
  key: string;
  term: string;
  targetRole: string;
  style: Style;
  explanation: TermExplanation;
  createdAt: Date;
};

export type DeckDoc = {
  _id: ObjectId;
  userId: ObjectId;
  title: string;
  targetRole: string;
  sourceIds: ObjectId[];
  style: Style;
  chapters: KnowledgeChapter[];
  progress: Record<string, CardStatus>;
  // 舊的知識卡沒有專家解析
  analysis?: ProjectAnalysis;
  analysisSourceId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

export type PocketDoc = PocketContent & {
  _id: ObjectId;
  userId: ObjectId;
  experience: string;
  origin: "ai" | "custom" | "extract";
  targetRole: string;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
  dueAt: Date;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
};

// 每天的複習次數，用來算連續打卡。day 是使用者當地日期 YYYY-MM-DD。
export type PocketLogDoc = { _id: ObjectId; userId: ObjectId; day: string; reviews: number };

export type SpecDoc = { _id: ObjectId; userId: ObjectId; title: string; input: string; audience: string; spec: Spec; createdAt: Date };

export type UserDoc = {
  _id: ObjectId;
  googleSub: string;
  email: string;
  name: string;
  picture: string;
  createdAt: Date;
  lastLoginAt: Date;
};

// 只存 token 的雜湊，資料庫外洩也拿不到可用的登入 Cookie。
export type SessionDoc = {
  _id: ObjectId;
  tokenHash: string;
  userId: ObjectId;
  expiresAt: Date;
  createdAt: Date;
};

const cache = globalThis as unknown as { jargonMongo?: Promise<MongoClient>; jargonIndexes?: Promise<unknown> };

// 第一次連線時建立索引（重複執行不會出錯）：資料依使用者查詢，過期的登入自動刪除。
function ensureIndexes(db: Db) {
  cache.jargonIndexes ??= Promise.all([
    db.collection("users").createIndex({ googleSub: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ tokenHash: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("pocketlogs").createIndex({ userId: 1, day: 1 }, { unique: true }),
    ...["sources", "tracks", "notes", "decks", "pockets", "specs"].map((name) => db.collection(name).createIndex({ userId: 1 })),
  ]).catch((error) => {
    cache.jargonIndexes = undefined;
    console.error("建立索引失敗", error);
  });
  return cache.jargonIndexes;
}

export async function getDb(): Promise<Db> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new HttpError(503, "尚未設定 MONGODB_URI");
  cache.jargonMongo ??= new MongoClient(uri).connect();
  const client = await cache.jargonMongo.catch((error) => {
    cache.jargonMongo = undefined;
    throw error;
  });
  // 明確指定資料庫，避免連線字串帶的是其他專案的資料庫名稱。
  const db = client.db(process.env.MONGODB_DB || "jargon-bridge");
  await ensureIndexes(db);
  return db;
}

export const sources = async () => (await getDb()).collection<SourceDoc>("sources");
export const notes = async () => (await getDb()).collection<NoteDoc>("notes");
export const terms = async () => (await getDb()).collection<TermDoc>("terms");
export const decks = async () => (await getDb()).collection<DeckDoc>("decks");
export const tracks = async () => (await getDb()).collection<TrackDoc>("tracks");
export const pockets = async () => (await getDb()).collection<PocketDoc>("pockets");
export const users = async () => (await getDb()).collection<UserDoc>("users");
export const sessions = async () => (await getDb()).collection<SessionDoc>("sessions");

// 屬於個人的資料表；擁有者第一次登入時，會把登入功能上線前的資料都歸到他名下。
export const OWNED_COLLECTIONS = ["sources", "tracks", "notes", "decks", "pockets", "specs", "pocketlogs"] as const;
export const pocketLogs = async () => (await getDb()).collection<PocketLogDoc>("pocketlogs");
export const specs = async () => (await getDb()).collection<SpecDoc>("specs");
