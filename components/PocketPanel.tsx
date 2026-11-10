"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { postJson, request } from "@/lib/client";
import { ROLES } from "@/lib/options";
import { dailyCapsules, drawWeighted, dueQueue, isMastered, MASTERED_DAYS, requeue, schedule, type Grade } from "@/lib/srs";
import type { PocketCard, PocketContent, PocketStreak, SourceSummary } from "@/lib/types";
import { FillText, PocketStage, StarList } from "./PocketStage";
import { ErrorNote, inputClass, primaryButton, RoleInput, SourceChecklist } from "./shared";

type View = "capsule" | "review" | "blind" | "library" | "extract" | "custom" | "generate";

const VIEWS: { id: View; label: string }[] = [
  { id: "capsule", label: "今日膠囊" },
  { id: "review", label: "全部到期" },
  { id: "blind", label: "盲抽練習" },
  { id: "library", label: "卡庫" },
  { id: "extract", label: "情境提取器" },
  { id: "custom", label: "我的黑話卡" },
  { id: "generate", label: "從資料產生" },
];

const subButton = (on: boolean) =>
  `shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
    on ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:text-stone-900"
  }`;

// 使用者當地的日期 YYYY-MM-DD，每日打卡以這個為準。
const localDay = () => new Date().toLocaleDateString("sv-SE");

