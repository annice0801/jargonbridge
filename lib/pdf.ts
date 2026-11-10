import path from "node:path";
import PDFDocument from "pdfkit";
import { BASIS_LABEL, SLIDE_LABEL } from "./analysis";
import { TECHNIQUES } from "./options";
import { diagramToLines } from "./terms";
import type { Deck, Note, Track } from "./types";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const REGULAR = path.join(FONT_DIR, "NotoSansTC-Regular.ttf");
const BOLD = path.join(FONT_DIR, "NotoSansTC-Bold.ttf");

const COLOR = {
  ink: "#1c1917",
  mute: "#78716c",
  rule: "#d6d3d1",
  user: "#44403c",
  plain: "#92400e",
  pro: "#3730a3",
  better: "#065f46",
  term: "#9f1239",
  pass: "#047857",
  fail: "#c2410c",
};

const KIND_LABEL = { coach: "學習教練", translation: "即時翻譯", manual: "手寫筆記", term: "必知詞彙" } as const;

type Doc = InstanceType<typeof PDFDocument>;

function createDoc(title: string): Doc {
  return new PDFDocument({
    size: "A4",
    margins: { top: 56, bottom: 64, left: 56, right: 56 },
    bufferPages: true,
    lang: "zh-TW",
    info: { Title: title, Creator: "JargonBridge" },
  });
}

const contentWidth = (doc: Doc) => doc.page.width - doc.page.margins.left - doc.page.margins.right;
const bottomLimit = (doc: Doc) => doc.page.height - doc.page.margins.bottom;

// 剩下的空間放不下標題加幾行內文時先換頁，避免標題孤零零留在頁尾。
function keepWithNext(doc: Doc, space: number) {
  if (doc.y + space > bottomLimit(doc)) doc.addPage();
}

function heading(doc: Doc, text: string, size: number, gapBefore: number) {
  keepWithNext(doc, gapBefore + size * 4);
  doc.y += gapBefore;
  doc.font(BOLD).fontSize(size).fillColor(COLOR.ink).text(text, doc.page.margins.left, doc.y, { width: contentWidth(doc), lineGap: 3 });
}

function rule(doc: Doc) {
  doc.moveDown(0.4);
  doc.moveTo(doc.page.margins.left, doc.y).lineTo(doc.page.width - doc.page.margins.right, doc.y).lineWidth(0.6).strokeColor(COLOR.rule).stroke();
  doc.moveDown(0.5);
}

function block(doc: Doc, label: string, color: string, body: string, indent = 0) {
  const text = body.trim();
  if (!text) return;
  const left = doc.page.margins.left + indent;
  const width = contentWidth(doc) - indent;
  keepWithNext(doc, 64);
  doc.y += 8;
  doc.font(BOLD).fontSize(9).fillColor(color).text(label, left, doc.y, { width });
  doc.y += 2;
  doc.font(REGULAR).fontSize(10.5).fillColor(COLOR.ink).text(text, left, doc.y, { width, lineGap: 3.5 });
}

// 所有內容排完才知道總頁數，最後一次補上頁碼。寫頁尾時要暫時拿掉下邊界，否則會自動多一頁。
function addPageNumbers(doc: Doc) {
  const { start, count } = doc.bufferedPageRange();
  for (let index = 0; index < count; index++) {
    doc.switchToPage(start + index);
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font(REGULAR).fontSize(8).fillColor(COLOR.mute).text(
      `JargonBridge · ${index + 1} / ${count}`,
      doc.page.margins.left,
      doc.page.height - 40,
      { width: contentWidth(doc), align: "center", lineBreak: false },
    );
    doc.page.margins.bottom = bottom;
  }
}

function finish(doc: Doc): Promise<Uint8Array<ArrayBuffer>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    doc.on("error", reject);
    addPageNumbers(doc);
    doc.end();
  });
}

function meta(doc: Doc, text: string) {
  doc.font(REGULAR).fontSize(9).fillColor(COLOR.mute).text(text, doc.page.margins.left, doc.y, { width: contentWidth(doc) });
}

