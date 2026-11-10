// 「確定理解才能往下」的判斷放在伺服器這一層，不交給模型決定。
// 同一個概念要用兩種不同方法各通過一次，避免背答案或重複同類題過關。
export const REQUIRED_PASSES = 2;

type ConceptLike<T extends string> = {
  status: "pending" | "learning" | "mastered";
  passedTechniques: T[];
};

export function applyAssessment<T extends string, C extends ConceptLike<T>>(
  concepts: C[],
  currentIndex: number,
  answeredTechnique: T,
  passed: boolean,
): { concepts: C[]; currentIndex: number; advanced: boolean; completed: boolean } {
  const next = concepts.map((concept) => ({ ...concept }));
  const current = next[currentIndex];
  if (!current) throw new Error("概念索引超出範圍");

  current.status = "learning";
  if (passed && !current.passedTechniques.includes(answeredTechnique)) {
    current.passedTechniques = [...current.passedTechniques, answeredTechnique];
  }

  if (current.passedTechniques.length < REQUIRED_PASSES) {
    return { concepts: next, currentIndex, advanced: false, completed: false };
  }

  current.status = "mastered";
  const nextIndex = currentIndex + 1;
  if (next[nextIndex]) next[nextIndex].status = "learning";
  return {
    concepts: next,
    currentIndex: nextIndex,
    advanced: true,
    completed: nextIndex >= next.length,
  };
}