export function PocketPanel({
  sources,
  active,
  onGoToSources,
}: {
  sources: SourceSummary[];
  active: boolean;
  onGoToSources: () => void;
}) {
  const [cards, setCards] = useState<PocketCard[] | null>(null);
  const [streak, setStreak] = useState<PocketStreak>({ today: 0, goal: 5, days: 0 });
  const [view, setView] = useState<View>("capsule");
  const [editing, setEditing] = useState<PocketCard | null>(null);
  // 卡片有新增時換一個 session，膠囊和複習隊列才會把新卡排進去。
  const [session, setSession] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    request<{ cards: PocketCard[]; streak: PocketStreak }>(`/api/pocket?today=${localDay()}`)
      .then((data) => {
        if (!current) return;
        setCards(data.cards);
        setStreak(data.streak);
      })
      .catch((caught: Error) => {
        if (!current) return;
        setCards([]);
        setError(caught.message);
      });
    return () => {
      current = false;
    };
  }, []);

  // 先在畫面上套用排程結果，不等伺服器；存檔失敗才還原。
  const grade = useCallback((card: PocketCard, value: Grade) => {
    const next = { ...card, ...schedule(card, value, new Date()) };
    setCards((items) => items?.map((item) => (item.id === card.id ? next : item)) ?? null);
    setStreak((before) => {
      const today = before.today + 1;
      return { ...before, today, days: before.today < before.goal && today >= before.goal ? before.days + 1 : before.days };
    });
    setError("");
    request<{ card: PocketCard }>(`/api/pocket/${card.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ grade: value, day: localDay() }),
    })
      .then((data) => setCards((items) => items?.map((item) => (item.id === card.id ? data.card : item)) ?? null))
      .catch((caught: Error) => {
        setCards((items) => items?.map((item) => (item.id === card.id ? card : item)) ?? null);
        setError(`複習紀錄沒有存到：${caught.message}`);
      });
  }, []);

  function added(newCards: PocketCard[]) {
    setCards((items) => [...newCards, ...(items ?? [])]);
    setSession((value) => value + 1);
  }

  async function remove(card: PocketCard) {
    if (!window.confirm(`確定刪除「${card.term}」這張口袋卡？`)) return;
    setError("");
    try {
      await request(`/api/pocket/${card.id}`, { method: "DELETE" });
      setCards((items) => items?.filter((item) => item.id !== card.id) ?? null);
    } catch (caught) {
      setError((caught as Error).message);
    }
  }

  if (!cards) return <p className="p-8 text-center text-sm text-stone-500">載入口袋卡…</p>;

  const empty = cards.length === 0;
  const masteredCount = cards.filter(isMastered).length;
  const goalMet = streak.today >= streak.goal;

  return (
    <div className="space-y-4">
      <nav aria-label="口袋卡功能" className="flex max-w-full gap-2 overflow-x-auto pb-1">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-current={view === item.id ? "page" : undefined}
            onClick={() => {
              setView(item.id);
              setEditing(null);
            }}
            className={subButton(view === item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {!empty && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm">
          <span className="font-medium">
            <span aria-hidden>🔥</span> 連續打卡 {streak.days} 天
          </span>
          <span className="flex items-center gap-2 text-stone-600">
            今日鞏固 {Math.min(streak.today, streak.goal)} / {streak.goal}
            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-stone-200">
              <span className={`block h-full ${goalMet ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${Math.min(100, (streak.today / streak.goal) * 100)}%` }} />
            </span>
            {goalMet && <span className="text-emerald-700">已打卡</span>}
          </span>
          <span className="text-stone-500">
            到期 {dueQueue(cards, new Date()).length} · 學習中 {cards.length - masteredCount} · 已熟練 {masteredCount}
          </span>
        </div>
      )}

      <ErrorNote message={error} />

      {empty && ["capsule", "review", "blind", "library"].includes(view) ? (
        <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-600">
          <p>還沒有口袋卡。</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" className={primaryButton} onClick={() => setView("extract")}>
              貼一段對話生成
            </button>
            <button type="button" className={subButton(false)} onClick={() => setView("generate")}>
              從我的資料產生
            </button>
            <button type="button" className={subButton(false)} onClick={() => setView("custom")}>
              自己寫一張
            </button>
          </div>
        </div>
      ) : view === "capsule" ? (
        <Session
          key={`capsule-${session}`}
          cards={cards}
          active={active}
          onGrade={grade}
          build={(items) => dailyCapsules(items, new Date()).map((card) => card.id)}
          intro="今日需鞏固的跨領域膠囊：從到期的卡裡挑出最常卡住、拖最久的 5 張。"
          empty={
            <>
              <p className="font-semibold text-emerald-900">今天沒有需要鞏固的膠囊</p>
              <p className="mt-2 text-sm text-emerald-800">新卡和到期的卡會自動排進明天的膠囊。</p>
            </>
          }
          finished={(done) => (
            <>
              <p className="font-semibold text-emerald-900">今日膠囊完成，共作答 {done} 次</p>
              <p className="mt-2 text-sm text-emerald-800">{goalMet ? `打卡成功，已連續 ${streak.days} 天。` : `再複習 ${streak.goal - streak.today} 次就完成今天的打卡。`}</p>
              <button type="button" className={`${primaryButton} mt-4`} onClick={() => setView("review")}>
                繼續複習其他到期卡
              </button>
            </>
          )}
        />
      ) : view === "review" ? (
        <Session
          key={`review-${session}`}
          cards={cards}
          active={active}
          onGrade={grade}
          build={(items) => dueQueue(items, new Date()).map((card) => card.id)}
          intro="所有已到期的卡，依到期時間排序。"
          empty={<p className="font-semibold text-emerald-900">目前沒有到期的卡片</p>}
          finished={(done) => <p className="font-semibold text-emerald-900">到期的卡都複習完了，共作答 {done} 次</p>}
          allowAll
        />
      ) : view === "blind" ? (
        <BlindSession cards={cards} active={active} onGrade={grade} />
      ) : view === "library" ? (
        <Library
          cards={cards}
          onEdit={(card) => {
            setEditing(card);
            setView("custom");
          }}
          onRemove={remove}
        />
      ) : view === "extract" ? (
        <ExtractForm
          onCreated={(newCards) => {
            added(newCards);
            setView("library");
          }}
        />
      ) : view === "custom" ? (
        <CustomCardForm
          key={editing?.id ?? "new"}
          initial={editing}
          onSaved={(card, isNew) => {
            if (isNew) added([card]);
            else setCards((items) => items?.map((item) => (item.id === card.id ? card : item)) ?? null);
            setEditing(null);
            setView(isNew ? "capsule" : "library");
          }}
        />
      ) : (
        <GenerateForm
          sources={sources}
          onGoToSources={onGoToSources}
          onCreated={(newCards) => {
            added(newCards);
            setView("capsule");
          }}
        />
      )}
    </div>
  );
}

function KeyHints({ blind }: { blind?: boolean }) {
  return (
    <p className="hidden text-xs text-stone-500 sm:block">
      空白鍵翻牌 · 1 仍會結巴 · 2 普通 · 3 容易 · → {blind ? "換一張" : "跳過"}
    </p>
  );
}

function Session({
  cards,
  active,
  onGrade,
  build,
  intro,
  empty,
  finished,
  allowAll,
}: {
  cards: PocketCard[];
  active: boolean;
  onGrade: (card: PocketCard, grade: Grade) => void;
  build: (cards: PocketCard[]) => string[];
  intro: string;
  empty: React.ReactNode;
  finished: (done: number) => React.ReactNode;
  allowAll?: boolean;
}) {
  // 一輪開始時固定題目，按完回饋卡片才不會在眼前跳動。
  const [queue, setQueue] = useState(() => build(cards));
  const [done, setDone] = useState(0);
  const lookup = new Map(cards.map((card) => [card.id, card]));
  const card = queue.map((id) => lookup.get(id)).find((item) => item !== undefined);

  const answer = useCallback(
    (grade: Grade) => {
      if (!card) return;
      onGrade(card, grade);
      setDone((value) => value + 1);
      // 仍會結巴：十分鐘後要再見一次，這一輪往後插三張；其他的這一輪不再出現。
      setQueue((items) => (grade === "again" ? requeue(items, items.indexOf(card.id), 3) : items.filter((id) => id !== card.id)));
    },
    [card, onGrade],
  );

  const skip = useCallback(() => {
    if (card) setQueue((items) => [...items.filter((id) => id !== card.id), card.id]);
  }, [card]);

  if (!card) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        {done > 0 ? finished(done) : empty}
        {allowAll && (
          <button type="button" className={`${primaryButton} mt-4`} onClick={() => setQueue([...cards].sort((a, b) => a.intervalDays - b.intervalDays).map((item) => item.id))}>
            不管排程，全部再練一輪
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600">
        <span>
          {intro} 剩 {queue.length} 張
        </span>
        <KeyHints />
      </div>
      <PocketStage key={`${card.id}-${done}`} card={card} active={active} onFeedback={answer} onSkip={skip} />
    </div>
  );
}

const SECONDS = [15, 30, 60];

function BlindSession({ cards, active, onGrade }: { cards: PocketCard[]; active: boolean; onGrade: (card: PocketCard, grade: Grade) => void }) {
  const [seconds, setSeconds] = useState(15);
  const [current, setCurrent] = useState<{ id: string; draw: number } | null>(null);
  const card = current ? cards.find((item) => item.id === current.id) : undefined;

  const draw = useCallback(
    (excludeId?: string) => {
      const next = drawWeighted(cards, Math.random, excludeId);
      if (next) setCurrent((value) => ({ id: next.id, draw: (value?.draw ?? 0) + 1 }));
    },
    [cards],
  );

  const answer = useCallback(
    (grade: Grade) => {
      if (!card) return;
      onGrade(card, grade);
      draw(card.id);
    },
    [card, draw, onGrade],
  );

  const skip = useCallback(() => draw(card?.id), [card, draw]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-stone-600">
          口說倒數
          {SECONDS.map((value) => (
            <button key={value} type="button" aria-pressed={seconds === value} onClick={() => setSeconds(value)} className={subButton(seconds === value)}>
              {value} 秒
            </button>
          ))}
        </div>
        {card && <KeyHints blind />}
      </div>

      {!card ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center">
          <p className="font-serif text-xl">模擬面試・盲抽</p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-stone-600">
            隨機抽一張，越不熟的越容易抽到。看完正面的情境題，在倒數內開口講出答案，時間到自動翻牌，再對照背面的標準話術。
          </p>
          <button type="button" className={`${primaryButton} mt-5`} onClick={() => draw()}>
            開始盲抽
          </button>
        </div>
      ) : (
        <>
          <PocketStage key={`${card.id}-${current?.draw}-${seconds}`} card={card} active={active} countdown={seconds} onFeedback={answer} onSkip={skip} />
          <div className="text-center">
            <button type="button" onClick={skip} className="text-sm text-stone-500 hover:text-stone-900">
              換一張
            </button>
          </div>
        </>
      )}
    </div>
  );
}

type Filter = "all" | "learning" | "mastered";

const ORIGIN_LABEL: Record<PocketCard["origin"], string> = { ai: "AI 產生", custom: "我的黑話卡", extract: "情境提取" };

function waitText(card: PocketCard) {
  const due = new Date(card.dueAt);
  return due.getTime() <= Date.now() ? "已到期" : `下次複習：${due.toLocaleString("zh-TW", { dateStyle: "short", timeStyle: "short" })}`;
}

function Library({ cards, onEdit, onRemove }: { cards: PocketCard[]; onEdit: (card: PocketCard) => void; onRemove: (card: PocketCard) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState("");
  const visible = cards.filter((card) => (filter === "all" ? true : filter === "mastered" ? isMastered(card) : !isMastered(card)));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "all", label: `全部 ${cards.length}` },
            { id: "learning", label: `學習中 ${cards.filter((card) => !isMastered(card)).length}` },
            { id: "mastered", label: `已熟練 ${cards.filter(isMastered).length}` },
          ] as const
        ).map((item) => (
          <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={subButton(filter === item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-stone-500">
        翻牌後依回答狀況選：仍會結巴（10 分鐘後重來）、普通（第一次 1 天後）、容易（第一次 4 天後）。答得越順，間隔越拉越長；間隔超過 {MASTERED_DAYS} 天算已熟練。
      </p>

      {visible.length === 0 ? (
        <p className="p-8 text-center text-sm text-stone-500">這裡還沒有卡片。</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((card) => (
            <li key={card.id} className="rounded-xl border border-stone-200 bg-white">
              <button
                type="button"
                aria-expanded={openId === card.id}
                onClick={() => setOpenId((id) => (id === card.id ? "" : card.id))}
                className="w-full px-4 py-3 text-left"
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{card.term}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${isMastered(card) ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}`}>
                    {isMastered(card) ? "已熟練" : "學習中"} · 間隔 {card.intervalDays} 天
                  </span>
                  {card.origin !== "ai" && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800">{ORIGIN_LABEL[card.origin]}</span>}
                  {card.lapses > 0 && <span className="text-xs text-rose-700">卡住 {card.lapses} 次</span>}
                </span>
                <span className="mt-0.5 block truncate text-sm text-stone-600">{card.scenario}</span>
                <span className="text-xs text-stone-500">{waitText(card)}</span>
              </button>
              {openId === card.id && (
                <div className="space-y-3 border-t border-stone-100 p-4 text-sm">
                  {card.experience && (
                    <p className="whitespace-pre-wrap rounded-lg bg-stone-50 p-3 text-stone-700">
                      <span className="block text-xs font-semibold text-stone-500">{card.origin === "extract" ? "原始情境" : "我的原話"}</span>
                      {card.experience}
                    </p>
                  )}
                  {card.question && <p className="text-stone-700">面試官會問：{card.question}</p>}
                  <p className="rounded-lg bg-emerald-50 p-3 leading-relaxed">
                    <span className="block text-xs font-semibold text-emerald-800">金牌回答範句</span>
                    <FillText text={card.goldenLine} />
                  </p>
                  <StarList star={card.star} />
                  {card.pitfalls.length > 0 && (
                    <ul className="list-disc space-y-1 pl-5 text-stone-700">
                      {card.pitfalls.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  )}
                  <div className="flex gap-4">
                    <button type="button" onClick={() => onEdit(card)} className="text-stone-600 hover:text-stone-900">
                      編輯
                    </button>
                    <button type="button" onClick={() => onRemove(card)} className="text-stone-500 hover:text-red-600">
                      刪除
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ExtractForm({ onCreated }: { onCreated: (cards: PocketCard[]) => void }) {
  const [text, setText] = useState("");
  const [targetRole, setTargetRole] = useState<string>(ROLES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await postJson<{ cards: PocketCard[] }>("/api/pocket/extract", { text, targetRole });
      onCreated(data.cards);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-2xl space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
      <div>
        <h2 className="font-semibold">自定義情境提取器</h2>
        <p className="mt-1 text-sm leading-relaxed text-stone-600">
          把今天開會聽不懂的對話，或面試被問倒的題目貼進來。AI 會挑出你最需要弄懂的 1 到 5 個概念，直接做成專屬口袋卡，排進明天的膠囊。
        </p>
      </div>
      <textarea
        className={`${inputClass} min-h-44`}
        aria-label="開會對話或面試題目"
        placeholder={"例如：\nPM：這版 retention 掉了，我們要不要先看 cohort？\nRD：先確認是不是 tracking 漏了，event schema 上週有改。\n主管：好，週五前給我一個 root cause。"}
        value={text}
        maxLength={6000}
        onChange={(event) => setText(event.target.value)}
      />
      <RoleInput value={targetRole} onChange={setTargetRole} />
      <ErrorNote message={error} />
      <button type="submit" className={`${primaryButton} w-full`} disabled={busy || !text.trim() || !targetRole.trim()}>
        {busy ? "提取中，大約半分鐘…" : "一鍵生成 Pocket 卡"}
      </button>
    </form>
  );
}

const EMPTY: PocketContent = {
  scenario: "",
  question: "",
  term: "",
  termMeaning: "",
  goldenLine: "",
  star: { situation: "", task: "", action: "", result: "" },
  pitfalls: [],
};

function CustomCardForm({ initial, onSaved }: { initial: PocketCard | null; onSaved: (card: PocketCard, isNew: boolean) => void }) {
  const [experience, setExperience] = useState(initial?.experience ?? "");
  const [targetRole, setTargetRole] = useState(initial?.targetRole || ROLES[0]);
  const [content, setContent] = useState<PocketContent>(initial ?? EMPTY);
  const [pitfallText, setPitfallText] = useState((initial?.pitfalls ?? []).join("\n"));
  const [busy, setBusy] = useState<"" | "translate" | "save">("");
  const [error, setError] = useState("");

  const set = <K extends keyof PocketContent>(key: K, value: PocketContent[K]) => setContent((item) => ({ ...item, [key]: value }));
  const setStar = (key: keyof PocketContent["star"], value: string) => setContent((item) => ({ ...item, star: { ...item.star, [key]: value } }));

  async function translate() {
    setBusy("translate");
    setError("");
    try {
      const data = await postJson<{ card: PocketContent }>("/api/pocket/translate", { experience, targetRole });
      setContent(data.card);
      setPitfallText(data.card.pitfalls.join("\n"));
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy("save");
    setError("");
    const card = { ...content, pitfalls: pitfallText.split("\n").map((line) => line.trim()).filter(Boolean) };
    try {
      if (initial) {
        const data = await request<{ card: PocketCard }>(`/api/pocket/${initial.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ card }),
        });
        onSaved(data.card, false);
      } else {
        const data = await postJson<{ card: PocketCard }>("/api/pocket", { card, experience, targetRole });
        onSaved(data.card, true);
      }
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy("");
    }
  }

  const field = (label: string, value: string, onChange: (value: string) => void, options: { rows?: number; placeholder?: string; required?: boolean } = {}) => (
    <label className="block text-sm text-stone-600">
      {label}
      {options.required && <span className="text-rose-700"> *</span>}
      <textarea
        className={`${inputClass} mt-1 text-stone-900`}
        rows={options.rows ?? 2}
        placeholder={options.placeholder}
        value={value}
        maxLength={2000}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );

  const canSave = content.scenario.trim() && content.term.trim() && content.goldenLine.trim();

  return (
    <form onSubmit={save} className="grid gap-4 md:grid-cols-2">
      <section className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 md:self-start">
        <h2 className="text-sm font-semibold text-amber-900">{initial ? "編輯口袋卡" : "我的口語經驗"}</h2>
        <textarea
          className={`${inputClass} min-h-40`}
          aria-label="我的口語經驗"
          placeholder="想到什麼就打什麼，例如：之前做活動報名頁，老闆一直加功能，我就把需求排一排，先做報名跟付款，其他的下一版再說，結果準時上線"
          value={experience}
          maxLength={3000}
          onChange={(event) => setExperience(event.target.value)}
        />
        <RoleInput value={targetRole} onChange={setTargetRole} />
        <button type="button" className={`${primaryButton} w-full`} disabled={!!busy || !experience.trim() || !targetRole.trim()} onClick={translate}>
          {busy === "translate" ? "AI 轉譯中…" : "AI 轉譯成 PM 黑話"}
        </button>
        <p className="text-xs leading-relaxed text-amber-900/80">
          AI 只會用你寫的事實，缺的會標成「[補：…]」。不想用 AI，直接在右邊自己填也可以。
        </p>
      </section>

      <section className="space-y-3 rounded-2xl border border-indigo-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-indigo-900">卡片內容</h2>
        {field("正面：生活情境直覺題", content.scenario, (value) => set("scenario", value), { rows: 3, required: true, placeholder: "用生活情境包裝的問題，例如：早餐店只能先推三款新品，你怎麼挑？" })}
        {field("面試官會這樣問", content.question, (value) => set("question", value))}
        <label className="block text-sm text-stone-600">
          核心術語<span className="text-rose-700"> *</span>
          <input className={`${inputClass} mt-1 text-stone-900`} maxLength={120} value={content.term} onChange={(event) => set("term", event.target.value)} placeholder="例如 MoSCoW" />
        </label>
        {field("術語白話解釋", content.termMeaning, (value) => set("termMeaning", value))}
        {field("金牌回答範句", content.goldenLine, (value) => set("goldenLine", value), { rows: 4, required: true })}
        <fieldset className="space-y-2">
          <legend className="text-sm text-stone-600">STAR</legend>
          {field("S 情境", content.star.situation, (value) => setStar("situation", value))}
          {field("T 任務", content.star.task, (value) => setStar("task", value))}
          {field("A 行動", content.star.action, (value) => setStar("action", value))}
          {field("R 結果", content.star.result, (value) => setStar("result", value))}
        </fieldset>
        {field("防禦性避坑指南（一行一條）", pitfallText, setPitfallText, { rows: 3, placeholder: "別說……，因為……；改說……" })}
        <ErrorNote message={error} />
        <button type="submit" className={`${primaryButton} w-full`} disabled={!!busy || !canSave}>
          {busy === "save" ? "儲存中…" : initial ? "儲存修改" : "存成口袋卡"}
        </button>
      </section>
    </form>
  );
}

function GenerateForm({
  sources,
  onGoToSources,
  onCreated,
}: {
  sources: SourceSummary[];
  onGoToSources: () => void;
  onCreated: (cards: PocketCard[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [targetRole, setTargetRole] = useState<string>(ROLES[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const data = await postJson<{ cards: PocketCard[] }>("/api/pocket/generate", { sourceIds: selected, targetRole });
      onCreated(data.cards);
    } catch (caught) {
      setError((caught as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (sources.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-600">
        <p>還沒有資料可以用。</p>
        <button type="button" className={`${primaryButton} mt-4`} onClick={onGoToSources}>
          去「我的資料」新增
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
      <p className="text-sm leading-relaxed text-stone-600">勾選履歷、作品集或專案資料，AI 會挑出面試最可能考的 8 到 12 個概念，各做成一張口袋卡。</p>
      <SourceChecklist sources={sources} selected={selected} onChange={setSelected} />
      <RoleInput value={targetRole} onChange={setTargetRole} />
      <ErrorNote message={error} />
      <button type="submit" className={`${primaryButton} w-full`} disabled={busy || selected.length === 0 || !targetRole.trim()}>
        {busy ? "產生中，大約一到兩分鐘…" : "產生口袋卡"}
      </button>
    </form>
  );
}
