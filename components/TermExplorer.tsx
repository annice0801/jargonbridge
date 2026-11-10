"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { postJson } from "@/lib/client";
import { normalizeTerm } from "@/lib/terms";
import type { TermExplanation } from "@/lib/types";
import { BetterAnswer, BridgePanes, ErrorNote, SaveNoteButton } from "./shared";
import { TermContext, type TermRequest } from "./term-context";
import { TermDiagramView } from "./TermDiagramView";

const keyOf = (request: TermRequest) =>
  [normalizeTerm(request.term), request.targetRole, request.style.level, request.style.tone].join("|");

export function TermExplorerProvider({ children }: { children: ReactNode }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const memory = useRef(new Map<string, TermExplanation>());
  const [stack, setStack] = useState<TermRequest[]>([]);
  const [explanation, setExplanation] = useState<TermExplanation | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  const current = stack.at(-1);

  const open = useCallback(
    (request: TermRequest) => {
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
      // 點到正在看的詞不用重新載入；其他詞疊上去，可以按返回。
      if (current && keyOf(current) === keyOf(request)) return;
      setExplanation(null);
      setError("");
      setStack((items) => [...items, request]);
    },
    [current],
  );

  useEffect(() => {
    if (!current) return;
    const key = keyOf(current);
    const remembered = memory.current.get(key);
    let active = true;
    // 記憶體有就直接顯示，也用非同步更新，切換詞彙時不會閃過上一個詞的內容。
    const request = remembered
      ? Promise.resolve({ explanation: remembered })
      : postJson<{ explanation: TermExplanation }>("/api/terms/explain", current);
    request
      .then((data) => {
        memory.current.set(key, data.explanation);
        if (active) setExplanation(data.explanation);
      })
      .catch((caught: Error) => {
        if (active) setError(caught.message);
      });
    return () => {
      active = false;
    };
  }, [current, retry]);

  function back() {
    setExplanation(null);
    setError("");
    setStack((items) => items.slice(0, -1));
  }

  function reset() {
    setStack([]);
    setExplanation(null);
    setError("");
  }

  const meta = current ? { style: current.style, targetRole: current.targetRole } : undefined;

  return (
    <TermContext.Provider value={open}>
      {children}
      <dialog
        ref={dialogRef}
        aria-label={current ? `${current.term} 的說明` : "詞彙說明"}
        onClose={reset}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="m-0 ml-auto h-dvh max-h-none w-full max-w-xl bg-stone-50 text-stone-900 shadow-2xl backdrop:bg-black/40"
      >
        {current && meta && (
          <div className="flex h-full flex-col">
            <header className="flex items-center gap-3 border-b border-stone-200 bg-white px-4 py-3">
              {stack.length > 1 && (
                <button type="button" onClick={back} className="shrink-0 text-sm text-stone-600 hover:text-stone-900">
                  ← {stack.at(-2)?.term}
                </button>
              )}
              <h2 className="min-w-0 flex-1 truncate font-semibold">{current.term}</h2>
              <button
                type="button"
                aria-label="關閉"
                onClick={() => dialogRef.current?.close()}
                className="shrink-0 px-1 text-lg text-stone-500 hover:text-stone-900"
              >
                ✕
              </button>
            </header>

            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {!explanation && !error && (
                <p role="status" className="py-10 text-center text-sm text-stone-500">
                  教練整理中，第一次查這個詞需要十幾秒…
                </p>
              )}
              {error && (
                <div className="space-y-3">
                  <ErrorNote message={error} />
                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      setRetry((value) => value + 1);
                    }}
                    className="text-sm underline"
                  >
                    再試一次
                  </button>
                </div>
              )}
              {explanation && (
                <>
                  <BridgePanes plain={explanation.plain} professional={explanation.definition} />
                  <TermDiagramView diagram={explanation.diagram} meta={meta} />
                  <Detail title="面試為什麼會問" text={explanation.whyItMatters} />
                  <Detail title="容易講錯的地方" text={explanation.pitfall} tone="text-orange-800" />
                  <BetterAnswer label="面試可以這樣說" text={explanation.interviewLine} />
                  {explanation.related.length > 0 && (
                    <section>
                      <h3 className="mb-2 text-xs font-semibold text-stone-500">相關詞彙</h3>
                      <ul className="flex flex-wrap gap-2">
                        {explanation.related.map((term) => (
                          <li key={term}>
                            <button
                              type="button"
                              onClick={() => open({ ...current, term, context: current.term })}
                              className="rounded-full border border-stone-300 bg-white px-3 py-1 text-sm hover:border-stone-500"
                            >
                              {term}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                  <SaveNoteButton
                    key={keyOf(current)}
                    note={{
                      title: current.term,
                      kind: "term",
                      plain: explanation.plain,
                      professional: explanation.definition,
                      betterAnswer: explanation.interviewLine,
                      targetRole: current.targetRole,
                      sourceRef: `term:${keyOf(current)}`,
                      diagram: explanation.diagram,
                    }}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </dialog>
    </TermContext.Provider>
  );
}

function Detail({ title, text, tone = "text-stone-500" }: { title: string; text: string; tone?: string }) {
  if (!text) return null;
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <h3 className={`mb-1 text-xs font-semibold ${tone}`}>{title}</h3>
      <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
    </section>
  );
}
