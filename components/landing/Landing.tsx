import { Cormorant_Garamond, Noto_Serif_TC } from "next/font/google";
import Link from "next/link";
import { Bridge, Enso, Filters, KintsugiBowl, Mountain } from "./Art";
import { ParallaxEffects } from "./ParallaxEffects";
import { Snowfall } from "./Snowfall";
import { SiteFooter } from "./SiteChrome";
import { VoiceSwitcher } from "./VoiceSwitcher";
import "./landing.css";

const serifTc = Noto_Serif_TC({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-serif-tc",
  display: "swap",
});

const latin = Cormorant_Garamond({
  weight: ["300", "400"],
  subsets: ["latin"],
  variable: "--font-latin",
  display: "swap",
});

const STEPS = [
  { mark: "壹", title: "放進你的脈絡", body: "專案文件、會議紀錄、客戶對話、學習筆記。貼網址、傳檔案或直接貼文字，都只存在你自己的帳號裡。" },
  { mark: "貳", title: "編譯成對方的語言", body: "選定對象：業務、主管或跨部門夥伴。空洞的行話當場亮黃燈，再給出專業度、商業聚焦度和踩雷風險三項評分。" },
  { mark: "參", title: "內化成自己的說法", body: "教練一來一回追問，直到你能用自己的話講清楚。口袋卡依遺忘曲線排程，每天五張，讓一次衝刺變成每日習慣。" },
];

const MODULES = [
  { name: "語意編譯器", en: "Semantic Compiler", body: "同一句話，依對象編譯成對方聽得懂、聽得進去的說法，附即時油膩偵測與三項評分。" },
  { name: "PRD 規格", en: "Spec Generator", body: "貼上一段混亂的客戶對話，整理出 User Story、驗收標準與技術風險，團隊可以直接開工。" },
  { name: "Pocket 口袋卡", en: "Spaced Repetition", body: "開會聽不懂的詞、被問倒的題目，一鍵做成卡片，依遺忘曲線每天複習五張。" },
  { name: "學習教練", en: "Socratic Coach", body: "一次只問一題，用兩種方法確認你真的懂了，才往下一個概念走。" },
];

const METHODS = ["費曼法", "蘇格拉底提問", "主動回想", "情境應用", "比較辨析", "模擬提問"];

