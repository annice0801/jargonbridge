// 行話油膩偵測：在本機即時比對，不必呼叫 AI，打字當下就能亮黃燈。

export const BUZZWORD_WARNING = "此詞在大廠面試容易引發反感，建議替換為具體動作動詞";

export type Buzzword = { word: string; instead: string };

export const BUZZWORDS: Buzzword[] = [
  { word: "賦能", instead: "說清楚給了誰什麼工具或權限，例如「讓客服能直接查訂單狀態」" },
  { word: "抓手", instead: "說具體從哪個指標或環節下手，例如「先從退貨率最高的品類改」" },
  { word: "閉環", instead: "說誰在什麼時候確認結果，例如「每週回看修正後的轉換率」" },
  { word: "打通", instead: "說串接了哪兩個系統、資料怎麼流" },
  { word: "拉通", instead: "說找了哪些人、對齊了哪個決定" },
  { word: "顆粒度", instead: "說細到什麼程度，例如「拆到每個頁面、每個按鈕」" },
  { word: "沉澱", instead: "說留下了什麼文件、範本或流程" },
  { word: "底層邏輯", instead: "直接講原因" },
  { word: "組合拳", instead: "列出實際做的兩三件事" },
  { word: "心智", instead: "說使用者實際怎麼想、怎麼做" },
  { word: "賽道", instead: "說市場或產品類別" },
  { word: "鏈路", instead: "說流程的哪幾個步驟" },
  { word: "對標", instead: "說跟哪個產品比、比什麼指標" },
  { word: "倒逼", instead: "說哪個限制促成了什麼改變" },
  { word: "降本增效", instead: "分開說省了多少成本、快了多少時間" },
  { word: "頂層設計", instead: "說整體架構或計畫的具體內容" },
  { word: "助力", instead: "說它具體改變了什麼結果" },
  { word: "深耕", instead: "說做了多久、做了哪些事" },
  { word: "全方位", instead: "列出實際涵蓋的範圍" },
  { word: "極致", instead: "給出具體標準或數字" },
  { word: "顛覆", instead: "說跟原本的做法差在哪裡" },
  { word: "協同效應", instead: "說兩個團隊或產品一起帶來什麼可量測的結果" },
  { word: "綜上所述", instead: "直接講結論" },
  { word: "值得注意的是", instead: "直接講重點" },
  { word: "synergy", instead: "說合作帶來的具體結果" },
];

export type BuzzwordHit = Buzzword & { count: number };

export function detectBuzzwords(text: string): BuzzwordHit[] {
  const lower = text.toLowerCase();
  return BUZZWORDS.map((item) => ({ ...item, count: lower.split(item.word.toLowerCase()).length - 1 })).filter((item) => item.count > 0);
}

// 即時油膩指數 0 到 100：依空洞詞彙的密度估算，只當作打字時的提醒，正式評分以 AI 分析為準。
export function cringeIndex(text: string): number {
  const length = text.replace(/\s/g, "").length;
  if (length === 0) return 0;
  const hits = detectBuzzwords(text).reduce((sum, item) => sum + item.count, 0);
  if (hits === 0) return 0;
  return Math.min(100, Math.round(18 + hits * 22 + (hits / length) * 900));
}
