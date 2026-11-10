"use client";

import { useState, type FormEvent } from "react";
import { request } from "@/lib/client";
import { CATEGORIES, type CategoryId } from "@/lib/options";
import type { SourceSummary } from "@/lib/types";
import { ErrorNote, inputClass, primaryButton } from "./shared";

const MODES = [
  { id: "url", label: "網址" },
  { id: "file", label: "檔案" },
  { id: "text", label: "貼上文字" },
] as const;

type Mode = (typeof MODES)[number]["id"];

export function SourcesPanel({
  sources,
  onChange,
}: {
  sources: SourceSummary[];
  onChange: () => Promise<void>;
}) {
  const [mode, setMode] = useState<Mode>("url");
  const [category, setCategory] = useState<CategoryId>("resume");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const ready = mode === "url" ? url.trim() : mode === "file" ? file : text.trim();

  async function submit(event: FormEvent) {
    event.preventDefault();
    const form = new FormData();
    form.set("category", category);
    form.set("title", title);
    if (mode === "url") form.set("url", url);
    if (mode === "text") form.set("text", text);
    if (mode === "file" && file) form.set("file", file);

    setBusy(true);
    setError("");
    try {
      await request("/api/sources", { method: "POST", body: form });
      setTitle("");
      setUrl("");
      setText("");
      setFile(null);
      setFileKey((key) => key + 1);
      await onChange();
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(source: SourceSummary) {
    if (!window.confirm(`確定刪除「${source.title}」？`)) return;
    setError("");
    try {
      await request(`/api/sources/${source.id}`, { method: "DELETE" });
      await onChange();
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <h2 className="font-semibold">新增資料</h2>
        <div className="flex gap-1 rounded-lg bg-stone-100 p-1">
          {MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setMode(item.id)}
              className={`flex-1 rounded-md py-1 text-sm ${mode === item.id ? "bg-white font-medium shadow-sm" : "text-stone-600"}`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {mode === "url" && (
          <input
            className={inputClass}
            type="url"
            placeholder="https://github.com/你的專案"
            aria-label="網址"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        )}
        {mode === "file" && (
          <input
            key={fileKey}
            className={inputClass}
            type="file"
            aria-label="檔案"
            accept=".pdf,.docx,.txt,.md,.markdown,.csv,.json"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        )}
        {mode === "text" && (
          <textarea
            className={`${inputClass} min-h-32`}
            placeholder="貼上履歷、專案說明或筆記"
            aria-label="文字內容"
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        )}

        <div className="grid grid-cols-2 gap-2">
          <select
            className={inputClass}
            aria-label="分類"
            value={category}
            onChange={(event) => setCategory(event.target.value as CategoryId)}
          >
            {CATEGORIES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            className={inputClass}
            placeholder="標題（選填）"
            aria-label="標題"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <ErrorNote message={error} />
        <button type="submit" className={`${primaryButton} w-full`} disabled={busy || !ready}>
          {busy ? "處理中…" : "存進資料庫"}
        </button>
      </form>

      <section>
        <h2 className="mb-3 font-semibold">已存的資料（{sources.length}）</h2>
        {sources.length === 0 ? (
          <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
            先放進你的履歷和做過的專案，教練才知道要教你什麼。
          </p>
        ) : (
          <ul className="space-y-2">
            {sources.map((source) => (
              <li key={source.id} className="rounded-xl border border-stone-200 bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{source.title}</p>
                    <p className="mt-0.5 truncate text-xs text-stone-500">
                      {CATEGORIES.find((item) => item.id === source.category)?.label} ·{" "}
                      {source.charCount.toLocaleString()} 字 · {source.origin}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => remove(source)}
                    className="shrink-0 text-sm text-stone-500 hover:text-red-600"
                  >
                    刪除
                  </button>
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-stone-600">{source.preview}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
