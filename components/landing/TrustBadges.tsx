// 只列出目前確實做到的事。零資料保留（ZDR）與 SOC 2 需要和 Anthropic 簽約、通過第三方稽核才能宣稱，達成前不要加上。
const BADGES = [
  { label: "BYOK", detail: "API 金鑰只存在你的瀏覽器，伺服器不保存" },
  { label: "帳號隔離", detail: "資料只有你看得到，可隨時刪除" },
  { label: "不拿你的資料訓練模型", detail: "" },
];

export function TrustBadges({ extra, tone = "light", stacked }: { extra?: string; tone?: "light" | "dark"; stacked?: boolean }) {
  const items = extra ? [{ label: extra, detail: "" }, ...BADGES] : BADGES;
  return (
    <ul className={stacked ? "space-y-2.5" : "flex flex-wrap gap-2"}>
      {items.map((badge) => (
        <li
          key={badge.label}
          className={
            stacked
              ? "flex items-start gap-2 text-sm text-washi/75"
              : `flex items-center gap-1.5 rounded-full px-3 py-1 text-xs backdrop-blur-sm ${
                  tone === "dark" ? "bg-washi/10 text-washi/80 ring-1 ring-washi/20" : "bg-white/55 text-sumi ring-1 ring-sumi/10"
                }`
          }
        >
          <span aria-hidden className={`shrink-0 rounded-full bg-emerald-500 ${stacked ? "mt-2 size-1.5" : "size-1.5"}`} />
          <span>
            {badge.label}
            {badge.detail && <span className={stacked ? "block text-xs text-washi/45" : `hidden sm:inline ${tone === "dark" ? "text-washi/50" : "text-stone-mute"}`}>{stacked ? badge.detail : `・${badge.detail}`}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
