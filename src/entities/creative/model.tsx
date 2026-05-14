"use client";

import { createContext, useContext, useReducer, type Dispatch, type ReactNode } from "react";
import { type ToneId, type CtaId, type ImageId } from "@entities/creative/options";
import type { ExtractedTargeting } from "@/lib/gemini-creative";

const INITIAL_HEADLINE = "피부가 먼저 느끼는 차이, 그린루틴";

export type OutcomeChip = "traffic" | "engagement" | "awareness";
export type Objective = "OUTCOME_TRAFFIC" | "OUTCOME_ENGAGEMENT" | "OUTCOME_AWARENESS";

export const OUTCOME_TO_OBJECTIVE: Record<OutcomeChip, Objective> = {
  traffic: "OUTCOME_TRAFFIC",
  engagement: "OUTCOME_ENGAGEMENT",
  awareness: "OUTCOME_AWARENESS",
};

export type CreativeState = {
  tone: ToneId;
  headline: string;
  cta: CtaId;
  image: ImageId;
  primaryText: string;
  generatedImages: [string, string, string] | null;
  targeting: ExtractedTargeting | null;
  ctaLabels: [string, string, string] | null;

  outcomeChip: OutcomeChip | null;
  outcomeHint: string;
  objective: Objective | null;
};

export type CreativeAction =
  | { type: "SET_TONE"; tone: ToneId }
  | { type: "SET_HEADLINE"; headline: string }
  | { type: "SET_CTA"; cta: CtaId }
  | { type: "SET_IMAGE"; image: ImageId }
  | { type: "SET_PRIMARY_TEXT"; primaryText: string }
  | { type: "SET_GENERATED_IMAGES"; images: [string, string, string] }
  | { type: "SET_TARGETING"; targeting: ExtractedTargeting }
  | { type: "SET_CTA_LABELS"; labels: [string, string, string] }
  | { type: "SET_OUTCOME_CHIP"; chip: OutcomeChip | null }
  | { type: "SET_OUTCOME_HINT"; hint: string }
  | { type: "SET_OBJECTIVE"; objective: Objective | null }
  | { type: "RESET" };

const INITIAL_STATE: CreativeState = {
  tone: "pro",
  headline: INITIAL_HEADLINE,
  cta: "sample",
  image: "img2",
  primaryText: "",
  generatedImages: null,
  targeting: null,
  ctaLabels: null,
  outcomeChip: null,
  outcomeHint: "",
  objective: null,
};

function reducer(state: CreativeState, action: CreativeAction): CreativeState {
  switch (action.type) {
    case "SET_TONE":             return { ...state, tone: action.tone };
    case "SET_HEADLINE":         return { ...state, headline: action.headline };
    case "SET_CTA":              return { ...state, cta: action.cta };
    case "SET_IMAGE":            return { ...state, image: action.image };
    case "SET_PRIMARY_TEXT":     return { ...state, primaryText: action.primaryText };
    case "SET_GENERATED_IMAGES": return { ...state, generatedImages: action.images };
    case "SET_TARGETING":        return { ...state, targeting: action.targeting };
    case "SET_CTA_LABELS":       return { ...state, ctaLabels: action.labels };
    case "SET_OUTCOME_CHIP":     return action.chip
      ? { ...state, outcomeChip: action.chip, objective: OUTCOME_TO_OBJECTIVE[action.chip] }
      : { ...state, outcomeChip: null, objective: null };
    case "SET_OUTCOME_HINT":     return { ...state, outcomeHint: action.hint };
    case "SET_OBJECTIVE":        return { ...state, objective: action.objective };
    case "RESET":                return INITIAL_STATE;
    default:                     return state;
  }
}

type CreativeContextValue = { state: CreativeState; dispatch: Dispatch<CreativeAction> };
const CreativeContext = createContext<CreativeContextValue | null>(null);

export function CreativeStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  return (
    <CreativeContext.Provider value={{ state, dispatch }}>
      {children}
    </CreativeContext.Provider>
  );
}

export function useCreativeDraft(): CreativeContextValue {
  const ctx = useContext(CreativeContext);
  if (!ctx) throw new Error("useCreativeDraft must be used inside CreativeStateProvider");
  return ctx;
}
