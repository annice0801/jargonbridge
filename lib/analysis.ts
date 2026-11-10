import type { PointBasis, SlideKind } from "./types";

export const SLIDE_LABEL: Record<SlideKind, string> = {
  overview: "專案總覽",
  architecture: "架構與工法",
  star: "STAR",
  decisions: "PRD 與關鍵決策",
  metrics: "成果與 KPI",
  prioritization: "優先排序框架",
  roadmap: "Product Roadmap",
  data: "資料架構",
  robustness: "穩健度評估",
  interview: "面試追問",
};

export const BASIS_LABEL: Record<PointBasis, string> = {
  stated: "資料寫明",
  inferred: "專家推斷，需你確認",
  missing: "建議補充",
};
