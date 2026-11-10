import assert from "node:assert/strict";
import test from "node:test";
import { deckStats, studyQueue } from "../lib/deck-utils.ts";

const card = (id) => ({ id, term: id, plain: "", example: "", inContext: "", definition: "", related: [] });
const chapters = [
  { id: "c1", title: "一", story: "", cards: [card("a"), card("b")] },
  { id: "c2", title: "二", story: "", cards: [card("c"), card("d")] },
];

test("統計會了的張數", () => {
  assert.deepEqual(deckStats(chapters, { a: "known", b: "learning" }), { total: 4, known: 1, remaining: 3 });
});

test("全部複習時依脈絡順序", () => {
  assert.deepEqual(studyQueue(chapters, { a: "known" }, false).map((item) => item.card.id), ["a", "b", "c", "d"]);
});

test("只看還不會的：跳過會了的，還不熟的排前面", () => {
  assert.deepEqual(studyQueue(chapters, { a: "known", d: "learning" }, true).map((item) => item.card.id), ["d", "b", "c"]);
});

test("全部會了時佇列是空的", () => {
  assert.equal(studyQueue(chapters, { a: "known", b: "known", c: "known", d: "known" }, true).length, 0);
});

test("佇列附上章節，翻卡時可顯示所在章節", () => {
  assert.equal(studyQueue(chapters, {}, true)[2].chapter.title, "二");
});
