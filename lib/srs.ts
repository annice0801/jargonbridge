// 間隔重複（SRS）：像 Anki 一樣依回答難易決定下次複習時間，貼近艾賓浩斯遺忘曲線。
// 純函式、不讀系統時間：前端按下去立刻換卡，伺服器再用同一套規則存檔。

export type Grade = "again" | "good" | "easy";

export type SrsState = {
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
  dueAt: string;
  reviewCount: number;
};

export const AGAIN_MINUTES = 10;
export const FIRST_GOOD_DAYS = 1;
export const FIRST_EASY_DAYS = 4;
export const MASTERED_DAYS = 21;
export const DAILY_CAPSULES = 5;

const MINUTE = 60 * 1000;
const DAY = 24 * 60 * MINUTE;

export function newSrsState(now: Date): SrsState {
  return { intervalDays: 0, ease: 2.5, reps: 0, lapses: 0, dueAt: now.toISOString(), reviewCount: 0 };
}

export function schedule(state: SrsState, grade: Grade, now: Date): SrsState {
  const reviewCount = state.reviewCount + 1;
  if (grade === "again") {
    // 仍會結巴：十分鐘後重來，間隔歸零，記一次遺忘。
    return {
      intervalDays: 0,
      ease: Math.max(1.3, +(state.ease - 0.2).toFixed(2)),
      reps: 0,
      lapses: state.lapses + 1,
      dueAt: new Date(now.getTime() + AGAIN_MINUTES * MINUTE).toISOString(),
      reviewCount,
    };
  }
  const ease = grade === "easy" ? +(state.ease + 0.15).toFixed(2) : state.ease;
  let intervalDays: number;
  if (state.reps === 0) {
    intervalDays = grade === "easy" ? FIRST_EASY_DAYS : FIRST_GOOD_DAYS;
  } else {
    const grown = state.intervalDays * ease * (grade === "easy" ? 1.3 : 1);
    intervalDays = Math.max(state.intervalDays + 1, Math.round(grown));
  }
  intervalDays = Math.min(intervalDays, 365);
  return {
    intervalDays,
    ease,
    reps: state.reps + 1,
    lapses: state.lapses,
    dueAt: new Date(now.getTime() + intervalDays * DAY).toISOString(),
    reviewCount,
  };
}

export function formatWait(state: SrsState, grade: Grade, now: Date): string {
  const next = schedule(state, grade, now);
  if (grade === "again") return `${AGAIN_MINUTES} 分鐘`;
  return next.intervalDays >= 30 ? `${Math.round(next.intervalDays / 30)} 個月` : `${next.intervalDays} 天`;
}

export const isMastered = (state: SrsState) => state.intervalDays >= MASTERED_DAYS;
export const isDue = (state: SrsState, now: Date) => new Date(state.dueAt).getTime() <= now.getTime();

export function dueQueue<T extends SrsState>(cards: T[], now: Date): T[] {
  return cards.filter((card) => isDue(card, now)).sort((a, b) => a.dueAt.localeCompare(b.dueAt));
}

// 今日膠囊：到期的卡裡，最常卡住、拖最久的先上，每天最多 5 張。
export function dailyCapsules<T extends SrsState>(cards: T[], now: Date, size = DAILY_CAPSULES): T[] {
  return cards
    .filter((card) => isDue(card, now))
    .sort((a, b) => b.lapses - a.lapses || a.dueAt.localeCompare(b.dueAt))
    .slice(0, size);
}

export function requeue<T>(queue: T[], index: number, gap = 3): T[] {
  if (index < 0 || index >= queue.length) return queue;
  const next = [...queue];
  const [card] = next.splice(index, 1);
  next.splice(Math.min(next.length, index + gap), 0, card);
  return next;
}

// 盲抽：間隔越短（越不熟）越容易抽到。
export const drawWeight = (state: SrsState) => 1 + 6 / (1 + state.intervalDays) + state.lapses;

export function drawWeighted<T extends SrsState & { id: string }>(cards: T[], random: () => number, excludeId?: string): T | undefined {
  const pool = cards.length > 1 && excludeId ? cards.filter((card) => card.id !== excludeId) : cards;
  const total = pool.reduce((sum, card) => sum + drawWeight(card), 0);
  let pick = random() * total;
  for (const card of pool) {
    pick -= drawWeight(card);
    if (pick < 0) return card;
  }
  return pool.at(-1);
}

// 每日打卡：當天複習滿 5 次算完成。連續天數算到今天；今天還沒完成時，從昨天往回算，不會一早就歸零。
export function streakDays(doneDays: string[], today: string): number {
  const done = new Set(doneDays);
  const cursor = new Date(`${today}T00:00:00Z`);
  if (!done.has(today)) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let count = 0;
  while (done.has(cursor.toISOString().slice(0, 10))) {
    count++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return count;
}
