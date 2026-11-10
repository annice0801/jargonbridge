"use client";

import { useState } from "react";
import { postJson } from "@/lib/client";
import { LEVELS, ROLES, TONES, type Style } from "@/lib/options";
import type { NoteKind, SourceSummary, TermDiagram, TermHint } from "@/lib/types";
import { useTermOpener, type TermMeta } from "./term-context";
import { TermText } from "./TermText";

export const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-stone-500 focus:ring-2 focus:ring-stone-200";

export const primaryButton =
  "rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:cursor-not-allowed disabled:opacity-40";

export function ErrorNote({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </p>
  );
}

export function StylePicker({ value, onChange }: { value: Style; onChange: (style: Style) => void }) {
  return (
    <div className="flex flex-wrap gap-3">
      <label className="flex items-center gap-2 text-sm text-stone-600">
        白話程度
        <select
          className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm text-stone-900"
          value={value.level}
          onChange={(event) => onChange({ ...value, level: event.target.value as Style["level"] })}
        >
          {LEVELS.map((level) => (
            <option key={level.id} value={level.id}>
              {level.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm text-stone-600">
        模式
        <select
          className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm text-stone-900"
          value={value.tone}
          onChange={(event) => onChange({ ...value, tone: event.target.value as Style["tone"] })}
        >
          {TONES.map((tone) => (
            <option key={tone.id} value={tone.id}>
              {tone.label}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function RoleInput({ value, onChange }: { value: string; onChange: (role: string) => void }) {
  return (
    <label className="block text-sm text-stone-600">
      目標職位
      <input
        className={`${inputClass} mt-1 text-stone-900`}
        list="role-options"
        value={value}
        maxLength={60}
        onChange={(event) => onChange(event.target.value)}
      />
      <datalist id="role-options">
        {ROLES.map((role) => (
          <option key={role} value={role} />
        ))}
      </datalist>
    </label>
  );
}

export function SourceChecklist({
  sources,
  selected,
  onChange,
}: {
  sources: SourceSummary[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  return (
    <ul className="max-h-48 space-y-1 overflow-y-auto">
      {sources.map((source) => (
        <li key={source.id}>
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-stone-100">
            <input
              type="checkbox"
              checked={selected.includes(source.id)}
              onChange={(event) =>
                onChange(
                  event.target.checked
                    ? [...selected, source.id]
                    : selected.filter((id) => id !== source.id),
                )
              }
            />
            <span className="min-w-0 truncate">{source.title}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

// 核心畫面：左邊大白話、右邊大廠術語。
export function BridgePanes({
  plain,
  professional,
  terms = [],
  meta,
}: {
  plain: string;
  professional: string;
  terms?: string[];
  meta?: TermMeta;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <section className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <h3 className="mb-2 text-xs font-semibold text-amber-800">大白話</h3>
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{plain}</p>
      </section>
      <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <h3 className="mb-2 text-xs font-semibold text-indigo-800">大廠術語</h3>
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
          <TermText text={professional} terms={terms} meta={meta} />
        </p>
      </section>
    </div>
  );
}

export function SaveNoteButton({
  note,
}: {
  note: {
    title: string;
    kind: NoteKind;
    plain: string;
    professional: string;
    betterAnswer: string;
    targetRole: string;
    sourceRef?: string;
    diagram?: TermDiagram;
  };
}) {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState("");

  async function save() {
    setState("saving");
    setError("");
    try {
      await postJson("/api/notes", note);
      setState("saved");
    } catch (caught) {
      setError((caught as Error).message);
      setState("idle");
    }
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={save}
        disabled={state !== "idle"}
        className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-stone-100 disabled:cursor-default disabled:text-stone-500 disabled:hover:bg-white"
      >
        {state === "saved" ? "已存到筆記" : state === "saving" ? "儲存中…" : "存成筆記"}
      </button>
      {error && (
        <span role="alert" className="text-sm text-red-700">
          {error}
        </span>
      )}
    </span>
  );
}

export function TermChips({ terms, meta, context }: { terms: TermHint[]; meta: TermMeta; context: string }) {
  const open = useTermOpener();
  if (terms.length === 0) return null;
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <h3 className="mb-2 text-xs font-semibold text-rose-800">注意：必知詞彙（不懂就按一下）</h3>
      <ul className="grid gap-1 sm:grid-cols-2">
        {terms.map((item) => (
          <li key={item.term}>
            <button
              type="button"
              onClick={() => open({ term: item.term, context, ...meta })}
              className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-stone-100"
            >
              <span className="block text-sm font-medium underline decoration-dotted underline-offset-4">{item.term}</span>
              <span className="block text-xs leading-relaxed text-stone-600">{item.meaning}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function BetterAnswer({
  text,
  label = "更好的回應方式",
  terms = [],
  meta,
}: {
  text: string;
  label?: string;
  terms?: string[];
  meta?: TermMeta;
}) {
  if (!text) return null;
  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <h3 className="mb-2 text-xs font-semibold text-emerald-800">{label}</h3>
      <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
        <TermText text={text} terms={terms} meta={meta} />
      </p>
    </section>
  );
}
