import assert from "node:assert/strict";
import test from "node:test";
import { dailyCapsules, drawWeighted, dueQueue, formatWait, isMastered, newSrsState, requeue, schedule, streakDays } from "../lib/srs.ts";

const now = new Date("2026-11-10T10:00:00Z");
const day = 864e5;
const after = (state) => new Date(state.dueAt).getTime() - now.getTime();

test("新卡：仍會結巴 10 分鐘、普通 1 天、容易 4 天", () => {
  const fresh = newSrsState(now);
  assert.equal(after(schedule(fresh, "again", now)), 10 * 60 * 1000);
  assert.equal(after(schedule(fresh, "good", now)), 1 * day);
  assert.equal(after(schedule(fresh, "easy", now)), 4 * day);
  assert.deepEqual(["again", "good", "easy"].map((grade) => formatWait(fresh, grade, now)), ["10 分鐘", "1 天", "4 天"]);
});

test("複習越順，間隔越拉越長", () => {
  let state = schedule(newSrsState(now), "good", now);
  const intervals = [state.intervalDays];
  for (let i = 0; i < 3; i++) {
    state = schedule(state, "good", now);
    intervals.push(state.intervalDays);
  }
  assert.deepEqual(intervals, [1, 3, 8, 20]);
  assert.equal(isMastered(schedule(state, "good", now)), true);
});

test("卡住一次：間隔歸零、記一次遺忘、ease 下降但不低於 1.3", () => {
  let state = { intervalDays: 20, ease: 1.4, reps: 4, lapses: 0, dueAt: now.toISOString(), reviewCount: 4 };
  state = schedule(state, "again", now);
  assert.deepEqual([state.intervalDays, state.reps, state.lapses, state.ease, state.reviewCount], [0, 0, 1, 1.3, 5]);
  assert.equal(schedule(state, "good", now).intervalDays, 1);
});

test("今日膠囊最多 5 張，常卡住、拖最久的先上", () => {
  const card = (id, lapses, dueOffset) => ({ id, intervalDays: 1, ease: 2.5, reps: 1, lapses, reviewCount: 1, dueAt: new Date(now.getTime() + dueOffset).toISOString() });
  const cards = [card("a", 0, -day), card("b", 2, -1000), card("c", 0, -2 * day), card("future", 5, day), ...["d", "e", "f"].map((id) => card(id, 0, -10))];
  assert.deepEqual(dailyCapsules(cards, now).map((item) => item.id), ["b", "c", "a", "d", "e"]);
  assert.equal(dueQueue(cards, now).length, 6);
});

test("連續打卡天數", () => {
  assert.equal(streakDays(["2026-11-08", "2026-11-09", "2026-11-10"], "2026-11-10"), 3);
  assert.equal(streakDays(["2026-11-08", "2026-11-09"], "2026-11-10"), 2);
  assert.equal(streakDays(["2026-11-07", "2026-11-09"], "2026-11-10"), 1);
  assert.equal(streakDays([], "2026-11-10"), 0);
  assert.equal(streakDays(["2026-10-31", "2026-11-01"], "2026-11-01"), 2);
});

test("再複習往後插、盲抽偏向不熟的", () => {
  assert.deepEqual(requeue(["a", "b", "c", "d"], 0, 3), ["b", "c", "d", "a"]);
  const cards = [
    { id: "weak", intervalDays: 0, ease: 2.5, reps: 0, lapses: 2, dueAt: "", reviewCount: 0 },
    { id: "strong", intervalDays: 60, ease: 2.5, reps: 5, lapses: 0, dueAt: "", reviewCount: 0 },
  ];
  let weak = 0;
  for (let i = 0; i < 100; i++) if (drawWeighted(cards, () => i / 100)?.id === "weak") weak++;
  assert.ok(weak > 80);
});
