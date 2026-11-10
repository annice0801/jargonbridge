"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { DIMENSIONS, type Scenario, type ShowcaseCard } from "@/lib/showcase";

type Shown = { scenario: Scenario; dimension: string; ms: number; run: number };

export function TryExperience() {
  const [shown, setShown] = useState<Shown | null>(null);
  const [pending, setPending] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  // started 用點擊事件的時間戳記（和 performance.now 同一個時間軸），算出實際花了多久才顯示。
  function pick(dimension: string, scenario: Scenario, started: number) {
    setPending(scenario.id);
    // 留一個極短的「編譯中」瞬間，讓眼睛看得到轉換發生。
    window.setTimeout(() => {
      setShown((before) => ({ scenario, dimension, ms: performance.now() - started, run: (before?.run ?? 0) + 1 }));
      setPending("");
      if (window.matchMedia("(max-width: 1023px)").matches) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }

  return (
    <div className="mt-14 space-y-12">
      <section aria-label="情境按鈕矩陣" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {DIMENSIONS.map((dimension, index) => (
          <div key={dimension.id} className="flex flex-col rounded-3xl bg-white/45 p-5 ring-1 ring-sumi/[0.07] backdrop-blur-sm">
            <div className="flex items-baseline justify-between">
              <p className="font-latin text-sm tracking-[0.1em] text-stone-mute">0{index + 1}</p>
              <p className="text-[11px] tracking-[0.15em] text-stone-mute">{dimension.subtitle}</p>
            </div>
            <h2 className="mt-3 font-serif text-lg leading-snug tracking-[0.03em]">{dimension.title}</h2>
            <ul className="mt-5 flex flex-1 flex-col gap-2">
              {dimension.scenarios.map((scenario) => {
                const active = shown?.scenario.id === scenario.id;
                return (
                  <li key={scenario.id}>
                    <button
                      type="button"
                      aria-pressed={active}
                      onClick={(event) => pick(dimension.title, scenario, event.timeStamp)}
                      className={`group w-full rounded-2xl px-4 py-3.5 text-left text-sm leading-relaxed transition duration-200 ${
                        active
                          ? "bg-sumi text-washi shadow-[0_12px_30px_-14px_rgb(43_39_35/0.6)]"
                          : "bg-white/70 ring-1 ring-sumi/[0.08] hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_14px_30px_-18px_rgb(43_39_35/0.45)]"
                      } ${pending === scenario.id ? "animate-pulse" : ""}`}
                    >
                      {scenario.prompt}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </section>

      <div ref={resultRef} className="scroll-mt-6">
        {shown ? (
          <Result key={shown.run} shown={shown} />
        ) : (
          <p className="rounded-3xl border border-dashed border-sumi/20 bg-white/30 p-12 text-center font-serif text-lg text-stone-mute">
            點上面任何一個情境，立刻看到轉譯結果。
          </p>
        )}
      </div>
    </div>
  );
}

function Result({ shown }: { shown: Shown }) {
  const { scenario } = shown;
  return (
    <article className="try-reveal space-y-8 rounded-[2rem] bg-white/65 p-6 shadow-[0_40px_80px_-50px_rgb(43_39_35/0.45)] ring-1 ring-sumi/[0.07] backdrop-blur-md sm:p-10">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-mute">
        <span>{shown.dimension}</span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" />
          轉譯完成 · {(shown.ms / 1000).toFixed(1)} 秒
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr] lg:gap-10">
        <div>
          <p className="text-xs tracking-[0.3em] text-rust">你遇到的處境</p>
          <p className="mt-3 font-serif text-xl leading-[1.9]">「{scenario.prompt}」</p>
        </div>
        <div>
          <p className="text-xs tracking-[0.3em] text-indigo-800">大廠交付行話・Jargon Output</p>
          <p className="mt-3 border-l-2 border-indigo-800/60 pl-4 font-serif text-lg leading-[1.95]">{scenario.jargon}</p>
          <p className="mt-5 inline-flex flex-wrap items-center gap-2 rounded-full bg-white/60 px-3.5 py-1.5 text-xs text-sumi ring-1 ring-sumi/10 backdrop-blur-sm">
            <span className="font-medium tracking-[0.15em] text-rust">關鍵能力</span>
            <span className="text-sumi/80">{scenario.checkpoint}</span>
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl bg-rose-50/60 p-6 ring-1 ring-rose-200/70">
          <p className="flex items-center gap-2 text-sm font-medium text-rose-800">
            <span aria-hidden className="grid size-5 place-items-center rounded-full bg-rose-100 text-[11px]">✕</span>
            NG 回答
          </p>
          <p className="mt-3 leading-[1.95] text-stone-700">{scenario.ng}</p>
        </section>
        <section className="rounded-2xl bg-emerald-50/60 p-6 ring-1 ring-emerald-200/70">
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-800">
            <span aria-hidden className="grid size-5 place-items-center rounded-full bg-emerald-100 text-[11px]">✓</span>
            滿分回答
          </p>
          <p className="mt-3 leading-[1.95] text-stone-800">{scenario.best}</p>
        </section>
      </div>

      <div>
        <p className="text-xs tracking-[0.3em] text-stone-mute">關鍵字卡・點一下翻面</p>
        <ul className="mt-3 grid gap-3 sm:grid-cols-3">
          {scenario.cards.map((card) => (
            <li key={card.term}>
              <FlipCard card={card} />
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-4 border-t border-sumi/10 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-xl text-sm leading-[1.9] text-stone-mute">以上為預先編寫的示範。登入後，AI 會依你自己的情境和資料即時轉譯、評分，並做成每天複習的口袋卡。</p>
        <Link href="/coach" className="shrink-0 rounded-full bg-sumi px-7 py-3 text-center text-sm tracking-[0.12em] text-washi shadow-[0_12px_30px_-14px_rgb(43_39_35/0.6)] transition-colors hover:bg-rust">
          用我的情境試試 →
        </Link>
      </div>
    </article>
  );
}

function FlipCard({ card }: { card: ShowcaseCard }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      aria-pressed={flipped}
      aria-label={`${card.term}，${flipped ? "顯示詞彙" : "翻面看解釋"}`}
      onClick={() => setFlipped((value) => !value)}
      className="pocket-scene block w-full text-left"
    >
      <span data-flipped={flipped} className="pocket-flipper min-h-32">
        <span className="pocket-face flex flex-col justify-between rounded-2xl bg-sumi p-5 text-washi shadow-[0_18px_40px_-24px_rgb(43_39_35/0.7)]">
          <span className="text-xs tracking-[0.3em] text-washi/50">TERM</span>
          <span className="font-serif text-lg leading-snug">{card.term}</span>
        </span>
        <span className="pocket-face pocket-back flex items-center rounded-2xl bg-white p-5 text-sm leading-relaxed text-stone-800 ring-1 ring-sumi/10">
          {card.meaning}
        </span>
      </span>
    </button>
  );
}
