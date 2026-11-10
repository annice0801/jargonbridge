"use client";

import { Fragment, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { formatWait, type Grade } from "@/lib/srs";
import { DEFAULT_STYLE, ROLES } from "@/lib/options";
import type { PocketCard } from "@/lib/types";
import { useTermOpener } from "./term-context";

const SWIPE_PX = 40;

// 「[補：…]」是要學習者自己補的事實，特別標出來。
export function FillText({ text }: { text: string }) {
  const parts = text.split(/(\[補：[^\]]*\])/);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith("[補：") ? (
          <mark key={index} className="rounded bg-amber-100 px-1 text-amber-900">
            {part}
          </mark>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || !!target.closest("dialog");
}

/**
 * 一張口袋卡的練習畫面：左邊正面（情境題），右邊是蓋著的背面，翻開才看到武器庫。
 * 換卡時由外層用 key 重新掛載，新卡一定從蓋牌開始，不會在翻轉動畫中露出答案。
 */
export function PocketStage({
  card,
  active,
  countdown,
  onFeedback,
  onSkip,
}: {
  card: PocketCard;
  active: boolean;
  countdown?: number;
  onFeedback: (grade: Grade) => void;
  onSkip?: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  // 第一次翻開後就不再倒數，蓋回去重看不會重新計時。
  const [revealed, setRevealed] = useState(false);
  const [remaining, setRemaining] = useState(countdown ?? 0);
  const tiltRef = useRef<HTMLDivElement>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const openTerm = useTermOpener();

  const timing = !!countdown && !revealed && remaining > 0;

  function toggle() {
    setFlipped((value) => !value);
    setRevealed(true);
  }

  // 盲抽倒數：時間到自動翻牌；提早翻牌就停止計時。
  useEffect(() => {
    if (!countdown || revealed) return;
    const deadline = Date.now() + countdown * 1000;
    const timer = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        window.clearInterval(timer);
        setFlipped(true);
        setRevealed(true);
      }
    }, 200);
    return () => window.clearInterval(timer);
  }, [countdown, revealed]);

  useEffect(() => {
    if (!active) return;
    function onKey(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (event.code === "Space") {
        // 焦點停在其他按鈕上（例如剛點的分頁）也一樣翻牌，並擋掉按鈕原本的點擊。
        event.preventDefault();
        toggle();
      } else if (flipped && event.key === "1") {
        onFeedback("again");
      } else if (flipped && event.key === "2") {
        onFeedback("good");
      } else if (flipped && event.key === "3") {
        onFeedback("easy");
      } else if (event.key === "ArrowRight" && onSkip) {
        onSkip();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, flipped, onFeedback, onSkip]);

  function onPointerDown(event: ReactPointerEvent) {
    pointer.current = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event: ReactPointerEvent) {
    const start = pointer.current;
    pointer.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy) * 1.5) {
      swiped.current = true;
      toggle();
    }
  }

  // 滑鼠移動時讓卡片微微傾斜，做出拿在手上的立體感；直接改 CSS 變數，不觸發重新渲染。
  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || !tiltRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    tiltRef.current.style.setProperty("--tilt-x", `${(-y * 6).toFixed(2)}deg`);
    tiltRef.current.style.setProperty("--tilt-y", `${(x * 8).toFixed(2)}deg`);
  }

  function resetTilt() {
    tiltRef.current?.style.setProperty("--tilt-x", "0deg");
    tiltRef.current?.style.setProperty("--tilt-y", "0deg");
  }

  function onClick() {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    toggle();
  }

  const meta = { style: DEFAULT_STYLE, targetRole: card.targetRole || ROLES[0] };
  // 按鈕上顯示的「幾天後」只是預覽，用卡片的到期時間當基準，避免在畫面渲染時讀取系統時間。
  const waitBase = new Date(card.dueAt);

  return (
    <div className="grid items-stretch gap-4 md:grid-cols-2">
      <section className="flex flex-col rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <p className="text-xs font-semibold tracking-wide text-amber-800">正面・生活情境直覺題</p>
        <p className="mt-4 flex-1 text-lg leading-relaxed text-stone-900 sm:text-xl">{card.scenario}</p>
        {card.question && (
          <div className="mt-6 border-t border-amber-200 pt-4">
            <p className="text-xs font-semibold text-amber-800">面試官會這樣問</p>
            <p className="mt-1 text-[15px] leading-relaxed text-stone-800">{card.question}</p>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3">
        <div
          className="pocket-scene flex-1"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (pointer.current = null)}
          onPointerMove={onPointerMove}
          onPointerLeave={resetTilt}
        >
          <div ref={tiltRef} className="pocket-tilt h-full">
            <div
              role="button"
              tabIndex={0}
              data-pocket-card
              aria-pressed={flipped}
              aria-label={flipped ? "蓋回背面" : "翻開背面"}
              data-flipped={flipped}
              onClick={onClick}
              onKeyDown={(event) => {
                if (event.key === "Enter") toggle();
              }}
              className="pocket-flipper h-full cursor-pointer select-none rounded-2xl outline-none focus-visible:ring-4 focus-visible:ring-stone-300"
            >
              <div inert={flipped} className="pocket-face pocket-cover flex flex-col items-center justify-center gap-4 rounded-2xl p-6 text-center text-washi shadow-lg">
                <p className="text-xs tracking-[0.3em] text-washi/70">蓋牌中</p>
                {countdown ? (
                  <>
                    <p className="font-serif text-6xl tabular-nums" aria-live="polite">
                      {timing ? remaining : 0}
                    </p>
                    <div className="h-1 w-40 overflow-hidden rounded-full bg-washi/20">
                      <div
                        className="h-full bg-washi/80 transition-[width] duration-200 ease-linear"
                        style={{ width: `${(remaining / countdown) * 100}%` }}
                      />
                    </div>
                    <p className="max-w-60 text-sm leading-relaxed text-washi/80">先開口講出你的答案，時間到會自動翻牌；講完了可以直接翻</p>
                  </>
                ) : (
                  <p className="max-w-60 font-serif text-xl leading-relaxed">先在腦中講一次答案，再翻牌核對</p>
                )}
                <p className="text-xs text-washi/60">點一下・空白鍵・左右滑動 翻牌</p>
              </div>

              <div inert={!flipped} className="pocket-face pocket-back space-y-4 rounded-2xl border border-indigo-200 bg-white p-5 shadow-lg sm:p-6">
                <p className="text-xs font-semibold tracking-wide text-indigo-800">背面・黑話與 STAR 答題武器庫</p>

                <div>
                  <p className="text-xs font-semibold text-stone-500">核心術語</p>
                  <button
                    type="button"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={(event) => {
                      event.stopPropagation();
                      openTerm({ term: card.term, context: card.goldenLine, ...meta });
                    }}
                    className="mt-1 text-left text-2xl font-semibold underline decoration-dotted underline-offset-4 hover:text-indigo-800"
                  >
                    {card.term}
                  </button>
                  {card.termMeaning && <p className="mt-1 text-sm leading-relaxed text-stone-600">{card.termMeaning}</p>}
                </div>

                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-xs font-semibold text-emerald-800">金牌回答範句</p>
                  <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed">
                    <FillText text={card.goldenLine} />
                  </p>
                </div>

                <StarList star={card.star} />

                {card.pitfalls.length > 0 && (
                  <div className="rounded-xl bg-rose-50 p-3">
                    <p className="text-xs font-semibold text-rose-800">防禦性避坑指南</p>
                    <ul className="mt-1 space-y-1.5 text-sm leading-relaxed text-stone-800">
                      {card.pitfalls.map((item, index) => (
                        <li key={index} className="flex gap-2">
                          <span aria-hidden className="text-rose-700">
                            ✕
                          </span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 先保留位置，翻牌時按鈕出現不會讓畫面跳動。 */}
        <div className={`grid grid-cols-3 gap-2 ${flipped ? "" : "invisible"}`}>
          {GRADES.map((grade) => (
            <button key={grade.id} type="button" onClick={() => onFeedback(grade.id)} className={`rounded-lg py-2 text-sm font-medium leading-tight ${grade.className}`}>
              {grade.label}
              <span className="block text-xs font-normal opacity-80">{formatWait(card, grade.id, waitBase)}後</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const GRADES: { id: Grade; label: string; className: string }[] = [
  { id: "again", label: "仍會結巴", className: "border border-rose-300 bg-rose-50 text-rose-800 hover:bg-rose-100" },
  { id: "good", label: "普通", className: "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50" },
  { id: "easy", label: "容易", className: "bg-emerald-600 text-white hover:bg-emerald-700" },
];

const STAR_ROWS = [
  { key: "situation", letter: "S", label: "情境" },
  { key: "task", letter: "T", label: "任務" },
  { key: "action", letter: "A", label: "行動" },
  { key: "result", letter: "R", label: "結果" },
] as const;

export function StarList({ star }: { star: PocketCard["star"] }) {
  const rows = STAR_ROWS.filter((row) => star[row.key]);
  if (rows.length === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-stone-500">STAR 答題骨架</p>
      <dl className="mt-1 space-y-1.5">
        {rows.map((row) => (
          <div key={row.key} className="flex gap-3 text-sm leading-relaxed">
            <dt className="w-14 shrink-0 font-semibold text-indigo-800">
              {row.letter} {row.label}
            </dt>
            <dd className="text-stone-800">
              <FillText text={star[row.key]} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
