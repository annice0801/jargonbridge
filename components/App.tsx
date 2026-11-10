"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { request } from "@/lib/client";
import type { SourceSummary } from "@/lib/types";
import { AccountMenu } from "./AccountMenu";
import { CoachPanel } from "./CoachPanel";
import { KnowledgePanel } from "./KnowledgePanel";
import { NotesPanel } from "./NotesPanel";
import { PocketPanel } from "./PocketPanel";
import { SourcesPanel } from "./SourcesPanel";
import { SpecPanel } from "./SpecPanel";
import { TermExplorerProvider } from "./TermExplorer";
import { TranslatePanel } from "./TranslatePanel";

const TABS = [
  { id: "cards", label: "知識卡" },
  { id: "pocket", label: "Pocket 口袋卡" },
  { id: "coach", label: "學習教練" },
  { id: "translate", label: "語意編譯器" },
  { id: "spec", label: "PRD 規格" },
  { id: "notes", label: "筆記" },
  { id: "sources", label: "我的資料" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function App() {
  const [tab, setTab] = useState<TabId>("coach");
  const [coachFocus, setCoachFocus] = useState<{ id: string; nonce: number } | null>(null);
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [loadError, setLoadError] = useState("");

  const refreshSources = useCallback(async () => {
    try {
      const data = await request<{ sources: SourceSummary[] }>("/api/sources");
      setSources(data.sources);
      setLoadError("");
    } catch (error) {
      setLoadError((error as Error).message);
    }
  }, []);

  useEffect(() => {
    let active = true;
    request<{ sources: SourceSummary[] }>("/api/sources")
      .then((data) => {
        if (active) setSources(data.sources);
      })
      .catch((error: Error) => {
        if (active) setLoadError(error.message);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <TermExplorerProvider>
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pb-10 sm:px-6">
      <div className="pt-4">
        <AccountMenu />
      </div>
      <header className="flex flex-wrap items-center justify-between gap-3 py-5">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            <Link href="/">JargonBridge</Link>
          </h1>
          <p className="text-sm text-stone-500">Communication &amp; Alignment Copilot：讓跨領域人才和研發團隊講同一種語言</p>
        </div>
        <nav aria-label="功能" className="flex max-w-full overflow-x-auto rounded-lg bg-stone-200/70 p-1">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-current={tab === item.id ? "page" : undefined}
              onClick={() => setTab(item.id)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition ${
                tab === item.id ? "bg-white shadow-sm" : "text-stone-600 hover:text-stone-900"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {loadError && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </p>
      )}

      {/* 切換分頁時保留元件，進行中的對話、翻譯結果和沒送出的回答才不會消失。 */}
      <div hidden={tab !== "cards"}>
        <KnowledgePanel
          sources={sources}
          onGoToSources={() => setTab("sources")}
          onSourcesChanged={refreshSources}
          onStartCoach={(id) => {
            setCoachFocus({ id, nonce: Date.now() });
            setTab("coach");
          }}
        />
      </div>
      <div hidden={tab !== "pocket"}>
        <PocketPanel sources={sources} active={tab === "pocket"} onGoToSources={() => setTab("sources")} />
      </div>
      <div hidden={tab !== "coach"}>
        <CoachPanel sources={sources} onGoToSources={() => setTab("sources")} focus={coachFocus} />
      </div>
      <div hidden={tab !== "translate"}>
        <TranslatePanel sources={sources} />
      </div>
      <div hidden={tab !== "spec"}>
        <SpecPanel />
      </div>
      <div hidden={tab !== "notes"}>
        <NotesPanel active={tab === "notes"} />
      </div>
      <div hidden={tab !== "sources"}>
        <SourcesPanel sources={sources} onChange={refreshSources} />
      </div>
    </div>
    </TermExplorerProvider>
  );
}
