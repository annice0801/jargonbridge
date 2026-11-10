import type { DiagramNode, TermDiagram } from "./types";

export type TreeNode = { id: string; label: string; note: string; children: TreeNode[] };
export type TextPiece = { text: string; term?: string };

export const normalizeTerm = (term: string) => term.trim().replace(/\s+/g, " ").toLowerCase();

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// 把文字切成一般文字和可點的詞彙。英數詞彙要整字比對，RAG 才不會命中 FRAGMENT；長詞優先。
export function splitByTerms(text: string, terms: string[]): TextPiece[] {
  const unique = [...new Set(terms.map((term) => term.trim()).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (unique.length === 0 || !text) return text ? [{ text }] : [];

  const lookup = new Map(unique.map((term) => [term.toLowerCase(), term]));
  const pattern = unique
    .map((term) => {
      const before = /^[a-z0-9]/i.test(term) ? "(?<![a-z0-9])" : "";
      const after = /[a-z0-9]$/i.test(term) ? "(?![a-z0-9])" : "";
      return `${before}${escapeRegExp(term)}${after}`;
    })
    .join("|");

  const pieces: TextPiece[] = [];
  let last = 0;
  for (const match of text.matchAll(new RegExp(pattern, "gi"))) {
    if (match.index > last) pieces.push({ text: text.slice(last, match.index) });
    pieces.push({ text: match[0], term: lookup.get(match[0].toLowerCase()) ?? match[0] });
    last = match.index + match[0].length;
  }
  if (last < text.length) pieces.push({ text: text.slice(last) });
  return pieces;
}

// 節點是模型產生的，父節點可能不存在或形成循環。任何節點都要顯示一次，也不能造成無窮迴圈。
export function buildTree(nodes: DiagramNode[]): TreeNode[] {
  const ids = new Set(nodes.map((node) => node.id));
  const childrenOf = new Map<string, DiagramNode[]>();
  const roots: DiagramNode[] = [];
  for (const node of nodes) {
    if (!node.parentId || node.parentId === node.id || !ids.has(node.parentId)) {
      roots.push(node);
    } else {
      childrenOf.set(node.parentId, [...(childrenOf.get(node.parentId) ?? []), node]);
    }
  }

  const visited = new Set<string>();
  const walk = (node: DiagramNode): TreeNode | null => {
    if (visited.has(node.id)) return null;
    visited.add(node.id);
    const children = (childrenOf.get(node.id) ?? []).map(walk).filter((child): child is TreeNode => child !== null);
    return { id: node.id, label: node.label, note: node.note, children };
  };

  const tree = roots.map(walk).filter((node): node is TreeNode => node !== null);
  for (const node of nodes) {
    if (visited.has(node.id)) continue;
    const orphan = walk(node);
    if (orphan) tree.push(orphan);
  }
  return tree;
}

const line = (label: string, note: string) => (note ? `${label}：${note}` : label);

// 給 PDF 和 Markdown 用的純文字圖解。
export function diagramToLines(diagram: TermDiagram): string[] {
  if (diagram.kind === "flow") {
    return diagram.nodes.map((node, index) => `${index + 1}. ${line(node.label, node.note)}`);
  }
  if (diagram.kind === "compare") {
    return diagram.columns.flatMap((column) => [`${column.name}`, ...column.points.map((point) => `  - ${point}`)]);
  }
  const lines: string[] = [];
  const walk = (node: TreeNode, depth: number) => {
    lines.push(`${"  ".repeat(depth)}- ${line(node.label, node.note)}`);
    node.children.forEach((child) => walk(child, depth + 1));
  };
  buildTree(diagram.nodes).forEach((node) => walk(node, 0));
  return lines;
}
