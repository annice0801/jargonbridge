import assert from "node:assert/strict";
import test from "node:test";
import { markdownDownload, noteToMarkdown, trackToMarkdown } from "../lib/markdown.ts";

const base = { id: "1", title: "標題", kind: "translation", plain: "白話", professional: "術語", betterAnswer: "", note: "", targetRole: "PM", sourceRef: "", createdAt: "2026-11-02T00:00:00.000Z", updatedAt: "2026-11-02T00:00:00.000Z" };

test("筆記只輸出有內容的段落", () => {
  const md = noteToMarkdown(base);
  assert.match(md, /## 標題/);
  assert.match(md, /即時翻譯 · PM · 2026-11-02/);
  assert.match(md, /### 大白話/);
  assert.doesNotMatch(md, /更好的回應方式|我的筆記/);
});

test("學習紀錄依概念分組並標示狀態", () => {
  const turn = { technique: "feynman", coachMessage: "回饋", plain: "p", professional: "q", betterAnswer: "b", question: "下一題內容", assessment: { evaluated: true, passed: false, score: 55, evidence: "依據", gaps: ["缺口"] } };
  const md = trackToMarkdown({ title: "路徑", targetRole: "PM", concepts: [{ id: "a", title: "概念A", why: "原因", status: "mastered", passedTechniques: [] }, { id: "b", title: "概念B", why: "原因", status: "pending", passedTechniques: [] }], messages: [{ id: "m1", conceptId: "a", role: "user", text: "我的話", at: "" }, { id: "m2", conceptId: "a", role: "coach", turn, at: "" }] });
  assert.match(md, /## 概念A（已掌握）/);
  assert.match(md, /## 概念B（未開始）/);
  assert.match(md, /我的話/);
  assert.match(md, /評估：還沒通過（55 分）/);
  assert.match(md, /- 缺口/);
});

test("下載檔名會去掉路徑字元且支援中文", () => {
  const header = markdownDownload("x", '../../我的:筆記"\r\nInjected: 1').headers.get("content-disposition");
  assert.doesNotMatch(header, /[\r\n]/);
  assert.doesNotMatch(decodeURIComponent(header), /[/:"]筆記|\.\.\/\.\.\//);
  assert.match(decodeURIComponent(header), /我的 筆記/);
});

import { analysisToMarkdown } from "../lib/markdown.ts";

test("專家解析標出每點的依據，教練才分得出推斷和事實", () => {
  const md = analysisToMarkdown("作品集", {
    oneLiner: "一句話",
    slides: [
      {
        id: "s1",
        kind: "star",
        title: "會員系統",
        takeaway: "結論",
        plain: "比喻",
        points: [
          { text: "負責 PRD", basis: "stated", evidence: "原文" },
          { text: "可能用 RICE 排序", basis: "inferred", evidence: "" },
          { text: "缺轉換率數字", basis: "missing", evidence: "" },
        ],
        diagram: { kind: "flow", title: "流程", nodes: [{ id: "1", parentId: "", label: "收集", note: "" }], columns: [] },
      },
    ],
  });
  assert.match(md, /## STAR：會員系統/);
  assert.match(md, /【資料寫明】負責 PRD（依據：原文）/);
  assert.match(md, /【專家推斷，需你確認】可能用 RICE 排序/);
  assert.match(md, /【建議補充】缺轉換率數字/);
  assert.match(md, /流程：\n1\. 收集/);
});
