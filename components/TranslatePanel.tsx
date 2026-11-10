"use client";

import { useState, type FormEvent } from "react";
import { postJson } from "@/lib/client";
import { DEFAULT_STYLE, ROLES, type Style } from "@/lib/options";
import type { SourceSummary, Translation } from "@/lib/types";
import {
  BetterAnswer,
  BridgePanes,
  ErrorNote,
  inputClass,
  primaryButton,
  RoleInput,
  SaveNoteButton,
  SourceChecklist,
  TermChips,
  StylePicker,
} from "./shared";

const DIRECTIONS = [
  { id: "to-professional", label: "口語 → 專業", placeholder: "例如：我就是把回應弄快一點，大家用起來比較順" },
  { id: "to-plain", label: "專業 → 口語", placeholder: "例如：透過 semantic caching 降低 p95 latency" },
] as const;

type Direction = (typeof DIRECTIONS)[number]["id"];

export function TranslatePanel({ sources }: { sources: SourceSummary[] }) {
  const [direction, setDirection] = useState<Direction>("to-professional");
  const [text, setText] = useState("");
  const [style, setStyle] = useState<Style>(DEFAULT_STYLE);
  const [targetRole, setTargetRole] = useState<string>(ROLES[0]);
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [result, setResult] = useState<Translation | null>(null);
  const [resultMeta, setResultMeta] = useState({ title: "", targetRole: "", key: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const resultTerms = result?.terms.map((item) => item.term) ?? [];
  const termMeta = { style, targetRole: resultMeta.targetRole };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await postJson<{ translation: Translation }>("/api/translate", {
        text,
        direction,
        targetRole,
        style,
        sourceIds,
      });
      setResult(data.translation);
      // 記下這次翻譯的原文，之後改輸入框也不會影響要存的筆記標題；key 讓新結果可以再存一次。
      setResultMeta((meta) => ({ title: text.trim().slice(0, 60), targetRole, key: meta.key + 1 }));
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-lg bg-stone-100 p-1">
            {DIRECTIONS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setDirection(item.id)}
                className={`rounded-md px-3 py-1 text-sm ${direction === item.id ? "bg-white font-medium shadow-sm" : "text-stone-600"}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <StylePicker value={style} onChange={setStyle} />
        </div>

        <textarea
          className={`${inputClass} min-h-28`}
          aria-label="要翻譯的內容"
          placeholder={DIRECTIONS.find((item) => item.id === direction)?.placeholder}
          value={text}
          maxLength={8000}
          onChange={(event) => setText(event.target.value)}
        />

        <div className="grid gap-3 md:grid-cols-2">
          <RoleInput value={targetRole} onChange={setTargetRole} />
          {sources.length > 0 && (
            <div className="text-sm text-stone-600">
              參考我的資料（選填，勾選後改寫會貼近你的真實經歷）
              <div className="mt-1 rounded-lg border border-stone-200">
                <SourceChecklist sources={sources} selected={sourceIds} onChange={setSourceIds} />
              </div>
            </div>
          )}
        </div>

        <ErrorNote message={error} />
        <button type="submit" className={primaryButton} disabled={busy || !text.trim() || !targetRole.trim()}>
          {busy ? "翻譯中，約需數十秒…" : "翻譯"}
        </button>
      </form>

      {result && (
        <div className="space-y-3">
          <BridgePanes plain={result.plain} professional={result.professional} terms={resultTerms} meta={termMeta} />
          <BetterAnswer text={result.betterAnswer} terms={resultTerms} meta={termMeta} />
          <TermChips terms={result.terms} meta={termMeta} context={result.professional} />
          <SaveNoteButton
            key={resultMeta.key}
            note={{
              title: resultMeta.title,
              kind: "translation",
              plain: result.plain,
              professional: result.professional,
              betterAnswer: result.betterAnswer,
              targetRole: resultMeta.targetRole,
            }}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <NoteList title="改了什麼、為什麼" items={result.changes} />
            <NoteList title="你還需要補的事實" items={result.missingFacts} />
          </div>
        </div>
      )}
    </div>
  );
}

function NoteList({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <h3 className="mb-2 text-xs font-semibold text-stone-500">{title}</h3>
      <ul className="list-disc space-y-1 pl-4 text-sm leading-relaxed">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
