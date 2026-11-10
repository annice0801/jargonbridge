"use client";

import { splitByTerms } from "@/lib/terms";
import { useTermOpener, type TermMeta } from "./term-context";

// 把文字裡的必知詞彙變成可以點的連結。
export function TermText({ text, terms, meta }: { text: string; terms: string[]; meta?: TermMeta }) {
  const open = useTermOpener();
  if (!meta || terms.length === 0) return text;
  return splitByTerms(text, terms).map((piece, index) =>
    piece.term ? (
      <button
        key={index}
        type="button"
        onClick={() => open({ term: piece.term!, context: text, ...meta })}
        className="font-medium underline decoration-rose-700 decoration-dotted underline-offset-4 hover:text-rose-800"
      >
        {piece.text}
      </button>
    ) : (
      <span key={index}>{piece.text}</span>
    ),
  );
}
