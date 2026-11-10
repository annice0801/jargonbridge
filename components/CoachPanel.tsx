"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { postJson, request } from "@/lib/client";
import { DEFAULT_STYLE, ROLES, TECHNIQUES, type Style } from "@/lib/options";
import { REQUIRED_PASSES } from "@/lib/progress";
import type { CoachTurn, Concept, SourceSummary, Track, TrackMessage, TrackSummary } from "@/lib/types";
import {
  BetterAnswer,
  BridgePanes,
  ErrorNote,
  inputClass,
  primaryButton,
  RoleInput,
  SaveNoteButton,
  SourceChecklist,
  StylePicker,
  TermChips,
} from "./shared";

export function CoachPanel({
  sources,
  onGoToSources,
  focus,
}: {
  sources: SourceSummary[];
  onGoToSources: () => void;
  // 從知識卡交過來的學習路徑，打開它。
  focus?: { id: string; nonce: number } | null;
}) {
  const [summaries, setSummaries] = useState<TrackSummary[]>([]);
  const [track, setTrack] = useState<Track | null>(null);
  const [creating, setCreating] = useState(false);
  const [reviewId, setReviewId] = useState("");
  const [error, setError] = useState("");

  async function refreshList() {
    const data = await request<{ tracks: TrackSummary[] }>("/api/tracks");
    setSummaries(data.tracks);
  }

  useEffect(() => {
    let active = true;
    request<{ tracks: TrackSummary[] }>("/api/tracks")
      .then((data) => {
        if (active) setSummaries(data.tracks);
      })
      .catch((caught: Error) => {
        if (active) setError(caught.message);
      });
    return () => {
      active = false;
    };
  }, []);

  async function open(id: string) {
    setError("");
    try {
      const data = await request<{ track: Track }>(`/api/tracks/${id}`);
      setTrack(data.track);
      setCreating(false);
      setReviewId("");
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  async function remove(summary: TrackSummary) {
    if (!window.confirm(`確定刪除「${summary.title}」和它的對話紀錄？`)) return;
    setError("");
    try {
      await request(`/api/tracks/${summary.id}`, { method: "DELETE" });
      if (track?.id === summary.id) setTrack(null);
      await refreshList();
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  useEffect(() => {
    if (!focus) return;
    let active = true;
    Promise.all([
      request<{ track: Track }>(`/api/tracks/${focus.id}`),
      request<{ tracks: TrackSummary[] }>("/api/tracks"),
    ])
      .then(([opened, list]) => {
        if (!active) return;
        setTrack(opened.track);
        setSummaries(list.tracks);
        setCreating(false);
        setReviewId("");
      })
      .catch((caught: Error) => {
        if (active) setError(caught.message);
      });
    return () => {
      active = false;
    };
  }, [focus]);

  const showForm = creating || (!track && summaries.length === 0);
  const reviewConcept = track?.concepts.find((concept) => concept.id === reviewId);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-4">
        <button type="button" className={`${primaryButton} w-full`} onClick={() => setCreating(true)}>
          新增學習路徑
        </button>
        {summaries.length > 0 && (
          <ul className="space-y-1">
            {summaries.map((summary) => (
              <li key={summary.id} className="group flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => open(summary.id)}
                  className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm hover:bg-stone-100 ${
                    track?.id === summary.id ? "bg-stone-200/70" : ""
                  }`}
                >
                  <span className="block truncate font-medium">{summary.title}</span>
                  <span className="text-xs text-stone-500">
                    {summary.targetRole} · {summary.masteredCount}/{summary.conceptCount}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`刪除 ${summary.title}`}
                  onClick={() => remove(summary)}
                  className="px-1 text-sm text-stone-400 hover:text-red-600"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        {track && !showForm && (
          <>
            <ConceptList
              track={track}
              reviewId={reviewId}
              onSelect={(concept) => setReviewId(concept.id === track.concepts[track.currentIndex]?.id ? "" : concept.id)}
            />
            <p className="text-sm text-stone-600">
              下載學習紀錄：
              <a href={`/api/tracks/${track.id}/export?format=pdf`} className="underline hover:text-stone-900">
                PDF
              </a>
              {" · "}
              <a href={`/api/tracks/${track.id}/export`} className="underline hover:text-stone-900">
                Markdown
              </a>
            </p>
          </>
        )}
      </aside>

      <main className="min-w-0 space-y-4">
        <ErrorNote message={error} />
        {showForm ? (
          <NewTrackForm
            sources={sources}
            onGoToSources={onGoToSources}
            onCreated={async (created) => {
              setTrack(created);
              setCreating(false);
              setReviewId("");
              await refreshList();
            }}
          />
        ) : track ? (
          <>
            {reviewConcept && <ConceptReview track={track} concept={reviewConcept} onBack={() => setReviewId("")} />}
            {/* 翻看舊概念時只隱藏，寫到一半的回答才不會消失 */}
            <div hidden={Boolean(reviewConcept)}>
              <Session
                key={track.id}
                track={track}
                onUpdate={async (updated) => {
                  setTrack(updated);
                  await refreshList();
                }}
              />
            </div>
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
            從左邊選一條學習路徑繼續。
          </p>
        )}
      </main>
    </div>
  );
}

function ConceptList({
  track,
  reviewId,
  onSelect,
}: {
  track: Track;
  reviewId: string;
  onSelect: (concept: Concept) => void;
}) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold text-stone-500">核心概念</h2>
      <ol className="space-y-0.5 text-sm">
        {track.concepts.map((concept, index) => {
          const isCurrent = index === track.currentIndex;
          const content = (
            <>
              <span className="w-4 shrink-0 text-center">
                {concept.status === "mastered" ? "✓" : isCurrent ? "▸" : index + 1}
              </span>
              <span>{concept.title}</span>
            </>
          );
          return (
            <li key={concept.id} aria-current={isCurrent ? "step" : undefined}>
              {concept.status === "mastered" || isCurrent ? (
                <button
                  type="button"
                  onClick={() => onSelect(concept)}
                  className={`flex w-full gap-2 rounded-md px-1 py-1 text-left hover:bg-stone-100 ${
                    reviewId === concept.id ? "bg-stone-200/70" : ""
                  } ${isCurrent ? "font-medium" : "text-stone-600"}`}
                >
                  {content}
                </button>
              ) : (
                <div className="flex gap-2 px-1 py-1 text-stone-400">{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function ConceptReview({ track, concept, onBack }: { track: Track; concept: Concept; onBack: () => void }) {
  const messages = track.messages.filter((message) => message.conceptId === concept.id);
  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} className="text-sm text-stone-600 hover:text-stone-900">
        ← 回到目前的概念
      </button>
      <div className="rounded-xl border border-stone-200 bg-white p-4">
        <p className="text-xs text-stone-500">翻看紀錄 · 已掌握</p>
        <h2 className="mt-1 font-semibold">{concept.title}</h2>
        <p className="mt-1 text-sm text-stone-600">{concept.why}</p>
      </div>
      <MessageList track={track} concept={concept} messages={messages} style={track.style} />
    </div>
  );
}

function MessageList({
  track,
  concept,
  messages,
  style,
}: {
  track: Track;
  concept: Concept;
  messages: TrackMessage[];
  style: Style;
}) {
  return messages.map((message) =>
    message.role === "user" ? (
      <div key={message.id} className="ml-auto max-w-[85%] rounded-xl bg-stone-800 px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap text-white">
        {message.text}
      </div>
    ) : (
      <CoachCard key={message.id} turn={message.turn} messageId={message.id} conceptTitle={concept.title} targetRole={track.targetRole} style={style} />
    ),
  );
}

function NewTrackForm({
  sources,
  onGoToSources,
  onCreated,
}: {
  sources: SourceSummary[];
  onGoToSources: () => void;
  onCreated: (track: Track) => Promise<void>;
}) {
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [targetRole, setTargetRole] = useState<string>(ROLES[0]);
  const [style, setStyle] = useState<Style>(DEFAULT_STYLE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (sources.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center">
        <p className="text-sm text-stone-600">還沒有資料。先放進履歷和專案，教練才能整理出要學的概念。</p>
        <button type="button" className={`${primaryButton} mt-4`} onClick={onGoToSources}>
          去新增資料
        </button>
      </div>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await postJson<{ track: Track }>("/api/tracks", { sourceIds, targetRole, style });
      await onCreated(data.track);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <h2 className="font-semibold">新增學習路徑</h2>
      <p className="text-sm text-stone-600">專有名詞還不熟的話，建議先到「知識卡」把詞彙學起來，問答會順很多。</p>
      <div className="text-sm text-stone-600">
        要用哪些資料
        <div className="mt-1 rounded-lg border border-stone-200 p-1">
          <SourceChecklist sources={sources} selected={sourceIds} onChange={setSourceIds} />
        </div>
      </div>
      <RoleInput value={targetRole} onChange={setTargetRole} />
      <StylePicker value={style} onChange={setStyle} />
      <ErrorNote message={error} />
      <button type="submit" className={primaryButton} disabled={busy || sourceIds.length === 0 || !targetRole.trim()}>
        {busy ? "整理核心概念中，可能需要一兩分鐘…" : "整理核心概念"}
      </button>
    </form>
  );
}

function Session({ track, onUpdate }: { track: Track; onUpdate: (track: Track) => Promise<void> }) {
  const [style, setStyle] = useState<Style>(track.style);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const concept = track.concepts[track.currentIndex];
  const messages = concept ? track.messages.filter((message) => message.conceptId === concept.id) : [];
  const justMastered = track.currentIndex > 0 ? track.concepts[track.currentIndex - 1] : undefined;
  const previousMessages = justMastered
    ? track.messages.filter((message) => message.conceptId === justMastered.id)
    : [];
  const lastPrevious = previousMessages.at(-1);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [track.messages.length]);

  async function send(body: { action: "start" } | { action: "answer"; message: string }) {
    setBusy(true);
    setError("");
    try {
      const data = await postJson<{ track: Track }>(`/api/tracks/${track.id}/turn`, { ...body, style });
      setAnswer("");
      await onUpdate(data.track);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (answer.trim()) send({ action: "answer", message: answer });
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit(event);
  }

  if (!concept) {
    return (
      <div className="space-y-4">
        {lastPrevious?.role === "coach" && justMastered && (
          <CoachCard turn={lastPrevious.turn} messageId={lastPrevious.id} conceptTitle={justMastered.title} targetRole={track.targetRole} style={style} hideQuestion />
        )}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <p className="font-semibold text-emerald-900">這條路徑的 {track.concepts.length} 個概念都掌握了</p>
          <p className="mt-1 text-sm text-emerald-800">可以到「即時翻譯」練習把真實經歷講得更好。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-stone-200 bg-white p-4">
        <div className="min-w-0">
          <p className="text-xs text-stone-500">
            第 {track.currentIndex + 1} / {track.concepts.length} 個概念 · 目標：{track.targetRole} · 用不同方法通過{" "}
            {concept.passedTechniques.length}/{REQUIRED_PASSES} 次
          </p>
          <h2 className="mt-1 font-semibold">{concept.title}</h2>
          <p className="mt-1 text-sm text-stone-600">{concept.why}</p>
        </div>
        <StylePicker value={style} onChange={setStyle} />
      </div>

      {messages.length === 0 && lastPrevious?.role === "coach" && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-emerald-700">上一個概念「{justMastered?.title}」已掌握</p>
          <CoachCard turn={lastPrevious.turn} messageId={lastPrevious.id} conceptTitle={justMastered?.title ?? ""} targetRole={track.targetRole} style={style} hideQuestion />
        </div>
      )}

      <MessageList track={track} concept={concept} messages={messages} style={style} />

      <ErrorNote message={error} />

      {messages.length === 0 ? (
        <button type="button" className={primaryButton} disabled={busy} onClick={() => send({ action: "start" })}>
          {busy ? "教練準備中…" : track.currentIndex === 0 ? "開始學習" : "進入下一個概念"}
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-2">
          <textarea
            className={`${inputClass} min-h-24`}
            aria-label="你的回答"
            placeholder="用你自己的話回答，不懂也可以直接說哪裡不懂"
            value={answer}
            maxLength={8000}
            disabled={busy}
            onChange={(event) => setAnswer(event.target.value)}
            onKeyDown={onKeyDown}
          />
          <button type="submit" className={primaryButton} disabled={busy || !answer.trim()}>
            {busy ? "教練批改中…" : "送出回答（⌘ + Enter）"}
          </button>
        </form>
      )}
      <div ref={endRef} />
    </div>
  );
}

function CoachCard({
  turn,
  messageId,
  conceptTitle,
  targetRole,
  style,
  hideQuestion = false,
}: {
  turn: CoachTurn;
  messageId: string;
  conceptTitle: string;
  targetRole: string;
  style: Style;
  hideQuestion?: boolean;
}) {
  const { assessment } = turn;
  const hints = turn.terms ?? [];
  const termNames = hints.map((item) => item.term);
  const meta = { style, targetRole };
  return (
    <article className="space-y-3">
      {assessment.evaluated && (
        <section
          className={`rounded-xl border p-4 text-sm ${assessment.passed ? "border-emerald-200 bg-white" : "border-orange-200 bg-orange-50"}`}
        >
          <p className="font-semibold">
            {assessment.passed ? "通過" : "還沒通過"} · {assessment.score} 分
          </p>
          {assessment.evidence && <p className="mt-1 text-stone-600">{assessment.evidence}</p>}
          {assessment.gaps.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-4 text-stone-700">
              {assessment.gaps.map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          )}
        </section>
      )}
      <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{turn.coachMessage}</p>
      <BridgePanes plain={turn.plain} professional={turn.professional} terms={termNames} meta={meta} />
      <BetterAnswer text={turn.betterAnswer} label={assessment.evaluated ? "你的回答可以這樣修" : "示範回答"} terms={termNames} meta={meta} />
      <TermChips terms={hints} meta={meta} context={turn.professional} />
      <SaveNoteButton
        note={{
          title: conceptTitle,
          kind: "coach",
          plain: turn.plain,
          professional: turn.professional,
          betterAnswer: turn.betterAnswer,
          targetRole,
          sourceRef: messageId,
        }}
      />
      {!hideQuestion && turn.question && (
        <section className="rounded-xl border-2 border-stone-800 bg-white p-4">
          <h3 className="mb-1 text-xs font-semibold text-stone-500">{TECHNIQUES[turn.technique]}</h3>
          <p className="text-[15px] leading-relaxed font-medium whitespace-pre-wrap">{turn.question}</p>
        </section>
      )}
    </article>
  );
}
