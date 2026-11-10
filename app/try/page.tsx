import type { Metadata } from "next";
import { Noto_Serif_TC } from "next/font/google";
import { Filters } from "@/components/landing/Art";
import "@/components/landing/landing.css";
import { SiteFooter, SiteHeader } from "@/components/landing/SiteChrome";
import { TrustBadges } from "@/components/landing/TrustBadges";
import { TryExperience } from "./TryExperience";

const serifTc = Noto_Serif_TC({ weight: ["300", "400", "500"], subsets: ["latin"], variable: "--font-serif-tc", display: "swap" });

export const metadata: Metadata = {
  title: "免登入體驗｜JargonBridge",
  description: "選一個工作上的難題，立刻看到它被整理成決策者聽得進去的專業說法，以及普通回答和滿分回答的差別。",
};

export default function TryPage() {
  return (
    <div className={`${serifTc.variable} washi flex flex-1 flex-col text-sumi`}>
      <Filters />
      <SiteHeader current="/try" />

      <main className="mx-auto w-full max-w-7xl flex-1 px-6 pb-28 sm:px-10 lg:px-16">
        <section className="grid gap-10 pt-16 pb-14 sm:pt-24 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="flex items-center gap-3 text-xs tracking-[0.35em] text-rust">
              <span aria-hidden className="h-px w-8 bg-rust/60" />
              免登入體驗・LIVE DEMO
            </p>
            <h1 className="mt-6 font-serif text-[2.25rem] leading-[1.45] font-light tracking-[0.04em] sm:text-5xl lg:text-[3.5rem]">
              一個難題，
              <br />
              兩種說法。
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-[2] text-stone-mute">
              選一個你正在面對的處境。看同一件事如何被整理成決策者聽得進去的專業說法，以及普通回答和滿分回答差在哪裡。
            </p>
          </div>
          <ol className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-sumi/10 text-center lg:col-span-4" aria-label="體驗步驟">
            {["選一個情境", "看專業轉譯", "對照兩種回答"].map((step, index) => (
              <li key={step} className="bg-washi/80 px-3 py-4">
                <span className="block font-latin text-2xl text-sumi/40">{index + 1}</span>
                <span className="mt-1 block text-xs tracking-[0.12em]">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <TrustBadges extra="本頁不傳送任何資料" />

        <TryExperience />
      </main>

      <SiteFooter />
    </div>
  );
}
