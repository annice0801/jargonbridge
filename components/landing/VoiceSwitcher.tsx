"use client";

import { useState } from "react";

const VOICES = [
  { id: "kid", label: "幼兒園", text: "你問老師問題，老師先去書櫃翻到對的那本書，看完才回答你，這樣就不會亂講。" },
  { id: "junior", label: "國中", text: "像考試可以翻課本。AI 先查到相關段落，再照內容寫答案，比只靠記憶準。" },
  { id: "master", label: "碩士", text: "把資訊檢索接在生成前面，用外部知識約束模型輸出。檢索階段就漏掉的內容，生成階段救不回來，所以兩段要分開評估。" },
  { id: "spicy", label: "辛辣", text: "模型不知道的事也敢講得很篤定。RAG 就是逼它先去翻資料再開口，別再憑感覺掰了。" },
  { id: "gossip", label: "八卦", text: "你知道嗎，那個什麼都答得出來的 AI，其實偷偷在翻小抄。每次被問，它都先去資料庫查一輪才回你。" },
] as const;

export function VoiceSwitcher() {
  const [voiceId, setVoiceId] = useState<(typeof VOICES)[number]["id"]>("kid");
  const voice = VOICES.find((item) => item.id === voiceId)!;

  return (
    <div>
      <div role="group" aria-label="切換白話程度或模式" className="flex flex-wrap gap-x-5 gap-y-2">
        {VOICES.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={item.id === voiceId}
            onClick={() => setVoiceId(item.id)}
            className={`border-b py-1 text-sm tracking-[0.2em] transition-colors ${
              item.id === voiceId
                ? "border-sumi text-sumi"
                : "border-transparent text-stone-mute hover:text-sumi"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <p key={voice.id} aria-live="polite" className="voice-text mt-8 min-h-[8.5em] font-serif text-xl leading-[2] text-sumi sm:min-h-[4.5em] lg:min-h-[8em] lg:text-[1.375rem]">
        {voice.text}
      </p>
    </div>
  );
}
