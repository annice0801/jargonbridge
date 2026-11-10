import assert from "node:assert/strict";
import test from "node:test";
import { applyFeedback, drawWeighted, dueQueue, newState, requeue } from "../lib/leitner.ts";

const now = new Date("2026-11-04T10:00:00Z");
const day = 24 * 60 * 60 * 1000;

test("新卡在第 1 盒、立刻到期", () => {
  assert.deepEqual(newState(now), { box: 1, mastered: false, dueAt: now.toISOString(), reviewCount: 0 });
});

test("已掌握往後移一盒並拉長間隔", () => {
  const first = applyFeedback(newState(now), "mastered", now);
  assert.equal(first.box, 2);
  assert.equal(first.mastered, true);
  assert.equal(new Date(first.dueAt).getTime() - now.getTime(), 1 * day);
  const third = applyFeedback(applyFeedback(first, "mastered", now), "mastered", now);
  assert.equal(third.box, 4);
  assert.equal(new Date(third.dueAt).getTime() - now.getTime(), 7 * day);
});

test("最高停在第 5 盒", () => {
  const top = applyFeedback({ box: 5, mastered: true, dueAt: now.toISOString(), reviewCount: 9 }, "mastered", now);
  assert.equal(top.box, 5);
  assert.equal(top.reviewCount, 10);
});

test("再複習回到第 1 盒、移出已掌握", () => {
  const back = applyFeedback({ box: 4, mastered: true, dueAt: now.toISOString(), reviewCount: 3 }, "review", now);
  assert.deepEqual(back, { box: 1, mastered: false, dueAt: now.toISOString(), reviewCount: 4 });
});

test("今日複習只排到期的，盒號小的先", () => {
  const cards = [
    { id: "a", box: 3, mastered: true, dueAt: now.toISOString(), reviewCount: 0 },
    { id: "b", box: 1, mastered: false, dueAt: now.toISOString(), reviewCount: 0 },
    { id: "c", box: 2, mastered: true, dueAt: new Date(now.getTime() + day).toISOString(), reviewCount: 0 },
  ];
  assert.deepEqual(dueQueue(cards, now).map((card) => card.id), ["b", "a"]);
});

test("再複習的卡往後插，同一輪會再出現", () => {
  assert.deepEqual(requeue(["a", "b", "c", "d", "e"], 0, 3), ["b", "c", "d", "a", "e"]);
  assert.deepEqual(requeue(["a", "b"], 0, 3), ["b", "a"]);
});

test("盲抽依權重，不熟的機率高，且不會連抽同一張", () => {
  const cards = [
    { id: "new", box: 1, mastered: false, dueAt: "", reviewCount: 0 },
    { id: "done", box: 5, mastered: true, dueAt: "", reviewCount: 0 },
  ];
  assert.equal(drawWeighted(cards, () => 0)?.id, "new");
  assert.equal(drawWeighted(cards, () => 0.99)?.id, "done");
  assert.equal(drawWeighted(cards, () => 0, "new")?.id, "done");
  let fresh = 0;
  for (let i = 0; i < 100; i++) if (drawWeighted(cards, () => i / 100)?.id === "new") fresh++;
  assert.ok(fresh > 80);
  assert.equal(drawWeighted([], () => 0), undefined);
});
