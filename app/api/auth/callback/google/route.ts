import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { createSession, isOwnerEmail } from "@/lib/auth";
import { getDb, OWNED_COLLECTIONS, users } from "@/lib/db";
import { exchangeCode, OAUTH_COOKIE, OAUTH_COOKIE_PATH } from "@/lib/google-oauth";

// Google 登入完成後導回這裡：驗證 state、換 token、建立或更新使用者，再發登入 Cookie。
export async function GET(request: Request) {
  const url = new URL(request.url);
  const fail = (reason: string) => Response.redirect(new URL(`/login?error=${reason}`, url), 302);

  const store = await cookies();
  const raw = store.get(OAUTH_COOKIE)?.value;
  store.delete({ name: OAUTH_COOKIE, path: OAUTH_COOKIE_PATH });

  if (url.searchParams.get("error")) return fail("cancelled");

  let saved: { state?: string; verifier?: string } = {};
  try {
    saved = raw ? JSON.parse(raw) : {};
  } catch {}
  const code = url.searchParams.get("code");
  if (!code || !saved.state || !saved.verifier || url.searchParams.get("state") !== saved.state) return fail("state");

  try {
    const profile = await exchangeCode(request, code, saved.verifier);
    const now = new Date();
    const user = await (await users()).findOneAndUpdate(
      { googleSub: profile.sub },
      {
        $set: { email: profile.email, name: profile.name, picture: profile.picture, lastLoginAt: now },
        $setOnInsert: { _id: new ObjectId(), createdAt: now },
      },
      { upsert: true, returnDocument: "after" },
    );
    if (!user) return fail("google");

    // 擁有者登入時，把登入功能上線前、還沒有主人的資料都歸到他的帳號。
    if (isOwnerEmail(profile.email)) {
      const db = await getDb();
      await Promise.all(
        OWNED_COLLECTIONS.map((name) => db.collection(name).updateMany({ userId: { $exists: false } }, { $set: { userId: user._id } })),
      );
    }

    await createSession(user._id);
    return Response.redirect(new URL("/coach", url), 302);
  } catch (error) {
    console.error("[auth/google/callback]", error);
    return fail("google");
  }
}
