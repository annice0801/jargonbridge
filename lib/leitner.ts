// Leitner 間隔複習：卡片放在 1 到 5 號盒，盒號越大越久才再出現。
// 純函式、不讀系統時間，前端可以立即套用（不用等伺服器），伺服器再用同一套規則存檔。

export type Feedback = "review" | "mastered";

export type LeitnerState = {
  box: number;
  mastered: boolean;
  dueAt: string;
  reviewCount: number;
};

// 依盒號決定下次出現要隔幾天，間隔大約倍增，接近艾賓浩斯遺忘曲線的複習點。
export const BOX_DAYS = [0, 0, 1, 3, 7, 21] as const;
export const MAX_BOX = 5;

const DAY = 24 * 60 * 60 * 1000;

export function newState(now: Date): LeitnerState {
  return { box: 1, mastered: false, dueAt: now.toISOString(), reviewCount: 0 };
}

export function applyFeedback(state: LeitnerState, feedback: Feedback, now: Date): LeitnerState {
  const reviewCount = state.reviewCount + 1;
  if (feedback === "review") {
    // 回到第 1 盒，當下就要再練。
    return { box: 1, mastered: false, dueAt: now.toISOString(), reviewCount };
  }
  const box = Math.min(MAX_BOX, Math.max(2, state.box + 1));
  return { box, mastered: true, dueAt: new Date(now.getTime() + BOX_DAYS[box] * DAY).toISOString(), reviewCount };
}

export const isDue = (state: LeitnerState, now: Date) => new Date(state.dueAt).getTime() <= now.getTime();

// 今天要複習的：到期的卡，盒號小（越不熟）的先出。
export function dueQueue<T extends LeitnerState>(cards: T[], now: Date): T[] {
  return cards
    .filter((card) => isDue(card, now))
    .sort((a, b) => a.box - b.box || a.dueAt.localeCompare(b.dueAt));
}

// 按「再複習」的卡往後插幾張，同一輪內會再出現一次。
export function requeue<T>(queue: T[], index: number, gap = 3): T[] {
  if (index < 0 || index >= queue.length) return queue;
  const next = [...queue];
  const [card] = next.splice(index, 1);
  next.splice(Math.min(next.length, index + gap), 0, card);
  return next;
}

// 盲抽：越不熟抽中機率越高，已掌握的仍會偶爾抽到。
export const drawWeight = (state: LeitnerState) => (state.mastered ? 1 : 1 + MAX_BOX - state.box) * (state.box === 1 ? 2 : 1);

export function drawWeighted<T extends LeitnerState & { id: string }>(
  cards: T[],
  random: () => number,
  excludeId?: string,
): T | undefined {
  const pool = cards.length > 1 && excludeId ? cards.filter((card) => card.id !== excludeId) : cards;
  const total = pool.reduce((sum, card) => sum + drawWeight(card), 0);
  let pick = random() * total;
  for (const card of pool) {
    pick -= drawWeight(card);
    if (pick < 0) return card;
  }
  return pool.at(-1);
}
