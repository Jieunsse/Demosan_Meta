"use client";

import { createContext, useContext, useReducer } from "react";
import { type ToneId, type CtaId, type ImageId } from "@/lib/creative-options";
import type { ExtractedTargeting } from "@/lib/gemini-creative";

const INITIAL_HEADLINE = "피부가 먼저 느끼는 차이, 그린루틴";

export type LaunchedCampaign = {
  campaignId: string;
  adSetId: string;
  adId: string;
  dailyBudget: number; // KRW
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  status: "ACTIVE" | "PAUSED"; // 마지막으로 알려진 상태 (집행 시점 또는 제어 액션 이후)
};

export type CreativeState = {
  tone: ToneId;
  headline: string;
  cta: CtaId;
  image: ImageId;
  bodyCopy: string;
  generatedImages: [string, string, string] | null;
  // AI 카피 생성 시 타겟 설명에서 추출한 타겟팅 — 광고 집행 페이지의 기본값으로 사용
  targeting: ExtractedTargeting | null;
  // 방금 집행한 캠페인 — 성과 확인 탭에서 인사이트 조회에 사용
  launchedCampaign: LaunchedCampaign | null;
};

export type CreativeAction =
  | { type: "SET_TONE"; tone: ToneId }
  | { type: "SET_HEADLINE"; headline: string }
  | { type: "SET_CTA"; cta: CtaId }
  | { type: "SET_IMAGE"; image: ImageId }
  | { type: "SET_BODY_COPY"; bodyCopy: string }
  | { type: "SET_GENERATED_IMAGES"; images: [string, string, string] }
  | { type: "SET_TARGETING"; targeting: ExtractedTargeting }
  | { type: "SET_LAUNCHED_CAMPAIGN"; value: LaunchedCampaign }
  | { type: "RESET" };

const INITIAL_STATE: CreativeState = {
  tone: "pro",
  headline: INITIAL_HEADLINE,
  cta: "sample",
  image: "img2",
  bodyCopy: "",
  generatedImages: null,
  targeting: null,
  launchedCampaign: null,
};

function reducer(state: CreativeState, action: CreativeAction): CreativeState {
  switch (action.type) {
    case "SET_TONE":            return { ...state, tone: action.tone };
    case "SET_HEADLINE":        return { ...state, headline: action.headline };
    case "SET_CTA":             return { ...state, cta: action.cta };
    case "SET_IMAGE":           return { ...state, image: action.image };
    case "SET_BODY_COPY":       return { ...state, bodyCopy: action.bodyCopy };
    case "SET_GENERATED_IMAGES": return { ...state, generatedImages: action.images };
    case "SET_TARGETING":       return { ...state, targeting: action.targeting };
    case "SET_LAUNCHED_CAMPAIGN": return { ...state, launchedCampaign: action.value };
    case "RESET":               return INITIAL_STATE;
    default:                    return state;
  }
}

type CreativeContextValue = {
  state: CreativeState;
  dispatch: React.Dispatch<CreativeAction>;
};

const CreativeContext = createContext<CreativeContextValue | null>(null);

export function CreativeProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  return (
    <CreativeContext.Provider value={{ state, dispatch }}>
      {children}
    </CreativeContext.Provider>
  );
}

export function useCreative() {
  const ctx = useContext(CreativeContext);
  if (!ctx) throw new Error("useCreative must be used inside CreativeProvider");
  return ctx;
}
