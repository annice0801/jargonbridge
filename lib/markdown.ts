import { BASIS_LABEL, SLIDE_LABEL } from "./analysis.ts";
import { diagramToLines } from "./terms.ts";
import type { Deck, Note, ProjectAnalysis, Track } from "./types";

// 下載用的 Markdown 排版，內容與資料庫分開，之後要加其他格式也只改這裡。
const KIND_LABEL = { coach: "學習教練", translation: "即時翻譯", manual: "手寫筆記", term: "必知詞彙" } as const;

const section = (heading: string, body: string) => (body.trim() ? `### ${heading}\n\n${body.trim()}\n` : "");
const day = (iso: string) => iso.slice(0, 10);

export function noteToMarkdown(note: Note): string {
  const meta = [KIND_LABEL[note.kind], note.targetRole, day(note.createdAt)].filter(Boolean).join(" · ");
  return [
    `## ${note.title}`,
    `> ${meta}\n`,
    section("大白話", note.plain),
    section("大廠術語", note.professional),
    section("更好的回應方式", note.betterAnswer),
    note.diagram ? section(note.diagram.title || "圖解", diagramToLines(note.diagram).join("\n")) : "",
    section("我的筆記", note.note),
  ]
    .filter(Boolean)
    .join("\n");
}

export function notesToMarkdown(notes: Note[]): string {
  return `# JargonBridge 筆記\n\n${notes.map(noteToMarkdown).join("\n---\n\n")}`;
}

const STATUS_LABEL = { known: "會了", learning: "還不熟" } as const;

// 也會存成一筆資料來源，讓學習教練拿來教。標註依據，教練才分得出哪些是推斷。
export function analysisToMarkdown(title: string, analysis: ProjectAnalysis): string {
  const parts = [`# 專家解析：${title}`, `${analysis.oneLiner}\n`];
  for (const slide of analysis.slides) {
    parts.push(`## ${SLIDE_LABEL[slide.kind]}：${slide.title}`, `**結論：**${slide.takeaway}\n`, `**給新手的比喻：**${slide.plain}\n`);
    for (const point of slide.points) {
      parts.push(`- 【${BASIS_LABEL[point.basis]}】${point.text}${point.evidence ? `（依據：${point.evidence}）` : ""}`);
    }
    const diagram = diagramToLines(slide.diagram);
    if (diagram.length) parts.push(`\n${slide.diagram.title || "圖解"}：\n${diagram.join("\n")}`);
    parts.push("");
  }
  return parts.join("\n");
}

export function deckToMarkdown(deck: Deck): string {
  const parts = [`# ${deck.title}`, `> 知識卡 · 目標職位：${deck.targetRole}\n`];
  if (deck.analysis) parts.push(analysisToMarkdown(deck.title, deck.analysis).replace(/^# /, "## ").replace(/\n## /g, "\n### "), "\n# 知識卡\n");
  for (const chapter of deck.chapters) {
    parts.push(`## ${chapter.title}`, `${chapter.story}\n`);
    for (const card of chapter.cards) {
      const status = deck.progress[card.id];
      parts.push(
        `### ${card.term}${status ? `（${STATUS_LABEL[status]}）` : ""}\n`,
        section("白話", card.plain).replace("### ", "#### "),
        section("舉例", card.example).replace("### ", "#### "),
        section("在你的資料裡", card.inContext).replace("### ", "#### "),
        section("大廠說法", card.definition).replace("### ", "#### "),
        card.related.length ? `相關：${card.related.join("、")}\n` : "",
      );
    }
  }
  return parts.filter(Boolean).join("\n");
}

export function trackToMarkdown(track: Track): string {
  const parts = [`# ${track.title}`, `> 目標職位：${track.targetRole}\n`];
  for (const concept of track.concepts) {
    const status = concept.status === "mastered" ? "已掌握" : concept.status === "learning" ? "學習中" : "未開始";
    parts.push(`## ${concept.title}（${status}）`, `${concept.why}\n`);
    for (const message of track.messages.filter((item) => item.conceptId === concept.id)) {
      if (message.role === "user") {
        parts.push(`### 我的回答\n\n${message.text}\n`);
        continue;
      }
      const { turn } = message;
      if (turn.assessment.evaluated) {
        const verdict = turn.assessment.passed ? "通過" : "還沒通過";
        const gaps = turn.assessment.gaps.map((gap) => `- ${gap}`).join("\n");
        parts.push(`### 評估：${verdict}（${turn.assessment.score} 分）\n\n${[turn.assessment.evidence, gaps].filter(Boolean).join("\n\n")}\n`);
      }
      parts.push(
        section("教練", turn.coachMessage),
        section("大白話", turn.plain),
        section("大廠術語", turn.professional),
        section(turn.assessment.evaluated ? "你的回答可以這樣修" : "示範回答", turn.betterAnswer),
        section("注意：必知詞彙", (turn.terms ?? []).map((item) => `- ${item.term}：${item.meaning}`).join("\n")),
        section("下一題", turn.question),
      );
    }
  }
  return parts.filter(Boolean).join("\n");
}

function fileDownload(body: BodyInit, filename: string, extension: string, contentType: string): Response {
  const safe = filename.replace(/[\\/:*?"<>|\r\n]+/g, " ").trim().slice(0, 80) || "jargonbridge";
  return new Response(body, {
    headers: {
      "content-type": contentType,
      "content-disposition": `attachment; filename="jargonbridge.${extension}"; filename*=UTF-8''${encodeURIComponent(safe)}.${extension}`,
    },
  });
}

export function markdownDownload(markdown: string, filename: string): Response {
  return fileDownload(markdown, filename, "md", "text/markdown; charset=utf-8");
}

export function pdfDownload(pdf: Uint8Array<ArrayBuffer>, filename: string): Response {
  return fileDownload(pdf, filename, "pdf", "application/pdf");
}