export function trackToPdf(track: Track): Promise<Uint8Array<ArrayBuffer>> {
  const doc = createDoc(track.title);
  doc.font(BOLD).fontSize(20).fillColor(COLOR.ink).text(track.title, { lineGap: 4 });
  const mastered = track.concepts.filter((concept) => concept.status === "mastered").length;
  meta(doc, `目標職位：${track.targetRole} · 已掌握 ${mastered} / ${track.concepts.length} 個概念`);

  track.concepts.forEach((concept, index) => {
    const status = concept.status === "mastered" ? "已掌握" : concept.status === "learning" ? "學習中" : "未開始";
    heading(doc, `${index + 1}. ${concept.title}`, 14, 22);
    meta(doc, `${status} · ${concept.why}`);
    rule(doc);

    const messages = track.messages.filter((message) => message.conceptId === concept.id);
    if (messages.length === 0) meta(doc, "尚無對話紀錄");

    for (const message of messages) {
      if (message.role === "user") {
        block(doc, "我的回答", COLOR.user, message.text, 18);
        continue;
      }
      const { turn } = message;
      if (turn.assessment.evaluated) {
        const { passed, score, evidence, gaps } = turn.assessment;
        const detail = [evidence, ...gaps.map((gap) => `・${gap}`)].filter(Boolean).join("\n");
        block(doc, `評估：${passed ? "通過" : "還沒通過"}（${score} 分）`, passed ? COLOR.pass : COLOR.fail, detail || " ");
      }
      block(doc, "教練", COLOR.ink, turn.coachMessage);
      block(doc, "大白話", COLOR.plain, turn.plain);
      block(doc, "大廠術語", COLOR.pro, turn.professional);
      block(doc, turn.assessment.evaluated ? "你的回答可以這樣修" : "示範回答", COLOR.better, turn.betterAnswer);
      block(doc, "注意：必知詞彙", COLOR.term, (turn.terms ?? []).map((item) => `・${item.term}：${item.meaning}`).join("\n"));
      block(doc, `下一題（${TECHNIQUES[turn.technique]}）`, COLOR.ink, turn.question);
    }
  });
  return finish(doc);
}

export function deckToPdf(deck: Deck): Promise<Uint8Array<ArrayBuffer>> {
  const doc = createDoc(deck.title);
  doc.font(BOLD).fontSize(20).fillColor(COLOR.ink).text(deck.title, { lineGap: 4 });
  const cards = deck.chapters.flatMap((chapter) => chapter.cards);
  const known = cards.filter((card) => deck.progress[card.id] === "known").length;
  meta(doc, `知識卡 · 目標職位：${deck.targetRole} · 已會 ${known} / ${cards.length} 張`);

  if (deck.analysis) {
    heading(doc, "專家解析", 16, 22);
    meta(doc, deck.analysis.oneLiner);
    rule(doc);
    deck.analysis.slides.forEach((slide, index) => {
      heading(doc, `${index + 1}. ${SLIDE_LABEL[slide.kind]}：${slide.title}`, 13, 16);
      block(doc, "專家結論", COLOR.pro, slide.takeaway);
      block(doc, "給新手的比喻", COLOR.plain, slide.plain);
      const points = slide.points
        .map((point) => `【${BASIS_LABEL[point.basis]}】${point.text}${point.evidence ? `\n　依據：${point.evidence}` : ""}`)
        .join("\n");
      block(doc, "重點", COLOR.ink, points);
      const diagram = diagramToLines(slide.diagram);
      if (diagram.length) block(doc, slide.diagram.title || "圖解", COLOR.term, diagram.join("\n"));
    });
    doc.addPage();
    doc.font(BOLD).fontSize(16).fillColor(COLOR.ink).text("知識卡", { lineGap: 4 });
  }

  deck.chapters.forEach((chapter, index) => {
    heading(doc, `${index + 1}. ${chapter.title}`, 14, 22);
    rule(doc);
    block(doc, "脈絡", COLOR.plain, chapter.story);
    for (const card of chapter.cards) {
      const status = deck.progress[card.id];
      heading(doc, `${card.term}${status === "known" ? "（會了）" : status === "learning" ? "（還不熟）" : ""}`, 12, 14);
      block(doc, "白話", COLOR.plain, card.plain, 12);
      block(doc, "舉例", COLOR.better, card.example, 12);
      block(doc, "在你的資料裡", COLOR.user, card.inContext, 12);
      block(doc, "大廠說法", COLOR.pro, card.definition, 12);
      if (card.related.length) block(doc, "相關詞", COLOR.term, card.related.join("、"), 12);
    }
  });
  return finish(doc);
}

function writeNote(doc: Doc, note: Note) {
  heading(doc, note.title, 15, 18);
  const date = note.createdAt.slice(0, 10);
  meta(doc, [KIND_LABEL[note.kind], note.targetRole, date].filter(Boolean).join(" · "));
  rule(doc);
  block(doc, "大白話", COLOR.plain, note.plain);
  block(doc, "大廠術語", COLOR.pro, note.professional);
  block(doc, "更好的回應方式", COLOR.better, note.betterAnswer);
  if (note.diagram) block(doc, note.diagram.title || "圖解", COLOR.term, diagramToLines(note.diagram).join("\n"));
  block(doc, "我的筆記", COLOR.ink, note.note);
}

export function notesToPdf(notes: Note[], title: string): Promise<Uint8Array<ArrayBuffer>> {
  const doc = createDoc(title);
  // 單篇的標題就是筆記標題，不用再印一次。
  if (notes.length !== 1) doc.font(BOLD).fontSize(20).fillColor(COLOR.ink).text(title, { lineGap: 4 });
  if (notes.length === 0) meta(doc, "目前沒有筆記");
  notes.forEach((note) => writeNote(doc, note));
  return finish(doc);
}
