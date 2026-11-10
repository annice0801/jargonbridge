"use client";

import { useMemo, useState, type FormEvent } from "react";
import { BUZZWORD_WARNING, cringeIndex, detectBuzzwords } from "@/lib/buzzwords";
import { postJson } from "@/lib/client";
import { AUDIENCES, DEFAULT_STYLE, ROLES, type AudienceId, type Style } from "@/lib/options";
import type { RadarScores, SourceSummary, Translation } from "@/lib/types";
import { BetterAnswer, BridgePanes, ErrorNote, inputClass, primaryButton, RoleInput, SaveNoteButton, SourceChecklist, StylePicker, TermChips } from "./shared";

type Direction = "to-professional" | "to-plain";

const PLACEHOLDER: Record<Direction, string> = {
  "to-professional": "例如：我們就是把系統弄快一點，客戶用起來比較順，然後想辦法賦能業務",
  "to-plain": "例如：透過 semantic caching 降低 p95 latency，並以 feature flag 灰度發布",
};

export function TranslatePanel({ sources }: { sources: SourceSummary[] }) {
  const [direction, setDirection] = useState<Direction>("to-professional");
  const [audience, setAudience] = useState<AudienceId>("interview");
  const [text, setText] = useState("");
  const [style, setStyle] = useState<Style>(DEFAULT_STYLE);
  const [targetRole, setTargetRole] = useState<string>(ROLES[0]);
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [result, setResult] = useState<Translation | null>(null);
  const [resultMeta, setResultMeta] = useState({ title: "", targetRole: "", key: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 打字當下就在本機比對空洞詞彙，不用等 AI。
  const liveHits = useMemo(() => detectBuzzwords(text), [text]);
  const liveCringe = useMemo(() => cringeIndex(text), [text]);

  const resultTerms = result?.terms.map((item) => item.term) ?? [];
  const termMeta = { style, targetRole: resultMeta.targetRole };
  const toPro = direction === "to-professional";

  async function submit(event?: FormEvent) {
    event?.preventDefault();
    if (busy || !text.trim() || !targetRole.trim()) return;
    setBusy(true);
    setError("");
    try {
      const data = await postJson<{ translation: Translation }>("/api/translate", { text, direction, audience, targetRole, style, sourceIds });
      setResult(data.translation);
      setResultMeta((meta) => ({ title: text.trim().slice(0, 60), targetRole, key: meta.key + 1 }));
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={submit} className="space-y-4 rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">動態語意編譯器</h2>
            <p className="text-xs text-stone-500">Semantic Compiler：同一件事，依對象編譯成對方聽得懂、聽得進去的說法</p>
          </div>
          {/* 雙向切換：開 = 口語編譯成專業，關 = 專業還原成口語 */}
          <button
            type="button"
            role="switch"
            aria-checked={toPro}
            aria-label="切換翻譯方向"
            onClick={() => setDirection(toPro ? "to-plain" : "to-professional")}
            className="flex items-center gap-3 text-sm"
          >
            <span className={toPro ? "text-stone-400" : "font-medium text-stone-900"}>專業 → 口語</span>
            <span className={`relative block h-6 w-11 shrink-0 rounded-full transition-colors ${toPro ? "bg-stone-900" : "bg-stone-300"}`}>
              <span className={`absolute top-0.5 block size-5 rounded-full bg-white shadow transition-[left] ${toPro ? "left-[22px]" : "left-0.5"}`} />
            </span>
            <span className={toPro ? "font-medium text-stone-900" : "text-stone-400"}>口語 → 專業</span>
          </button>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm text-stone-600">溝通對象</legend>
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map((item) => (
              <button
                key={item.id}
                type="button"
                aria-pressed={audience === item.id}
                onClick={() => setAudience(item.id)}
                className={`rounded-full px-3 py-1.5 text-sm transition ${
                  audience === item.id ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div>
          <textarea
            className={`${inputClass} min-h-28`}
            aria-label="要編譯的內容"
            aria-describedby="live-radar"
            placeholder={PLACEHOLDER[direction]}
            value={text}
            maxLength={8000}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
            }}
          />
          <LiveRadar id="live-radar" cringe={liveCringe} hits={liveHits} hasText={!!text.trim()} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <StylePicker value={style} onChange={setStyle} />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
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
        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" className={primaryButton} disabled={busy || !text.trim() || !targetRole.trim()}>
            {busy ? "編譯中，約需數十秒…" : "編譯並評分"}
          </button>
          <span className="hidden text-xs text-stone-500 sm:inline">⌘ / Ctrl + Enter 送出</span>
        </div>
      </form>

      {result && (
        <div className="space-y-3">
          <RadarPanel radar={result.radar} />
          <BridgePanes plain={result.plain} professional={result.professional} terms={resultTerms} meta={termMeta} />
          <BetterAnswer
            label={`更好的回應方式・${AUDIENCES.find((item) => item.id === audience)?.label}`}
            text={result.betterAnswer}
            terms={resultTerms}
            meta={termMeta}
          />
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

// 打字時的即時提醒：本機比對，黃燈代表用了空洞詞彙。
function LiveRadar({ id, cringe, hits, hasText }: { id: string; cringe: number; hits: ReturnType<typeof detectBuzzwords>; hasText: boolean }) {
  if (!hasText) return <p id={id} className="mt-2 text-xs text-stone-500">輸入時會即時檢查行話油膩度。</p>;
  if (hits.length === 0) {
    return (
      <p id={id} className="mt-2 flex items-center gap-2 text-xs text-emerald-700">
        <span aria-hidden className="size-2 rounded-full bg-emerald-500" />
        即時檢查：沒有發現空洞詞彙
      </p>
    );
  }
  return (
    <div id={id} role="status" className="mt-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
      <p className="flex items-center gap-2 font-medium">
        <span aria-hidden className="size-2.5 rounded-full bg-amber-400 shadow-[0_0_0_3px_rgb(251_191_36/0.3)]" />
        黃燈・行話油膩指數 {cringe}%：{BUZZWORD_WARNING}
      </p>
      <ul className="mt-2 space-y-1 text-xs leading-relaxed">
        {hits.map((hit) => (
          <li key={hit.word}>
            <strong>「{hit.word}」</strong>
            {hit.count > 1 && ` ×${hit.count}`} → {hit.instead}
          </li>
        ))}
      </ul>
    </div>
  );
}

const METRICS: { key: keyof RadarScores; label: string; hint: string; lowerIsBetter?: boolean }[] = [
  { key: "professionalism", label: "專業度指數", hint: "Professionalism" },
  { key: "businessImpact", label: "商業聚焦度", hint: "Business Impact / ROI" },
  { key: "cringe", label: "行話油膩・踩雷指數", hint: "Cringe / Bullshit Detector", lowerIsBetter: true },
];

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

function RadarPanel({ radar }: { radar: Translation["radar"] }) {
  const warn = clamp(radar.input.cringe) >= 30 || radar.flags.length > 0;
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">評分與風險分析・Risk &amp; Tone Radar</h3>
        <p className="text-xs text-stone-500">原句 → 改寫後</p>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        {METRICS.map((metric) => {
          const before = clamp(radar.input[metric.key]);
          const after = clamp(radar.output[metric.key]);
          const bad = metric.lowerIsBetter ? after >= 30 : after < 60;
          return (
            <div key={metric.key} className="rounded-lg bg-stone-50 p-3">
              <p className="text-xs text-stone-500">{metric.hint}</p>
              <p className="text-sm font-medium">{metric.label}</p>
              <p className="mt-1 flex items-baseline gap-2 tabular-nums">
                <span className="text-sm text-stone-400 line-through decoration-stone-300">{before}%</span>
                <span className={`text-2xl font-semibold ${bad ? "text-amber-600" : metric.lowerIsBetter ? "text-emerald-700" : "text-stone-900"}`}>{after}%</span>
              </p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-stone-200" aria-hidden>
                <div
                  className={`h-full rounded-full ${metric.lowerIsBetter ? (after >= 30 ? "bg-amber-400" : "bg-emerald-500") : "bg-stone-800"}`}
                  style={{ width: `${after}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      {radar.verdict && <p className="mt-3 text-sm leading-relaxed text-stone-700">{radar.verdict}</p>}
      {warn && radar.flags.length > 0 && (
        <div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-amber-950">
            <span aria-hidden className="size-2.5 rounded-full bg-amber-400" />
            踩雷警示
          </p>
          <ul className="mt-2 space-y-2 text-sm leading-relaxed text-amber-950">
            {radar.flags.map((flag) => (
              <li key={flag.phrase}>
                <strong>「{flag.phrase}」</strong>：{flag.reason}
                <span className="block text-emerald-800">改成：{flag.replacement}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
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
