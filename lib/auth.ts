import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { cache } from "react";
import { sessions, users } from "./db";
import { HttpError } from "./http";

export const SESSION_COOKIE = "jb_session";
const SESSION_DAYS = 30;

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

// .env.local 的 OWNER_EMAILS（逗號分隔）：擁有者用站內的 ANTHROPIC_API_KEY，其他人自備金鑰（BYOK）。
export function isOwnerEmail(email: string) {
  return (process.env.OWNER_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.trim().toLowerCase());
}

export type CurrentUser = { id: ObjectId; email: string; name: string; picture: string; isOwner: boolean };

export async function createSession(userId: ObjectId) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const collection = await sessions();
  await collection.insertOne({
    _id: new ObjectId(),
    tokenHash: hashToken(token),
    userId,
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_DAYS * 864e5),
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function deleteSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await (await sessions()).deleteOne({ tokenHash: hashToken(token) });
  store.delete(SESSION_COOKIE);
}

// 同一個請求內只查一次資料庫。
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await (await sessions()).findOne({ tokenHash: hashToken(token), expiresAt: { $gt: new Date() } });
  if (!session) return null;
  const user = await (await users()).findOne({ _id: session.userId });
  if (!user) return null;
  return { id: user._id, email: user.email, name: user.name, picture: user.picture, isOwner: isOwnerEmail(user.email) };
});

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new HttpError(401, "請先登入");
  return user;
}
