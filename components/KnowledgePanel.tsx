"use client";

import { useEffect, useState, type FormEvent } from "react";
import { postJson, request } from "@/lib/client";
import { deckStats, studyQueue } from "@/lib/deck-utils";
import { DEFAULT_STYLE, ROLES, type Style } from "@/lib/options";
import type { CardStatus, Deck, DeckSummary, KnowledgeCard, KnowledgeChapter, SourceSummary, Track } from "@/lib/types";
import { AnalysisSlides } from "./AnalysisSlides";
import { ErrorNote, primaryButton, RoleInput, SaveNoteButton, SourceChecklist, StylePicker } from "./shared";
import { useTermOpener } from "./term-context";

type Mode = "analysis" | "context" | "flip";

export function KnowledgePanel({
  sources,
  onGoToSources,
  onStartCoach,
  onSourcesChanged,
}: {
  sources: SourceSummary[];
  onGoToSources: () => void;
  onStartCoach: (trackId: string) => void;
  onSourcesChanged: () => Promise<void>;
}) {
  const [summaries, setSummaries] = useState<DeckSummary[]>([]);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function refreshList() {
    const data = await request<{ decks: DeckSummary[] }>("/api/decks");
    setSummaries(data.decks);
  }

  useEffect(() => {
    let active = true;
    request<{ decks: DeckSummary[] }>("/api/decks")
      .then((data) => {
        if (active) setSummaries(data.decks);
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
      const data = await request<{ deck: Deck }>(`/api/decks/${id}`);
      setDeck(data.deck);
      setCreating(false);
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  async function remove(summary: DeckSummary) {
    if (!window.confirm(`確定刪除「${summary.title}」和它的學習進度？`)) return;
    setError("");
    try {
      await request(`/api/decks/${summary.id}`, { method: "DELETE" });
      if (deck?.id === summary.id) setDeck(null);
      await refreshList();
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  const showForm = creating || (!deck && summaries.length === 0);

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[260px_1fr]">
      <aside className="space-y-4">
        <button type="button" className={`${primaryButton} w-full`} onClick={() => setCreating(true)}>
          產生知識卡
        </button>
        {summaries.length > 0 && (
          <ul className="space-y-1">
            {summaries.map((summary) => (
              <li key={summary.id} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => open(summary.id)}
                  className={`min-w-0 flex-1 rounded-lg px-3 py-2 text-left text-sm hover:bg-stone-100 ${
                    deck?.id === summary.id ? "bg-stone-200/70" : ""
                  }`}
                >
                  <span className="block truncate font-medium">{summary.title}</span>
                  <span className="text-xs text-stone-500">
                    {summary.targetRole} · 會了 {summary.knownCount}/{summary.cardCount}
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
      </aside>

      <main className="min-w-0 space-y-4">
        <ErrorNote message={error} />
        {showForm ? (
          <NewDeckForm
            sources={sources}
            onGoToSources={onGoToSources}
            onCreated={async (created) => {
              setDeck(created);
              setCreating(false);
              // 專家解析另存成一筆資料，「我的資料」要一起更新。
              await Promise.all([refreshList(), onSourcesChanged()]);
            }}
          />
        ) : deck ? (
          <DeckView
            key={deck.id}
            deck={deck}
            onStartCoach={onStartCoach}
            onUpdate={(updated) => {
              setDeck(updated);
              setSummaries((items) =>
                items.map((item) =>
                  item.id === updated.id
                    ? { ...item, knownCount: deckStats(updated.chapters, updated.progress).known }
                    : item,
                ),
              );
            }}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">
            從左邊選一副知識卡繼續。
          </p>
        )}
      </main>
    </div>
  );
}

function NewDeckForm({
  sources,
  onGoToSources,
  onCreated,
}: {
  sources: SourceSummary[];
  onGoToSources: () => void;
  onCreated: (deck: Deck) => Promise<void>;
}) {
  const [sourceIds, setSourceIds] = useState<string[]>([]);
  const [targetRole, setTargetRole] = useState<string>(ROLES[0]);
  const [style, setStyle] = useState<Style>(DEFAULT_STYLE);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (sources.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center">
        <p className="text-sm text-stone-600">還沒有資料。先放進履歷、專案或課程內容，才能整理出要先學的專有名詞。</p>
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
      const data = await postJson<{ deck: Deck }>("/api/decks", { sourceIds, targetRole, style });
      await onCreated(data.deck);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-stone-200 bg-white p-5">
      <div>
        <h2 className="font-semibold">產生專家解析與知識卡</h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          勾選履歷、作品集網址或專案資料，由資深專家角度拆解：架構與工法、STAR、PRD 與 Roadmap 的關鍵決策、KPI 與量化成果、RICE／MoSCoW／Kano、CDP／MA／BI 與會員分群，再整理成新手看得懂的簡報和知識卡。之後可以直接交給學習教練，練成你自己的說法。
        </p>
      </div>
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
        {busy ? "專家解析中，大約需要兩到四分鐘…" : "產生專家解析與知識卡"}
      </button>
    </form>
  );
}

function DeckView({
  deck,
  onUpdate,
  onStartCoach,
}: {
  deck: Deck;
  onUpdate: (deck: Deck) => void;
  onStartCoach: (trackId: string) => void;
}) {
  const hasAnalysis = Boolean(deck.analysis?.slides.length);
  const [mode, setMode] = useState<Mode>(hasAnalysis ? "analysis" : "context");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);

  // 用原始資料加上專家解析建立學習路徑，教練就能照這份解析教。
  async function startCoach() {
    setStarting(true);
    setError("");
    try {
      const sourceIds = [...deck.sourceIds, ...(deck.analysisSourceId ? [deck.analysisSourceId] : [])];
      const data = await postJson<{ track: Track }>("/api/tracks", {
        sourceIds,
        targetRole: deck.targetRole,
        style: deck.style,
      });
      onStartCoach(data.track.id);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setStarting(false);
    }
  }
  const stats = deckStats(deck.chapters, deck.progress);

  async function mark(card: KnowledgeCard, status: CardStatus | "new") {
    setError("");
    const previous = deck;
    // 先更新畫面，失敗再還原。
    const progress = { ...deck.progress };
    if (status === "new") delete progress[card.id];
    else progress[card.id] = status;
    onUpdate({ ...deck, progress });
    try {
      const data = await request<{ deck: Deck }>(`/api/decks/${deck.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cardId: card.id, status }),
      });
      onUpdate(data.deck);
    } catch (caught) {
      onUpdate(previous);
      setError((caught as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-stone-500">
              知識卡 · {deck.targetRole} · {deck.chapters.length} 章
            </p>
            <h2 className="mt-1 font-semibold">{deck.title}</h2>
          </div>
          <p className="text-sm text-stone-600">
            {/* 這些是下載 API，不是頁面跳轉，不能用 next/link。 */}
            下載：
            <a href={`/api/decks/${deck.id}/export?format=pdf`} className="underline hover:text-stone-900">
              PDF
            </a>
            {" · "}
            <a href={`/api/decks/${deck.id}/export`} className="underline hover:text-stone-900">
              Markdown
            </a>
          </p>
        </div>
        <div>
          <div className="flex justify-between text-xs text-stone-500">
            <span>已會 {stats.known} / {stats.total} 張</span>

          </div>
          <div
            role="progressbar"
            aria-label="知識卡進度"
            aria-valuemin={0}
            aria-valuemax={stats.total}
            aria-valuenow={stats.known}
            className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-200"
          >
            <div className="h-full bg-emerald-600 transition-all" style={{ width: `${stats.total ? (stats.known / stats.total) * 100 : 0}%` }} />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-lg bg-stone-100 p-1 sm:w-fit">
          {(
            [
              ...(hasAnalysis ? [{ id: "analysis", label: "專家解析" } as const] : []),
              { id: "context", label: "依脈絡學" },
              { id: "flip", label: "翻卡複習" },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={mode === item.id}
              onClick={() => setMode(item.id)}
              className={`flex-1 rounded-md px-3 py-1 text-sm ${mode === item.id ? "bg-white font-medium shadow-sm" : "text-stone-600"}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={startCoach} disabled={starting} className={primaryButton}>
          {starting ? "教練整理學習重點中…" : "交給學習教練練成自己的話"}
        </button>
        </div>
      </div>

      <ErrorNote message={error} />

      {mode === "analysis" ? (
        <AnalysisSlides deck={deck} />
      ) : mode === "context" ? (
        deck.chapters.map((chapter, index) => (
          <ChapterSection key={chapter.id} deck={deck} chapter={chapter} index={index} onMark={mark} />
        ))
      ) : (
        <FlipStudy deck={deck} onMark={mark} />
      )}
    </div>
  );
}

function ChapterSection({
  deck,
  chapter,
  index,
  onMark,
}: {
  deck: Deck;
  chapter: KnowledgeChapter;
  index: number;
  onMark: (card: KnowledgeCard, status: CardStatus | "new") => void;
}) {
  return (
    <section className="space-y-3">
      <div className="rounded-xl border-l-4 border-amber-400 bg-amber-50 p-4">
        <p className="text-xs font-semibold text-amber-800">第 {index + 1} 章 · 脈絡</p>
        <h3 className="mt-1 font-semibold">{chapter.title}</h3>
        <p className="mt-2 text-[15px] leading-relaxed whitespace-pre-wrap">{chapter.story}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {chapter.cards.map((card) => (
          <CardFace key={card.id} deck={deck} card={card} status={deck.progress[card.id]} onMark={onMark} />
        ))}
      </div>
    </section>
  );
}

function CardFace({
  deck,
  card,
  status,
  onMark,
}: {
  deck: Deck;
  card: KnowledgeCard;
  status?: CardStatus;
  onMark: (card: KnowledgeCard, status: CardStatus | "new") => void;
}) {
  const openTerm = useTermOpener();
  const meta = { style: deck.style, targetRole: deck.targetRole };
  return (
    <article
      className={`flex flex-col gap-3 rounded-xl border bg-white p-4 ${
        status === "known" ? "border-emerald-300" : status === "learning" ? "border-orange-300" : "border-stone-200"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-lg font-semibold">{card.term}</h4>
        {status && (
          <span className={`shrink-0 text-xs font-medium ${status === "known" ? "text-emerald-700" : "text-orange-700"}`}>
            {status === "known" ? "會了" : "還不熟"}
          </span>
        )}
      </div>
      <CardBody card={card} />
      {card.related.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-stone-500">相關</span>
          {card.related.map((term) => (
            <button
              key={term}
              type="button"
              onClick={() => openTerm({ term, context: card.term, ...meta })}
              className="rounded-full border border-stone-300 px-2 py-0.5 hover:border-stone-500"
            >
              {term}
            </button>
          ))}
        </div>
      )}
      <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
        <MarkButtons card={card} status={status} onMark={onMark} />
        <button
          type="button"
          onClick={() => openTerm({ term: card.term, context: card.definition, ...meta })}
          className="rounded-lg px-2 py-1.5 text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900"
        >
          看圖解
        </button>
        <CardSaveButton deck={deck} card={card} />
      </div>
    </article>
  );
}

function CardBody({ card }: { card: KnowledgeCard }) {
  return (
    <dl className="space-y-2 text-sm leading-relaxed">
      <div>
        <dt className="text-xs font-semibold text-amber-800">白話</dt>
        <dd>{card.plain}</dd>
      </div>
      <div>
        <dt className="text-xs font-semibold text-emerald-800">舉例</dt>
        <dd>{card.example}</dd>
      </div>
      {card.inContext && (
        <div>
          <dt className="text-xs font-semibold text-stone-500">在你的資料裡</dt>
          <dd>{card.inContext}</dd>
        </div>
      )}
      <div>
        <dt className="text-xs font-semibold text-indigo-800">大廠說法</dt>
        <dd>{card.definition}</dd>
      </div>
    </dl>
  );
}

function MarkButtons({
  card,
  status,
  onMark,
}: {
  card: KnowledgeCard;
  status?: CardStatus;
  onMark: (card: KnowledgeCard, status: CardStatus | "new") => void;
}) {
  const toggle = (next: CardStatus) => onMark(card, status === next ? "new" : next);
  return (
    <>
      <button
        type="button"
        aria-pressed={status === "known"}
        onClick={() => toggle("known")}
        className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
          status === "known" ? "border-emerald-600 bg-emerald-600 text-white" : "border-stone-300 hover:bg-stone-100"
        }`}
      >
        會了
      </button>
      <button
        type="button"
        aria-pressed={status === "learning"}
        onClick={() => toggle("learning")}
        className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
          status === "learning" ? "border-orange-500 bg-orange-500 text-white" : "border-stone-300 hover:bg-stone-100"
        }`}
      >
        還不熟
      </button>
    </>
  );
}

function CardSaveButton({ deck, card }: { deck: Deck; card: KnowledgeCard }) {
  return (
    <SaveNoteButton
      note={{
        title: card.term,
        kind: "term",
        plain: `${card.plain}\n\n舉例：${card.example}`,
        professional: card.inContext ? `${card.definition}\n\n在你的資料裡：${card.inContext}` : card.definition,
        betterAnswer: "",
        targetRole: deck.targetRole,
        sourceRef: `card:${deck.id}:${card.id}`,
      }}
    />
  );
}

function FlipStudy({
  deck,
  onMark,
}: {
  deck: Deck;
  onMark: (card: KnowledgeCard, status: CardStatus | "new") => void;
}) {
  const [onlyUnknown, setOnlyUnknown] = useState(true);
  // 開始複習時固定這一輪的題目順序，標記之後卡片才不會在眼前跳走。
  const [round, setRound] = useState(() => studyQueue(deck.chapters, deck.progress, true).map((item) => item.card.id));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const lookup = new Map(deck.chapters.flatMap((chapter) => chapter.cards.map((card) => [card.id, { card, chapter }] as const)));
  const items = round.map((id) => lookup.get(id)).filter((item) => item !== undefined);
  const current = items[index];

  function restart(nextOnlyUnknown = onlyUnknown) {
    setRound(studyQueue(deck.chapters, deck.progress, nextOnlyUnknown).map((item) => item.card.id));
    setIndex(0);
    setFlipped(false);
  }

  function answer(status: CardStatus) {
    if (!current) return;
    onMark(current.card, status);
    setFlipped(false);
    setIndex((value) => value + 1);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={onlyUnknown}
            onChange={(event) => {
              setOnlyUnknown(event.target.checked);
              restart(event.target.checked);
            }}
          />
          只看還不會的
        </label>
        {items.length > 0 && (
          <span>
            {Math.min(index + 1, items.length)} / {items.length}
          </span>
        )}
      </div>

      {!current ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <p className="font-semibold text-emerald-900">{items.length === 0 ? "這一輪沒有要複習的卡片" : "這一輪複習完了"}</p>
          <button type="button" className={`${primaryButton} mt-4`} onClick={() => restart()}>
            再來一輪
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex min-h-72 flex-col rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
            <p className="text-xs text-stone-500">{current.chapter.title}</p>
            {!flipped ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 py-8 text-center">
                <p className="text-3xl font-semibold">{current.card.term}</p>
                <p className="text-sm text-stone-500">先在心裡用自己的話解釋一次，再翻面對答案</p>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-2xl font-semibold">{current.card.term}</p>
                <CardBody card={current.card} />
              </div>
            )}
          </div>
          {!flipped ? (
            <button type="button" className={`${primaryButton} w-full`} onClick={() => setFlipped(true)}>
              翻面
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => answer("learning")}
                className="rounded-lg border border-orange-400 bg-orange-50 py-2 text-sm font-medium text-orange-800 hover:bg-orange-100"
              >
                還不熟
              </button>
              <button
                type="button"
                onClick={() => answer("known")}
                className="rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              >
                會了
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
