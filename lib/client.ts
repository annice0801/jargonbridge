// 瀏覽器端的 fetch 包裝，把 API 的錯誤訊息轉成可顯示的 Error。

// 使用者自備的 Anthropic API key 只存在這台裝置的瀏覽器裡，每次請求附在標頭送出，伺服器不保存。
const KEY_STORAGE = "jb_anthropic_key";
export const BYOK_HEADER = "x-anthropic-key";

export function getStoredKey(): string {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

export function setStoredKey(key: string) {
  try {
    if (key) localStorage.setItem(KEY_STORAGE, key);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    throw new Error("這個瀏覽器不允許儲存資料，無法記住金鑰");
  }
}

export async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  const key = getStoredKey();
  if (key) headers.set(BYOK_HEADER, key);
  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch {
    throw new Error("連不上伺服器，請確認服務還在執行");
  }
  if (response.status === 401) {
    // 登入過期：清掉失效的 Cookie 再回登入頁。
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.replace(new URL("/login", window.location.origin));
    throw new Error("請先登入");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.error ?? `請求失敗（${response.status}）`);
  return data as T;
}

export function postJson<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
