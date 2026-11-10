import assert from "node:assert/strict";
import test from "node:test";
import { applyAssessment } from "../lib/progress.ts";

const fresh = () => [
  { title: "A", status: "learning", passedTechniques: [] },
  { title: "B", status: "pending", passedTechniques: [] },
];

test("未通過時不會前進", () => {
  const result = applyAssessment(fresh(), 0, "feynman", false);
  assert.equal(result.advanced, false);
  assert.equal(result.currentIndex, 0);
  assert.deepEqual(result.concepts[0].passedTechniques, []);
});

test("同一種方法通過兩次仍不算掌握", () => {
  const first = applyAssessment(fresh(), 0, "feynman", true);
  const second = applyAssessment(first.concepts, 0, "feynman", true);
  assert.equal(second.advanced, false);
  assert.equal(second.concepts[0].status, "learning");
});

test("兩種不同方法都通過才前進到下一個概念", () => {
  const first = applyAssessment(fresh(), 0, "feynman", true);
  const second = applyAssessment(first.concepts, 0, "application", true);
  assert.equal(second.advanced, true);
  assert.equal(second.currentIndex, 1);
  assert.equal(second.concepts[0].status, "mastered");
  assert.equal(second.concepts[1].status, "learning");
  assert.equal(second.completed, false);
});

test("最後一個概念掌握後標記完成", () => {
  const concepts = fresh();
  concepts[0].status = "mastered";
  concepts[1].passedTechniques = ["feynman"];
  const result = applyAssessment(concepts, 1, "contrast", true);
  assert.equal(result.completed, true);
  assert.equal(result.currentIndex, 2);
});
