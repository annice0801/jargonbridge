"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { getStoredKey, request, setStoredKey } from "@/lib/client";
import { ErrorNote, inputClass, primaryButton } from "./shared";

type Me = { email: string; name: string; picture: string; isOwner: boolean };

export function AccountMenu() {
  const [me, setMe] = useState<Me | null>(null);
  const [hasKey, setHasKey] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let active = true;
    request<{ user: Me }>("/api/auth/me")
      .then((data) => {
        if (!active) return;
        setMe(data.user);
        setHasKey(!!getStoredKey());
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    // 整頁重新載入，清掉畫面上前一個帳號的資料。
    window.location.replace(new URL("/login", window.location.origin));
  }

  if (!me) return <div className="h-8" />;

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 text-sm">
        {me.isOwner ? (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800 ring-1 ring-emerald-200">使用站內 API 金鑰</span>
        ) : (
          <button
            type="button"
            onClick={() => dialog.current?.showModal()}
            className={`rounded-full px-2.5 py-1 text-xs ring-1 ${
              hasKey ? "bg-white text-stone-700 ring-stone-300 hover:bg-stone-50" : "bg-amber-50 text-amber-900 ring-amber-300 hover:bg-amber-100"
            }`}
          >
            {hasKey ? "API 金鑰：已設定" : "API 金鑰：尚未設定"}
          </button>
        )}
        <span className="flex min-w-0 items-center gap-2 text-stone-600">
          {me.picture && (
            // Google 頭像網址不固定網域，用一般 img 就好。
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.picture} alt="" referrerPolicy="no-referrer" className="size-6 rounded-full" />
          )}
          <span className="max-w-40 truncate" title={me.email}>
            {me.name || me.email}
          </span>
        </span>
        <button type="button" onClick={logout} className="text-stone-500 hover:text-stone-900">
          登出
        </button>
      </div>

      {!me.isOwner && !hasKey && (
        <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          AI 功能需要你自己的 Anthropic API key。
          <button type="button" onClick={() => dialog.current?.showModal()} className="ml-1 font-medium underline underline-offset-4">
            現在設定
          </button>
        </p>
      )}

      <dialog ref={dialog} className="m-auto w-[min(92vw,30rem)] rounded-2xl p-0 shadow-xl backdrop:bg-black/40">
        <KeyForm
          onDone={() => {
            setHasKey(!!getStoredKey());
            dialog.current?.close();
          }}
        />
      </dialog>
    </>
  );
}

function KeyForm({ onDone }: { onDone: () => void }) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const stored = getStoredKey();

  function save(event: FormEvent) {
    event.preventDefault();
    const key = value.trim();
    if (key.length < 20 || /\s/.test(key)) {
      setError("看起來不是完整的 API key，請重新複製");
      return;
    }
    try {
      setStoredKey(key);
      setValue("");
      onDone();
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4 p-6">
      <div>
        <h2 className="text-lg font-semibold">你的 Anthropic API key</h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          AI 費用由你自己的 Anthropic 帳號支付。金鑰只存在這台裝置的瀏覽器裡，每次使用時一起送出，伺服器不會保存。換裝置要重新設定。
        </p>
      </div>
      {stored && <p className="text-sm text-stone-600">目前已設定：結尾 …{stored.slice(-4)}</p>}
      <input
        className={inputClass}
        type="password"
        autoComplete="off"
        aria-label="Anthropic API key"
        placeholder="貼上你的 API key"
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <p className="text-xs text-stone-500">
        到 console.anthropic.com 的 API Keys 頁面建立。
      </p>
      <ErrorNote message={error} />
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={primaryButton} disabled={!value.trim()}>
          儲存
        </button>
        {stored && (
          <button
            type="button"
            onClick={() => {
              setStoredKey("");
              onDone();
            }}
            className="text-sm text-stone-500 hover:text-red-600"
          >
            移除金鑰
          </button>
        )}
        <button type="button" onClick={onDone} className="ml-auto text-sm text-stone-500 hover:text-stone-900">
          取消
        </button>
      </div>
    </form>
  );
}
