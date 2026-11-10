import { cookies } from "next/headers";
import { buildAuthUrl, createPkce, OAUTH_COOKIE, OAUTH_COOKIE_MAX_AGE, OAUTH_COOKIE_PATH } from "@/lib/google-oauth";

// 產生 state 與 PKCE，暫存在短效 Cookie，再把使用者送到 Google 同意畫面。
export async function GET(request: Request) {
  const { state, verifier, challenge } = await createPkce();
  (await cookies()).set(OAUTH_COOKIE, JSON.stringify({ state, verifier }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: OAUTH_COOKIE_PATH,
    maxAge: OAUTH_COOKIE_MAX_AGE,
  });
  return Response.redirect(buildAuthUrl(request, state, challenge), 302);
}
