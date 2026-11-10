import type { SpecDoc } from "./db";
import type { Spec, SpecRecord } from "./types";

export function toSpecRecord(doc: SpecDoc): SpecRecord {
  return { id: doc._id.toString(), title: doc.title, input: doc.input, audience: doc.audience, spec: doc.spec, createdAt: doc.createdAt.toISOString() };
}

const IMPACT = { high: "高", medium: "中", low: "低" } as const;

// 匯出成 Markdown：Jira、Confluence、Notion、GitHub 都能直接貼上。
export function specToMarkdown(spec: Spec): string {
  const list = (items: string[]) => (items.length ? items.map((item) => `- ${item}`).join("\n") : "- 無");
  const stories = spec.userStories
    .map((story, index) => {
      const criteria = story.acceptanceCriteria
        .map((item) => `  - [ ] **Given** ${item.given}，**When** ${item.when}，**Then** ${item.then}`)
        .join("\n");
      return `### Story ${index + 1}（${story.priority}）\n身為 **${story.role}**，我想要 **${story.goal}**，以便 **${story.benefit}**。\n\n驗收標準（Acceptance Criteria）：\n${criteria}`;
    })
    .join("\n\n");
  const risks = spec.technicalRisks.length
    ? `| 風險 | 影響 | 降低風險的做法 |\n| --- | --- | --- |\n${spec.technicalRisks.map((item) => `| ${item.risk} | ${IMPACT[item.impact]} | ${item.mitigation} |`).join("\n")}`
    : "- 無";
  return `# ${spec.title}

> ${spec.summary}

## 背景與客戶痛點
${spec.background}

## User Stories
${stories}

## 完成定義（Definition of Done）
${list(spec.definitionOfDone)}

## 非功能需求
${list(spec.nonFunctional)}

## 技術風險提示
${risks}

## 這次不做（Out of Scope）
${list(spec.outOfScope)}

## 開工前要確認的問題
${list(spec.openQuestions)}
`;
}
