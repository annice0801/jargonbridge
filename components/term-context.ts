"use client";

import { createContext, useContext } from "react";
import type { Style } from "@/lib/options";

export type TermMeta = { style: Style; targetRole: string };
export type TermRequest = TermMeta & { term: string; context: string };

export const TermContext = createContext<(request: TermRequest) => void>(() => {});

export const useTermOpener = () => useContext(TermContext);
