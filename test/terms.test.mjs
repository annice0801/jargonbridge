import assert from "node:assert/strict";
import test from "node:test";
import { buildTree, diagramToLines, normalizeTerm, splitByTerms } from "../lib/terms.ts";

const node = (id, parentId = "") => ({ id, parentId, label: id, note: "" });

test("英數詞彙整字比對，不命中其他單字", () => {
  const pieces = splitByTerms("FRAGMENT 裡的 RAG 和 rag", ["RAG"]);
  assert.deepEqual(pieces.filter((piece) => piece.term).map((piece) => piece.text), ["RAG", "rag"]);
  assert.equal(pieces.map((piece) => piece.text).join(""), "FRAGMENT 裡的 RAG 和 rag");
});

test("長詞優先，特殊字元不會造成錯誤", () => {
  const pieces = splitByTerms("用 p95 latency 和 C++ (beta)", ["latency", "p95 latency", "C++", "(beta)"]);
  assert.deepEqual(pieces.filter((piece) => piece.term).map((piece) => piece.term), ["p95 latency", "C++", "(beta)"]);
});

test("中文詞彙可以緊鄰其他字", () => {
  assert.equal(splitByTerms("這是召回率的問題", ["召回率"])[1].term, "召回率");
});

test("沒有詞彙時原文不變", () => {
  assert.deepEqual(splitByTerms("文字", []), [{ text: "文字" }]);
  assert.deepEqual(splitByTerms("", ["x"]), []);
});

test("建立階層", () => {
  const [root] = buildTree([node("a"), node("b", "a"), node("c", "b")]);
  assert.equal(root.children[0].children[0].id, "c");
});

test("父節點不存在時變成根節點", () => {
  assert.deepEqual(buildTree([node("a", "missing")]).map((item) => item.id), ["a"]);
});

test("循環和自我參照不會卡死，節點也不會消失", () => {
  const seen = [];
  const walk = (item) => { seen.push(item.id); item.children.forEach(walk); };
  buildTree([node("a", "b"), node("b", "a"), node("c", "c")]).forEach(walk);
  assert.deepEqual(seen.sort(), ["a", "b", "c"]);
});

test("重複 id 不會無窮展開", () => {
  assert.equal(buildTree([node("a"), node("a")]).length, 1);
});

test("圖解轉成純文字", () => {
  assert.deepEqual(diagramToLines({ kind: "tree", title: "", nodes: [{ id: "a", parentId: "", label: "根", note: "說明" }, { id: "b", parentId: "a", label: "子", note: "" }], columns: [] }), ["- 根：說明", "  - 子"]);
  assert.deepEqual(diagramToLines({ kind: "flow", title: "", nodes: [node("x"), node("y")], columns: [] }), ["1. x", "2. y"]);
  assert.deepEqual(diagramToLines({ kind: "compare", title: "", nodes: [], columns: [{ name: "A", points: ["p"] }] }), ["A", "  - p"]);
});

test("正規化詞彙", () => {
  assert.equal(normalizeTerm("  P95   Latency "), "p95 latency");
});
