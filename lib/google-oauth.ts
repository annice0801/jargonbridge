import "server-only";

// Google OAuth 2.0（Authorization Code + PKCE）。
// Google Cloud Console 的「已授權的重新導向 URI」要加上：
//   http://localhost:3006/api/auth/callback/google
//   https://jargonbridge.vercel.app/api/auth/callback/google

export const OAUTH_COOKIE = "jb_oauth";
// 開始登入和 Google 導回的網址都在 /api/auth 底下，Cookie 要涵蓋兩者。
export const OAUTH_COOKIE_PATH = "/api/auth";
export const OAUTH_COOKIE_MAX_AGE = 10 * 60;

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

function getConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("尚未設定 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET");
  return { clientId, clientSecret };
}

// 回呼網址跟著目前網域走，本機和正式環境不用分開設定。
export const getRedirectUri = (request: Request) => `${new URL(request.url).origin}/api/auth/callback/google`;

const base64url = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64url");

export async function createPkce() {
  const state = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { state, verifier, challenge: base64url(new Uint8Array(digest)) };
}

export function buildAuthUrl(request: Request, state: string, challenge: string) {
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({
    client_id: getConfig().clientId,
    redirect_uri: getRedirectUri(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return url.toString();
}

export type GoogleProfile = { sub: string; email: string; name: string; picture: string };

// 用 code 換 token。id_token 是伺服器直接透過 TLS 向 Google 取得的（OIDC 規範允許此時以 TLS 代替簽章驗證），
// 仍然檢查簽發者、對象和有效期限，確定是發給這個 client 的。
export async function exchangeCode(request: Request, code: string, verifier: string): Promise<GoogleProfile> {
  const { clientId, clientSecret } = getConfig();
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(request),
      grant_type: "authorization_code",
      code_verifier: verifier,
    }),
  });
  const json = await response.json().catch(() => ({}));
  if (!response.ok || typeof json.id_token !== "string") {
    throw new Error(`Google token 交換失敗：${json.error_description ?? json.error ?? response.status}`);
  }
  const payload = JSON.parse(Buffer.from(json.id_token.split(".")[1] ?? "", "base64url").toString("utf8"));
  const issuerOk = payload.iss === "https://accounts.google.com" || payload.iss === "accounts.google.com";
  const audienceOk = payload.aud === clientId || (Array.isArray(payload.aud) && payload.aud.includes(clientId));
  const fresh = typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  if (!issuerOk || !audienceOk || !fresh) throw new Error("Google id_token 不符");
  if (typeof payload.sub !== "string" || typeof payload.email !== "string" || payload.email_verified !== true) {
    throw new Error("Google 帳號沒有已驗證的 Email");
  }
  return {
    sub: payload.sub,
    email: payload.email.toLowerCase(),
    name: typeof payload.name === "string" ? payload.name : "",
    picture: typeof payload.picture === "string" ? payload.picture : "",
  };
}
