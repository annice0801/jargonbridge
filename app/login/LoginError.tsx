"use client";

import { useSearchParams } from "next/navigation";

const MESSAGES: Record<string, string> = {
  cancelled: "你取消了 Google 登入。",
  state: "登入逾時或連結已失效，請再試一次。",
  google: "Google 登入沒有完成，請再試一次。",
};

export function LoginError() {
  const reason = useSearchParams().get("error");
  if (!reason) return null;
  return (
    <p role="alert" className="mt-8 border-l-2 border-rust pl-4 text-sm leading-relaxed text-rust">
      {MESSAGES[reason] ?? "登入失敗，請再試一次。"}
    </p>
  );
}