export function Landing() {
  return (
    <div className={`${serifTc.variable} ${latin.variable} washi relative isolate flex-1 overflow-x-clip text-sumi`}>
      <Filters />
      {/* 最底層的雪：畫在和紙底色之上、所有內容之下 */}
      <Snowfall />
      <ParallaxEffects />

      {/* 首屏 */}
      <section className="relative isolate flex min-h-[max(100svh,680px)] flex-col overflow-hidden">
        <div data-parallax="0.42" data-parallax-anchor="top" className="absolute inset-x-0 bottom-0 -z-30 h-[78%]">
          <Mountain layer="far" className="size-full" />
        </div>
        <div data-parallax="0.28" data-parallax-anchor="top" className="absolute inset-x-0 bottom-0 -z-20 h-[66%]">
          <Mountain layer="mid" className="size-full" />
        </div>
        <div data-parallax="0.34" data-parallax-anchor="top" className="absolute right-[6%] bottom-[23%] -z-20 w-[46%] max-w-md opacity-80 sm:right-[12%] sm:w-[32%] sm:bottom-[20%]">
          <Bridge className="w-full" />
        </div>
        <div data-parallax="0.12" data-parallax-anchor="top" className="absolute inset-x-0 bottom-0 -z-10 h-[36%]">
          <Mountain layer="near" className="size-full" />
        </div>
        {/* 底部的霧：山景捲動時融進紙色，不會在區塊邊緣切出一條線 */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-[5] h-[26%] bg-gradient-to-b from-washi/0 via-washi/70 to-washi" />
        <div data-parallax="0.55" data-parallax-anchor="top" className="absolute top-[9%] left-[6%] -z-30 w-52 opacity-[0.13] sm:w-80 lg:left-[10%] lg:w-[30rem]">
          <Enso className="w-full" />
        </div>

        <nav aria-label="主要" className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 sm:px-10 lg:px-16">
          <span className="font-latin text-xl tracking-[0.08em]">JargonBridge</span>
          <div className="flex items-center gap-5 sm:gap-8">
            <Link href="/try" className="font-serif text-sm tracking-[0.2em] text-sumi/80 transition-colors hover:text-sumi">
              免登入體驗
            </Link>
            <Link href="/coach" className="border-b border-sumi/40 pb-0.5 font-serif text-sm tracking-[0.2em] transition-colors hover:border-sumi">
              進入工作台
            </Link>
          </div>
        </nav>

        <div data-parallax="0.18" data-parallax-anchor="top" className="mx-auto flex w-full max-w-7xl flex-1 flex-col-reverse justify-end gap-10 px-6 pt-6 pb-[38svh] sm:flex-row sm:items-start sm:justify-between sm:px-10 sm:pt-12 lg:px-16 lg:pt-16">
          <div className="hero-in hero-in-late max-w-sm sm:self-end lg:max-w-md">
            <p className="mb-3 font-latin text-sm tracking-[0.12em] text-sumi/70">Communication &amp; Alignment Copilot</p>
            <p className="font-serif text-base leading-[2.1] font-light sm:text-lg">
              讓工程、產品、業務與管理者，<br />講同一種語言。
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Link href="/coach" className="bg-sumi px-7 py-3 font-serif text-sm tracking-[0.25em] text-washi transition-colors hover:bg-rust">
                開始使用
              </Link>
              <Link href="/try" className="border-b border-sumi/40 pb-0.5 font-serif text-sm tracking-[0.2em] text-sumi transition-colors hover:border-sumi">
                免登入體驗
              </Link>
            </div>
          </div>
          <h1 className="hero-in vertical self-end font-serif text-[2.5rem] leading-[1.7] font-light tracking-[0.22em] sm:self-start sm:text-[3.5rem] lg:text-[4.75rem]">
            <span className="block">同一件事</span>
            <span className="block pt-[1.6em]">兩種說法</span>
          </h1>
        </div>
      </section>

      {/* 一句話的留白 */}
      <section className="relative overflow-hidden px-6 py-32 sm:px-10 sm:py-44 lg:py-60">
        <div data-parallax="-0.14" aria-hidden="true" className="absolute top-10 -right-6 font-serif text-[9rem] leading-none font-light text-sumi/[0.05] sm:text-[15rem] lg:right-[6%] lg:text-[22rem]">
          間
        </div>
        <div data-reveal className="relative mx-auto max-w-3xl">
          <p className="font-serif text-2xl leading-[2] font-light sm:text-3xl sm:leading-[2.1] lg:text-[2.625rem]">
            你做過的事，<br />比你講出來的多。
          </p>
          <p className="mt-10 max-w-lg text-[15px] leading-[2.2] text-stone-mute sm:ml-[18%]">
            專案明明做完了，報告時卻只剩一句「就是把它弄快一點」。JargonBridge 把那句話拆開，補上對方在意的影響與數字，再用你自己的語氣講回去。
          </p>
        </div>
      </section>

      {/* 兩種說法 */}
      <section className="relative mx-auto grid max-w-7xl gap-px px-6 pb-28 sm:px-10 sm:pb-40 lg:grid-cols-12 lg:gap-0 lg:px-16">
        <div data-reveal className="pb-14 lg:col-span-6 lg:pr-16 lg:pb-0">
          <p className="text-xs tracking-[0.35em] text-rust">大白話</p>
          <h2 className="mt-3 mb-10 font-serif text-2xl font-light tracking-[0.08em] sm:text-3xl">講給誰聽，你來選</h2>
          <VoiceSwitcher />
        </div>
        <div data-parallax="-0.06" className="lg:col-span-5 lg:col-start-8">
          <div data-reveal className="border-t border-sumi/20 pt-14 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-14">
            <p className="text-xs tracking-[0.35em] text-rust">大廠術語</p>
            <h2 className="mt-3 mb-10 font-serif text-2xl font-light tracking-[0.08em] sm:text-3xl">同一件事，這樣講</h2>
            <p className="font-serif text-xl leading-[2] lg:text-[1.375rem]">
              我們用 RAG 架構，先從向量資料庫取回相關 chunk 再交給 LLM 生成，降低 hallucination，並用 recall@k 追蹤檢索品質。
            </p>
            <p className="mt-10 text-xs leading-[2] text-stone-mute">以上為示意內容，實際依你的資料和溝通對象生成。</p>
          </div>
        </div>
      </section>

      {/* 流程 */}
      <section id="method" className="sumi-ground relative scroll-mt-0 overflow-hidden py-28 text-washi sm:py-40">
        <div data-parallax="0.16" className="absolute -top-20 -right-24 w-[26rem] opacity-[0.1] sm:w-[38rem] lg:right-[4%] lg:w-[46rem]">
          <Enso className="w-full" stroke="#efe8dc" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 sm:px-10 lg:px-16">
          <div data-reveal>
            <p className="text-xs tracking-[0.35em] text-washi/60">運作方式</p>
            <h2 className="mt-3 font-serif text-3xl font-light tracking-[0.08em] sm:text-4xl">三段路</h2>
          </div>
          <ol className="mt-16 grid gap-16 sm:mt-24 md:grid-cols-3 md:gap-10 lg:gap-16">
            {STEPS.map((step, index) => (
              <li key={step.mark} className={index === 1 ? "md:mt-20" : index === 2 ? "md:mt-40" : ""}>
                <div data-reveal>
                  <span aria-hidden="true" className="block font-serif text-6xl font-light text-washi/30 lg:text-7xl">
                    {step.mark}
                  </span>
                  <h3 className="mt-6 font-serif text-xl leading-relaxed font-normal tracking-[0.06em]">{step.title}</h3>
                  <p className="mt-4 text-[15px] leading-[2.1] text-washi/70">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 金繼 */}
      <section className="relative overflow-hidden px-6 py-28 sm:px-10 sm:py-40 lg:py-52">
        <div className="mx-auto grid max-w-7xl items-center gap-14 md:grid-cols-2 lg:gap-24 lg:px-6">
          <div data-parallax="0.09">
            <div data-reveal>
              <KintsugiBowl className="mx-auto w-full max-w-md lg:max-w-xl" />
            </div>
          </div>
          <div data-reveal>
            <p className="text-xs tracking-[0.35em] text-rust">金繼</p>
            <h2 className="mt-3 font-serif text-3xl leading-[1.6] font-light tracking-[0.06em] lg:text-4xl">
              裂縫補上了，<br />才往下走。
            </h2>
            <p className="mt-8 text-[15px] leading-[2.2] text-stone-mute">
              一句「我懂了」過不了關，背答案也不行。每個概念要用兩種不同的方法各通過一次，才會往下一個走。
            </p>
            <ul className="mt-8 flex flex-wrap gap-x-5 gap-y-2 font-serif text-sm tracking-[0.12em]">
              {METHODS.map((method) => (
                <li key={method}>{method}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 不編造 */}
      <section className="relative mx-auto max-w-7xl px-6 pb-32 sm:px-10 sm:pb-44 lg:px-16">
        <div className="grid gap-12 border-t border-sumi/20 pt-16 md:grid-cols-12">
          <div data-reveal className="md:col-span-4">
            <p className="text-xs tracking-[0.35em] text-rust">更好的回應</p>
            <h2 className="mt-3 font-serif text-2xl leading-[1.7] font-light tracking-[0.06em] sm:text-3xl">
              專業，<br />但還是你在講話
            </h2>
          </div>
          <div data-reveal className="md:col-span-7 md:col-start-6">
            <p className="text-sm tracking-[0.1em] text-stone-mute">你原本說：就是把回應弄快一點。</p>
            <p className="mt-6 font-serif text-xl leading-[2.1] sm:text-2xl sm:leading-[2.1]">
              原本回應要等很久，我先量出卡在檢索那段，改了索引之後，p95 從
              <mark className="mx-1 bg-transparent text-rust">[補：實際數字]</mark>
              降到
              <mark className="mx-1 bg-transparent text-rust">[補：實際數字]</mark>。
            </p>
            <p className="mt-8 text-[15px] leading-[2.2] text-stone-mute">
              只用你資料裡有的事實，不替你編數字或成果。缺的地方會標出來，由你自己補上。改寫時也避開一聽就知道是 AI 寫的句型。
            </p>
          </div>
        </div>
      </section>

      {/* 四個核心模組 */}
      <section className="relative mx-auto max-w-7xl px-6 pb-32 sm:px-10 sm:pb-44 lg:px-16">
        <div data-reveal className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs tracking-[0.35em] text-rust">工作台</p>
            <h2 className="mt-3 font-serif text-3xl font-light tracking-[0.06em] sm:text-4xl">四個模組，一條溝通鏈</h2>
          </div>
          <Link href="/try" className="border-b border-sumi/40 pb-0.5 font-serif text-sm tracking-[0.2em] transition-colors hover:border-sumi">
            先免登入試試
          </Link>
        </div>
        <ul className="mt-14 grid gap-px overflow-hidden rounded-3xl bg-sumi/10 sm:grid-cols-2 lg:grid-cols-4">
          {MODULES.map((module, index) => (
            <li key={module.name} data-reveal className="flex flex-col bg-washi/90 p-7 lg:p-8">
              <span className="text-xs tabular-nums tracking-[0.2em] text-stone-mute">0{index + 1}</span>
              <h3 className="mt-6 font-serif text-xl tracking-[0.04em]">{module.name}</h3>
              <p className="mt-1 font-latin text-sm text-stone-mute">{module.en}</p>
              <p className="mt-5 text-[15px] leading-[2] text-sumi/80">{module.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* 結尾 */}
      <section className="sumi-ground relative isolate overflow-hidden px-6 py-36 text-center text-washi sm:py-52">
        <div data-parallax="0.12" className="absolute top-1/2 left-1/2 -z-10 -ml-[11rem] -mt-[11rem] w-[22rem] opacity-[0.14] sm:-ml-[17rem] sm:-mt-[17rem] sm:w-[34rem]">
          <Enso className="w-full" stroke="#efe8dc" />
        </div>
        <div data-reveal>
          <h2 className="font-serif text-3xl leading-[1.8] font-light tracking-[0.14em] sm:text-4xl">先把下一句話講對</h2>
          <p className="mx-auto mt-6 max-w-md text-sm leading-[2] text-washi/60">下一場會議、下一次 Demo、下一份規格。從一句話開始對齊。</p>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
            <Link href="/coach" className="inline-block bg-washi px-9 py-3.5 font-serif text-sm tracking-[0.3em] text-sumi transition-colors hover:bg-white">
              進入工作台
            </Link>
            <Link href="/try" className="border-b border-washi/40 pb-0.5 font-serif text-sm tracking-[0.2em] text-washi transition-colors hover:border-washi">
              免登入體驗
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
