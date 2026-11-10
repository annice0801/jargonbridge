"use client";

import { useEffect, useState, type FormEvent } from "react";
import { postJson, request } from "@/lib/client";
import { specToMarkdown } from "@/lib/specs";
import type { SpecRecord } from "@/lib/types";
import { ErrorNote, inputClass, primaryButton } from "./shared";

const READERS = ["工程團隊", "QA 團隊", "設計師", "外包廠商"];

const PRIORITY_STYLE: Record<string, string> = {
  Must: "bg-rose-100 text-rose-800",
  Should: "bg-amber-100 text-amber-800",
  Could: "bg-sky-100 text-sky-800",
  "Won't": "bg-stone-200 text-stone-600",
};

const IMPACT = { high: { label: "高", className: "bg-rose-100 text-rose-800" }, medium: { label: "中", className: "bg-amber-100 text-amber-800" }, low: { label: "低", className: "bg-stone-200 text-stone-700" } };

export function SpecPanel() {
  const [records, setRecords] = useState<SpecRecord[]>([]);
  const [openId, setOpenId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    request<{ specs: SpecRecord[] }>("/api/specs")
      .then((data) => {
        if (!active) return;
        // 列表載入前就可能已經產生了新規格，合併而不是覆蓋，也不改掉使用者正在看的那份。
        setRecords((items) => [...items, ...data.specs.filter((spec) => !items.some((item) => item.id === spec.id))]);
        setOpenId((current) => current || (data.specs[0]?.id ?? ""));
      })
      .catch((caught: Error) => {
        if (active) setError(caught.message);
      });
    return () => {
      active = false;
    };
  }, []);

  async function remove(record: SpecRecord) {
    if (!window.confirm(`確定刪除「${record.title}」？`)) return;
    try {
      await request(`/api/specs/${record.id}`, { method: "DELETE" });
      setRecords((items) => items.filter((item) => item.id !== record.id));
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  const open = records.find((item) => item.id === openId);

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="space-y-3">
        <button type="button" className={`${primaryButton} w-full`} onClick={() => setOpenId("")}>
          新的需求轉規格
        </button>
        {records.length > 0 && (
          <ul className="space-y-1">
            {records.map((record) => (
              <li key={record.id}>
                <button
                  type="button"
                  aria-current={record.id === openId ? "true" : undefined}
                  onClick={() => setOpenId(record.id)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm ${record.id === openId ? "bg-white shadow-sm ring-1 ring-stone-200" : "hover:bg-stone-100"}`}
                >
                  <span className="block truncate font-medium">{record.title}</span>
                  <span className="text-xs text-stone-500">
                    {record.spec.userStories.length} 則 User Story · {new Date(record.createdAt).toLocaleDateString("zh-TW")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <div className="min-w-0 space-y-4">
        <ErrorNote message={error} />
        {open ? (
          <SpecView record={open} onRemove={() => remove(open)} />
        ) : (
          <SpecForm
            onCreated={(record) => {
              setRecords((items) => [record, ...items]);
              setOpenId(record.id);
            }}
          />
        )}
      </div>
    </div>
  );
}

function SpecForm({ onCreated }: { onCreated: (record: SpecRecord) => void }) {
  const [input, setInput] = useState("");
  const [audience, setAudience] = useState(READERS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await postJson<{ spec: SpecRecord }>("/api/specs", { input, audience });
      onCreated(data.spec);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <h2 className="font-semibold">一鍵轉成標準 PRD / Jira Ticket</h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          貼上一段混亂的客戶對話、會議紀錄或業務的需求描述，自動整理成 User Story、驗收標準（Acceptance Criteria）、完成定義（DoD）和技術風險提示。對話裡沒講清楚的地方，會列成開工前要確認的問題，不會替客戶編規格。
        </p>
      </div>
      <textarea
        className={`${inputClass} min-h-52`}
        aria-label="客戶對話或需求描述"
        placeholder={"例如：\n客戶：你們的後台每次匯出報表都要等很久，月底對帳的時候大家都在等，能不能快一點？還有我們老闆想直接在手機上看業績。\n業務：了解，那報表要加什麼欄位嗎？\n客戶：要能看到每個門市的退貨，然後最好可以自動寄給各區主管。"}
        value={input}
        maxLength={12000}
        onChange={(event) => setInput(event.target.value)}
      />
      <label className="flex flex-wrap items-center gap-2 text-sm text-stone-600">
        規格的讀者
        <select className="rounded-md border border-stone-300 bg-white px-2 py-1 text-sm text-stone-900" value={audience} onChange={(event) => setAudience(event.target.value)}>
          {READERS.map((reader) => (
            <option key={reader}>{reader}</option>
          ))}
        </select>
      </label>
      <ErrorNote message={error} />
      <button type="submit" className={`${primaryButton} w-full sm:w-auto`} disabled={busy || input.trim().length < 10}>
        {busy ? "整理規格中，大約一分鐘…" : "轉成工程規格書"}
      </button>
    </form>
  );
}

function SpecView({ record, onRemove }: { record: SpecRecord; onRemove: () => void }) {
  const { spec } = record;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(specToMarkdown(spec));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.alert("瀏覽器不允許複製，請改用下載");
    }
  }

  function download() {
    const blob = new Blob([specToMarkdown(spec)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${spec.title}.md`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <article className="space-y-4">
      <header className="rounded-xl border border-stone-200 bg-white p-5">
        <p className="text-xs font-semibold tracking-wide text-indigo-700">EPIC · 給{record.audience}</p>
        <h2 className="mt-1 text-xl font-semibold">{spec.title}</h2>
        <p className="mt-2 leading-relaxed text-stone-700">{spec.summary}</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" className={primaryButton} onClick={copy}>
            {copied ? "已複製" : "複製為 Jira / Markdown"}
          </button>
          <button type="button" onClick={download} className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium hover:bg-stone-100">
            下載 .md
          </button>
          <button type="button" onClick={onRemove} className="ml-auto text-sm text-stone-500 hover:text-red-600">
            刪除
          </button>
        </div>
      </header>

      <Section title="背景與客戶痛點">
        <p className="whitespace-pre-wrap leading-relaxed">{spec.background}</p>
      </Section>

      <Section title={`User Stories（${spec.userStories.length}）`}>
        <ol className="space-y-4">
          {spec.userStories.map((story, index) => (
            <li key={index} className="rounded-lg border border-stone-200 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-stone-500">STORY {index + 1}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLE[story.priority]}`}>{story.priority}</span>
              </div>
              <p className="mt-2 leading-relaxed">
                身為 <strong>{story.role}</strong>，我想要 <strong>{story.goal}</strong>，以便 <strong>{story.benefit}</strong>。
              </p>
              <p className="mt-3 text-xs font-semibold text-stone-500">驗收標準</p>
              <ul className="mt-1 space-y-1.5 text-sm leading-relaxed">
                {story.acceptanceCriteria.map((item, itemIndex) => (
                  <li key={itemIndex} className="flex gap-2">
                    <span aria-hidden className="mt-0.5 size-4 shrink-0 rounded border border-stone-300" />
                    <span>
                      <b className="text-indigo-800">Given</b> {item.given}，<b className="text-indigo-800">When</b> {item.when}，<b className="text-indigo-800">Then</b> {item.then}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <ListSection title="完成定義（Definition of Done）" items={spec.definitionOfDone} />
        <ListSection title="非功能需求" items={spec.nonFunctional} />
      </div>

      <Section title="技術風險提示">
        {spec.technicalRisks.length === 0 ? (
          <p className="text-sm text-stone-500">沒有特別的技術風險。</p>
        ) : (
          <ul className="space-y-3">
            {spec.technicalRisks.map((item, index) => (
              <li key={index} className="flex gap-3 text-sm leading-relaxed">
                <span className={`h-fit shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${IMPACT[item.impact].className}`}>影響{IMPACT[item.impact].label}</span>
                <span>
                  {item.risk}
                  <span className="block text-emerald-800">降低風險：{item.mitigation}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <ListSection title="這次不做（Out of Scope）" items={spec.outOfScope} />
        <ListSection title="開工前要確認的問題" items={spec.openQuestions} tone="amber" />
      </div>

      <details className="rounded-xl border border-stone-200 bg-white p-4 text-sm">
        <summary className="cursor-pointer text-stone-600">原始客戶對話</summary>
        <p className="mt-3 whitespace-pre-wrap leading-relaxed text-stone-700">{record.input}</p>
      </details>
    </article>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5">
      <h3 className="mb-3 text-sm font-semibold text-stone-600">{title}</h3>
      {children}
    </section>
  );
}

function ListSection({ title, items, tone }: { title: string; items: string[]; tone?: "amber" }) {
  return (
    <section className={`rounded-xl border p-5 ${tone === "amber" ? "border-amber-200 bg-amber-50" : "border-stone-200 bg-white"}`}>
      <h3 className="mb-3 text-sm font-semibold text-stone-600">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-stone-500">無</p>
      ) : (
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed">
          {items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      )}
    </section>
  );
}
