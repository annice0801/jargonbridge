"use client";

import { useState, type KeyboardEvent } from "react";
import { BASIS_LABEL, SLIDE_LABEL } from "@/lib/analysis";
import type { Deck, PointBasis } from "@/lib/types";
import { TermDiagramView } from "./TermDiagramView";
import { TermText } from "./TermText";

const BASIS_STYLE: Record<PointBasis, string> = {
  stated: "bg-emerald-100 text-emerald-800",
  inferred: "bg-amber-100 text-amber-900",
  missing: "bg-rose-100 text-rose-800",
};

// 一次一張的專家解析簡報。重點裡出現的知識卡詞彙可以直接點開解說。
export function AnalysisSlides({ deck }: { deck: Deck }) {
  const [index, setIndex] = useState(0);
  const analysis = deck.analysis;
  if (!analysis || analysis.slides.length === 0) return null;

  const slides = analysis.slides;
  const slide = slides[Math.min(index, slides.length - 1)];
  const terms = deck.chapters.flatMap((chapter) => chapter.cards.map((card) => card.term));
  const meta = { style: deck.style, targetRole: deck.targetRole };
  const go = (next: number) => setIndex(Math.max(0, Math.min(slides.length - 1, next)));

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") go(index + 1);
    if (event.key === "ArrowLeft") go(index - 1);
  }

  return (
    <div className="space-y-3" tabIndex={0} onKeyDown={onKeyDown} aria-label="專家解析簡報，可用左右方向鍵切換">
      <p className="rounded-xl bg-stone-900 px-4 py-3 text-[15px] leading-relaxed text-white">{analysis.oneLiner}</p>

      <nav aria-label="投影片" className="flex gap-1.5 overflow-x-auto pb-1">
        {slides.map((item, itemIndex) => (
          <button
            key={item.id}
            type="button"
            aria-current={itemIndex === index ? "step" : undefined}
            onClick={() => go(itemIndex)}
            className={`shrink-0 rounded-full border px-3 py-1 text-xs whitespace-nowrap ${
              itemIndex === index ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white hover:border-stone-500"
            }`}
          >
            {itemIndex + 1}. {SLIDE_LABEL[item.kind]}
          </button>
        ))}
      </nav>

      <article className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <header>
          <p className="text-xs font-semibold tracking-wide text-stone-500">
            {SLIDE_LABEL[slide.kind]} · {index + 1} / {slides.length}
          </p>
          <h3 className="mt-1 text-xl font-semibold sm:text-2xl">{slide.title}</h3>
          <p className="mt-3 border-l-4 border-indigo-500 pl-3 text-[15px] leading-relaxed font-medium text-indigo-950">
            <TermText text={slide.takeaway} terms={terms} meta={meta} />
          </p>
        </header>

        <section className="rounded-xl bg-amber-50 p-4">
          <h4 className="mb-1 text-xs font-semibold text-amber-800">給新手的比喻</h4>
          <p className="text-[15px] leading-relaxed">{slide.plain}</p>
        </section>

        <ul className="space-y-3">
          {slide.points.map((point, pointIndex) => (
            <li key={pointIndex} className="text-[15px] leading-relaxed">
              <span className={`mr-2 inline-block rounded px-1.5 py-0.5 align-middle text-[11px] font-semibold ${BASIS_STYLE[point.basis]}`}>
                {BASIS_LABEL[point.basis]}
              </span>
              <TermText text={point.text} terms={terms} meta={meta} />
              {point.evidence && <span className="mt-0.5 block text-xs text-stone-500">依據：{point.evidence}</span>}
            </li>
          ))}
        </ul>

        <TermDiagramView diagram={slide.diagram} meta={meta} />
      </article>

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => go(index - 1)}
          disabled={index === 0}
          className="shrink-0 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium whitespace-nowrap hover:bg-stone-100 disabled:opacity-40"
        >
          ← 上一張
        </button>
        <p className="hidden text-center text-xs text-stone-500 sm:block">「專家推斷」是依專業推論，面試前請確認屬實再講</p>
        <button
          type="button"
          onClick={() => go(index + 1)}
          disabled={index === slides.length - 1}
          className="shrink-0 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium whitespace-nowrap hover:bg-stone-100 disabled:opacity-40"
        >
          下一張 →
        </button>
      </div>
      <p className="text-center text-xs text-stone-500 sm:hidden">「專家推斷」是依專業推論，面試前請確認屬實再講</p>
    </div>
  );
}
