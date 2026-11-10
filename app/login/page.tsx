import type { Metadata } from "next";
import { Noto_Serif_TC } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { Enso, Filters } from "@/components/landing/Art";
import "@/components/landing/landing.css";
import { LoginError } from "./LoginError";

const serifTc = Noto_Serif_TC({ weight: ["300", "400"], subsets: ["latin"], variable: "--font-serif-tc", display: "swap" });

export const metadata: Metadata = { title: "登入｜JargonBridge" };

export default function LoginPage() {
  return (
    <main className={`${serifTc.variable} washi relative isolate flex flex-1 items-center justify-center overflow-hidden px-6 py-20 text-sumi`}>
      <Filters />
      <div aria-hidden="true" className="absolute top-1/2 left-1/2 -z-10 w-[34rem] max-w-[120vw] -translate-x-1/2 -translate-y-1/2 opacity-[0.08]">
        <Enso className="w-full" />
      </div>

      <div className="w-full max-w-sm">
        <Link href="/" className="font-serif text-lg tracking-[0.12em] text-sumi/80 hover:text-sumi">
          JargonBridge
        </Link>
        <h1 className="mt-10 font-serif text-3xl leading-[1.7] font-light tracking-[0.12em]">
          進入工作台
        </h1>
        <p className="mt-4 text-sm leading-[2] text-stone-mute">
          登入後，你上傳的資料、知識卡、學習紀錄和筆記都只屬於你的帳號。
        </p>

        <Suspense>
          <LoginError />
        </Suspense>

        {/* 這是登入 API，不是頁面跳轉，不能用 next/link。 */}
        <a
          href="/api/auth/google"
          className="mt-10 flex w-full items-center justify-center gap-3 bg-sumi px-6 py-3.5 font-serif text-sm tracking-[0.2em] text-washi transition-colors hover:bg-rust"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4">
            <path fill="#efe8dc" d="M21.6 12.23c0-.68-.06-1.36-.18-2.02H12v3.83h5.4a4.6 4.6 0 0 1-2 3.03v2.5h3.23c1.9-1.74 2.97-4.3 2.97-7.34Z" />
            <path fill="#efe8dc" opacity=".85" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.23-2.5c-.9.6-2.04.96-3.39.96-2.6 0-4.81-1.76-5.6-4.12H3.07v2.58A10 10 0 0 0 12 22Z" />
            <path fill="#efe8dc" opacity=".7" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.52H3.07a10 10 0 0 0 0 8.96L6.4 13.9Z" />
            <path fill="#efe8dc" opacity=".55" d="M12 5.98c1.47 0 2.79.5 3.83 1.5l2.86-2.86A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.93 5.52L6.4 10.1C7.19 7.74 9.4 5.98 12 5.98Z" />
          </svg>
          使用 Google 登入
        </a>

        <p className="mt-8 text-xs leading-[2] text-stone-mute">
          AI 功能需要你自己的 Anthropic API key，登入後可以在工作台右上角設定。金鑰只存在你的瀏覽器裡。
        </p>
      </div>
    </main>
  );
}
