"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { postJson, request } from "@/lib/client";
import { applyFeedback, BOX_DAYS, drawWeighted, dueQueue, requeue, type Feedback } from "@/lib/leitner";
import { ROLES } from "@/lib/options";
import type { PocketCard, PocketContent, SourceSummary } from "@/lib/types";
import { FillText, PocketStage, StarList } from "./PocketStage";
import { ErrorNote, inputClass, primaryButton, RoleInput, SourceChecklist } from "./shared";

type View = "practice" | "blind" | "library" | "custom" | "generate";

const VIEWS: { id: View; label: string }[] = [
  { id: "practice", label: "今日複習" },
  { id: "blind", label: "盲抽練習" },
  { id: "library", label: "卡庫" },
  { id: "custom", label: "我的黑話卡" },
  { id: "generate", label: "從資料產生" },
];

const subButton = (on: boolean) =>
  `shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition ${
    on ? "bg-stone-900 text-white" : "bg-white text-stone-600 ring-1 ring-stone-200 hover:text-stone-900"
  }`;

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
  const [view, setView] = useState<View>("practice");
  const [editing, setEditing] = useState<PocketCard | null>(null);
  // 卡片有新增時換一個 session，今日複習才會把新卡排進去。
  const [session, setSession] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;
    request<{ cards: PocketCard[] }>("/api/pocket")
      .then((data) => {
        if (current) setCards(data.cards);
      })
      .catch((caught: Error) => {
        if (current) {
          setCards([]);
          setError(caught.message);
        }
      });
    return () => {
      current = false;
    };
  }, []);

  // 先在畫面上套用間隔複習的結果，不等伺服器回應；存檔失敗才還原。
  const giveFeedback = useCallback((card: PocketCard, feedback: Feedback) => {
    const before = card;
    const next = { ...card, ...applyFeedback(card, feedback, new Date()) };
    setCards((items) => items?.map((item) => (item.id === card.id ? next : item)) ?? null);
    setError("");
    request<{ card: PocketCard }>(`/api/pocket/${card.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ feedback }),
    })
      .then((data) => setCards((items) => items?.map((item) => (item.id === card.id ? data.card : item)) ?? null))
      .catch((caught: Error) => {
        setCards((items) => items?.map((item) => (item.id === card.id ? before : item)) ?? null);
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

  const now = new Date();
  const dueCount = dueQueue(cards, now).length;
  const masteredCount = cards.filter((card) => card.mastered).length;
  const empty = cards.length === 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
          <p className="text-sm text-stone-500">
            今天待複習 <strong className="text-stone-900">{dueCount}</strong> · 複習隊列{" "}
            <strong className="text-stone-900">{cards.length - masteredCount}</strong> · 已掌握{" "}
            <strong className="text-emerald-700">{masteredCount}</strong>
          </p>
        )}
      </div>

      <ErrorNote message={error} />

      {empty && (view === "practice" || view === "blind" || view === "library") ? (
        <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-600">
          <p>還沒有口袋卡。</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" className={primaryButton} onClick={() => setView("generate")}>
              從我的資料產生
            </button>
            <button type="button" className={subButton(false)} onClick={() => setView("custom")}>
              自己寫一張
            </button>
          </div>
        </div>
      ) : view === "practice" ? (
        <PracticeSession key={session} cards={cards} active={active} onFeedback={giveFeedback} />
      ) : view === "blind" ? (
        <BlindSession cards={cards} active={active} onFeedback={giveFeedback} />
      ) : view === "library" ? (
        <Library
          cards={cards}
          onEdit={(card) => {
            setEditing(card);
            setView("custom");
          }}
          onRemove={remove}
        />
      ) : view === "custom" ? (
        <CustomCardForm
          key={editing?.id ?? "new"}
          initial={editing}
          onSaved={(card, isNew) => {
            if (isNew) added([card]);
            else setCards((items) => items?.map((item) => (item.id === card.id ? card : item)) ?? null);
            setEditing(null);
            setView(isNew ? "practice" : "library");
          }}
        />
      ) : (
        <GenerateForm
          sources={sources}
          onGoToSources={onGoToSources}
          onCreated={(newCards) => {
            added(newCards);
            setView("practice");
          }}
        />
      )}
    </div>
  );
}

function KeyHints({ blind }: { blind?: boolean }) {
  return (
    <p className="hidden text-xs text-stone-500 sm:block">
      空白鍵翻牌 · 1 / R 再複習 · 2 / M 已掌握 · → {blind ? "換一張" : "跳過"}
    </p>
  );
}

function PracticeSession({
  cards,
  active,
  onFeedback,
}: {
  cards: PocketCard[];
  active: boolean;
  onFeedback: (card: PocketCard, feedback: Feedback) => void;
}) {
  // 一輪開始時固定題目順序，按完回饋卡片才不會在眼前跳動。
  const [queue, setQueue] = useState(() => dueQueue(cards, new Date()).map((card) => card.id));
  const [done, setDone] = useState(0);
  const lookup = new Map(cards.map((card) => [card.id, card]));
  const card = queue.map((id) => lookup.get(id)).find((item) => item !== undefined);
  const index = card ? queue.indexOf(card.id) : -1;

  const answer = useCallback(
    (feedback: Feedback) => {
      if (!card) return;
      onFeedback(card, feedback);
      setDone((value) => value + 1);
      // 再複習：往後插三張，這一輪還會再遇到；已掌握：這一輪不再出現。
      setQueue((items) => (feedback === "review" ? requeue(items, items.indexOf(card.id), 3) : items.filter((id) => id !== card.id)));
    },
    [card, onFeedback],
  );

  const skip = useCallback(() => {
    if (card) setQueue((items) => [...items.filter((id) => id !== card.id), card.id]);
  }, [card]);

  if (!card) {
    const nextDue = cards.map((item) => item.dueAt).sort()[0];
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <p className="font-semibold text-emerald-900">{done > 0 ? `這一輪練完了，共 ${done} 次作答` : "今天沒有要複習的卡片"}</p>
        {nextDue && <p className="mt-2 text-sm text-emerald-800">下一張到期：{new Date(nextDue).toLocaleString("zh-TW", { dateStyle: "medium", timeStyle: "short" })}</p>}
        <button
          type="button"
          className={`${primaryButton} mt-4`}
          onClick={() => setQueue([...cards].sort((a, b) => a.box - b.box).map((item) => item.id))}
        >
          不管排程，全部再練一輪
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-stone-600">
        <span>
          這一輪剩 {queue.length - index} 張 · 第 {card.box} 盒{card.mastered ? " · 已掌握" : ""}
        </span>
        <KeyHints />
      </div>
      <PocketStage key={`${card.id}-${done}`} card={card} active={active} onFeedback={answer} onSkip={skip} />
    </div>
  );
}

const SECONDS = [15, 30, 60];

function BlindSession({
  cards,
  active,
  onFeedback,
}: {
  cards: PocketCard[];
  active: boolean;
  onFeedback: (card: PocketCard, feedback: Feedback) => void;
}) {
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
    (feedback: Feedback) => {
      if (!card) return;
      onFeedback(card, feedback);
      draw(card.id);
    },
    [card, draw, onFeedback],
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

type Filter = "all" | "review" | "mastered";

function Library({ cards, onEdit, onRemove }: { cards: PocketCard[]; onEdit: (card: PocketCard) => void; onRemove: (card: PocketCard) => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [openId, setOpenId] = useState("");
  const visible = cards.filter((card) => (filter === "all" ? true : filter === "mastered" ? card.mastered : !card.mastered));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "all", label: `全部 ${cards.length}` },
            { id: "review", label: `複習隊列 ${cards.filter((card) => !card.mastered).length}` },
            { id: "mastered", label: `已掌握 ${cards.filter((card) => card.mastered).length}` },
          ] as const
        ).map((item) => (
          <button key={item.id} type="button" aria-pressed={filter === item.id} onClick={() => setFilter(item.id)} className={subButton(filter === item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <p className="text-xs text-stone-500">
        第 1 盒當天再練，之後依序隔 {BOX_DAYS.slice(2).join("、")} 天出現。按「再複習」回到第 1 盒，按「已掌握」往後移一盒。
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
                  <span className={`rounded-full px-2 py-0.5 text-xs ${card.mastered ? "bg-emerald-100 text-emerald-800" : "bg-orange-100 text-orange-800"}`}>
                    {card.mastered ? "已掌握" : "複習中"} · 第 {card.box} 盒
                  </span>
                  {card.origin === "custom" && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-800">我的黑話卡</span>}
                </span>
                <span className="mt-0.5 block truncate text-sm text-stone-600">{card.scenario}</span>
                <span className="text-xs text-stone-500">下次複習：{new Date(card.dueAt).toLocaleDateString("zh-TW")}</span>
              </button>
              {openId === card.id && (
                <div className="space-y-3 border-t border-stone-100 p-4 text-sm">
                  {card.experience && (
                    <p className="rounded-lg bg-stone-50 p-3 text-stone-700">
                      <span className="block text-xs font-semibold text-stone-500">我的原話</span>
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
