import assert from "node:assert/strict";
import test from "node:test";
import { cringeIndex, detectBuzzwords } from "../lib/buzzwords.ts";

test("抓出空洞詞彙與次數", () => {
  const hits = detectBuzzwords("我們要賦能業務，找到抓手，再賦能客服");
  assert.deepEqual(hits.map((hit) => [hit.word, hit.count]), [["賦能", 2], ["抓手", 1]]);
});

test("沒有空洞詞彙時油膩指數為 0，越多越高", () => {
  assert.equal(cringeIndex("我把結帳頁的載入時間從 3 秒降到 1 秒"), 0);
  const one = cringeIndex("這次專案我們打通了資料，讓客服能直接查訂單狀態，也整理了交接文件");
  const many = cringeIndex("賦能抓手閉環打通");
  assert.ok(one > 0 && one < many);
  assert.ok(many <= 100);
});
