import type { CardStatus, KnowledgeCard, KnowledgeChapter } from "./types";

export type QueueItem = { card: KnowledgeCard; chapter: KnowledgeChapter };

export function allCards(chapters: KnowledgeChapter[]): QueueItem[] {
  return chapters.flatMap((chapter) => chapter.cards.map((card) => ({ card, chapter })));
}

export function deckStats(chapters: KnowledgeChapter[], progress: Record<string, CardStatus>) {
  const cards = allCards(chapters);
  const known = cards.filter(({ card }) => progress[card.id] === "known").length;
  return { total: cards.length, known, remaining: cards.length - known };
}

// 翻卡複習的順序：依脈絡順序；只看還不熟時跳過已會的，標成「還不熟」的排在沒看過的前面先複習。
export function studyQueue(
  chapters: KnowledgeChapter[],
  progress: Record<string, CardStatus>,
  onlyUnknown: boolean,
): QueueItem[] {
  const cards = allCards(chapters);
  if (!onlyUnknown) return cards;
  const pending = cards.filter(({ card }) => progress[card.id] !== "known");
  return [
    ...pending.filter(({ card }) => progress[card.id] === "learning"),
    ...pending.filter(({ card }) => progress[card.id] === undefined),
  ];
}
