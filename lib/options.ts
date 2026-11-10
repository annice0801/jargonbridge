// 前後端共用的選項，新增程度或模式只要改這裡。
export const LEVELS = [
  { id: "kindergarten", label: "幼兒園", guide: "對象是幼兒園小朋友：句子極短，只用玩具、點心、遊戲這類生活比喻，完全不出現術語。" },
  { id: "elementary", label: "國小", guide: "對象是國小學生：用學校和日常生活舉例，句子簡單，遇到新詞馬上用例子解釋。" },
  { id: "junior", label: "國中", guide: "對象是國中生：可以有一點因果推理，用社團、考試、手遊當例子。" },
  { id: "senior", label: "高中", guide: "對象是高中生：可以用基礎數學與邏輯，說清楚原因和取捨。" },
  { id: "college", label: "大學", guide: "對象是非本科系的大學生：可以用抽象概念與少量術語，術語第一次出現要解釋。" },
  { id: "master", label: "碩士", guide: "對象是其他領域的碩士：可以談假設、限制、方法論與取捨，但還是講人話。" },
] as const;

export const TONES = [
  { id: "plain", label: "直白", guide: "像朋友當面解釋，平實直接。" },
  { id: "spicy", label: "辛辣", guide: "毒舌、一針見血，敢吐槽爛說法和常見迷思。只嗆概念和說法，不做人身攻擊。" },
  { id: "gossip", label: "八卦", guide: "茶水間爆料的口吻，像在講公司內幕，用「你知道嗎」帶入。口吻八卦但內容不得捏造，也不要虛構真實公司或人物的事蹟。" },
  { id: "story", label: "故事", guide: "用一個有角色和轉折的小故事帶出概念。" },
] as const;

export const CATEGORIES = [
  { id: "resume", label: "履歷" },
  { id: "project", label: "專案" },
  { id: "investment", label: "投資" },
  { id: "subject", label: "專業科目" },
  { id: "other", label: "其他" },
] as const;

export const ROLES = ["AI 工程師", "產品經理"] as const;

export type LevelId = (typeof LEVELS)[number]["id"];
export type ToneId = (typeof TONES)[number]["id"];
export type CategoryId = (typeof CATEGORIES)[number]["id"];
export type Style = { level: LevelId; tone: ToneId };

export const DEFAULT_STYLE: Style = { level: "college", tone: "plain" };

export const TECHNIQUES = {
  feynman: "費曼法",
  socratic: "蘇格拉底提問",
  retrieval: "主動回想",
  application: "情境應用",
  contrast: "比較辨析",
  mock_interview: "模擬面試",
} as const;

export type Technique = keyof typeof TECHNIQUES;

// 語意編譯器的溝通對象：同一件事講給不同人聽，重點和用詞都不同。
export const AUDIENCES = [
  { id: "interview", label: "面試回答", guide: "對象是面試官：要有結構、有取捨、有結果，經得起追問。" },
  { id: "sales_demo", label: "工程師向業務 Demo", guide: "對象是業務或客戶：少用技術名詞，把功能翻成客戶能感受的價值、使用情境和成效，技術細節只留一句佐證。" },
  { id: "managing_up", label: "向上管理匯報", guide: "對象是主管或高層：結論先行，接著講對營收、成本或時程的影響、風險，以及需要對方做的決定或資源。" },
  { id: "cross_team", label: "跨部門會議", guide: "對象是其他部門的同事：講清楚需要對方配合什麼、時間點和為什麼，避免只有自己部門懂的術語。" },
] as const;

export type AudienceId = (typeof AUDIENCES)[number]["id"];
