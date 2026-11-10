import Link from "next/link";
import { TrustBadges } from "./TrustBadges";

const NAV = [
  { href: "/", label: "首頁" },
  { href: "/#method", label: "運作方式" },
  { href: "/try", label: "免登入體驗" },
];

// 捲動時固定在頂端的半透明頁首，背景模糊，內容從下面滑過時仍看得清楚文字。
export function SiteHeader({ current }: { current?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-sumi/10 bg-washi/75 backdrop-blur-md supports-[backdrop-filter]:bg-washi/60">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-6 sm:px-10 lg:px-16">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="font-latin text-xl tracking-[0.06em]">JargonBridge</span>
          <span className="hidden text-[11px] tracking-[0.2em] text-stone-mute md:inline">ALIGNMENT COPILOT</span>
        </Link>
        <nav aria-label="主要" className="flex items-center gap-1 sm:gap-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current === item.href ? "page" : undefined}
              className={`hidden rounded-full px-3 py-1.5 text-sm transition-colors sm:inline-block ${
                current === item.href ? "bg-sumi/[0.06] text-sumi" : "text-sumi/70 hover:text-sumi"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link href="/coach" className="ml-1 rounded-full bg-sumi px-4 py-2 text-sm tracking-[0.08em] text-washi transition-colors hover:bg-rust">
            進入工作台
          </Link>
        </nav>
      </div>
    </header>
  );
}

const FOOTER_LINKS = [
  {
    title: "產品",
    links: [
      { href: "/try", label: "免登入體驗" },
      { href: "/#method", label: "運作方式" },
      { href: "/coach", label: "工作台" },
    ],
  },
  {
    title: "工作台功能",
    links: [
      { href: "/coach", label: "語意編譯器" },
      { href: "/coach", label: "PRD / Jira 規格" },
      { href: "/coach", label: "Pocket 間隔複習" },
      { href: "/coach", label: "學習教練" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="sumi-ground text-washi">
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-16 sm:px-10 md:grid-cols-12 lg:px-16">
        <div className="md:col-span-5">
          <p className="font-latin text-2xl tracking-[0.06em]">JargonBridge</p>
          <p className="mt-2 text-xs tracking-[0.2em] text-washi/50">COMMUNICATION &amp; ALIGNMENT COPILOT</p>
          <p className="mt-6 max-w-sm text-sm leading-[2] text-washi/70">
            讓工程、產品、業務與管理者講同一種語言。把想法編譯成對方聽得懂、聽得進去的說法，再把客戶的需求整理成團隊可以直接開工的規格。
          </p>
        </div>
        {FOOTER_LINKS.map((group) => (
          <div key={group.title} className="md:col-span-2">
            <p className="text-xs tracking-[0.25em] text-washi/45">{group.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {group.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-washi/75 transition-colors hover:text-washi">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="md:col-span-3">
          <p className="text-xs tracking-[0.25em] text-washi/45">資料與隱私</p>
          <div className="mt-4">
            <TrustBadges tone="dark" stacked />
          </div>
        </div>
      </div>
      <div className="border-t border-washi/10">
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-xs text-washi/40 sm:px-10 lg:px-16">
          <span>© JargonBridge</span>
          <span className="font-latin tracking-[0.12em]">Say it once. Say it right.</span>
        </div>
      </div>
    </footer>
  );
}
