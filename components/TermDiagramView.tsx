"use client";

import { buildTree, type TreeNode } from "@/lib/terms";
import type { TermDiagram } from "@/lib/types";
import { useTermOpener, type TermMeta } from "./term-context";

function NodeButton({ label, note, onSelect }: { label: string; note: string; onSelect: (label: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(label)}
      className="block w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-left transition hover:border-stone-400"
    >
      <span className="block text-sm font-medium">{label}</span>
      {note && <span className="mt-0.5 block text-xs leading-relaxed text-stone-600">{note}</span>}
    </button>
  );
}

function TreeBranch({ nodes, onSelect, nested = false }: { nodes: TreeNode[]; onSelect: (label: string) => void; nested?: boolean }) {
  return (
    <ul className={nested ? "mt-2 ml-3 space-y-2 border-l border-stone-300 pl-4" : "space-y-2"}>
      {nodes.map((node) => (
        <li
          key={node.id}
          className={nested ? "relative before:absolute before:top-5 before:-left-4 before:h-px before:w-4 before:bg-stone-300" : ""}
        >
          <NodeButton label={node.label} note={node.note} onSelect={onSelect} />
          {node.children.length > 0 && <TreeBranch nodes={node.children} onSelect={onSelect} nested />}
        </li>
      ))}
    </ul>
  );
}

export function TermDiagramView({ diagram, meta }: { diagram: TermDiagram; meta: TermMeta }) {
  const open = useTermOpener();
  const select = (label: string) => open({ term: label, context: diagram.title, ...meta });
  const hasContent = diagram.kind === "compare" ? diagram.columns.length > 0 : diagram.nodes.length > 0;
  if (!hasContent) return null;

  return (
    <section className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      <h3 className="mb-3 text-xs font-semibold text-stone-500">
        {diagram.title || "圖解"}
        {diagram.kind !== "compare" && "（按節點看說明）"}
      </h3>
      {diagram.kind === "tree" && <TreeBranch nodes={buildTree(diagram.nodes)} onSelect={select} />}
      {diagram.kind === "flow" && (
        <ol>
          {diagram.nodes.map((node, index) => (
            <li key={node.id}>
              {index > 0 && (
                <div aria-hidden="true" className="py-1 pl-5 text-stone-400">
                  ↓
                </div>
              )}
              <div className="flex items-start gap-2">
                <span className="mt-2.5 w-5 shrink-0 text-center text-xs font-semibold text-stone-500">{index + 1}</span>
                <div className="min-w-0 flex-1">
                  <NodeButton label={node.label} note={node.note} onSelect={select} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {diagram.kind === "compare" && (
        <div className={`grid gap-3 ${diagram.columns.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {diagram.columns.map((column) => (
            <div key={column.name} className="rounded-lg border border-stone-200 bg-white p-3">
              <p className="text-sm font-semibold">{column.name}</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-stone-700">
                {column.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
