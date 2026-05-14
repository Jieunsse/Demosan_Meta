"use client";

// STEP 01 소재 작성 widget — ADR-001 §deepening ③.
// 2칼럼 레이아웃 오케스트레이터. 왼쪽 InputForm + 오른쪽 ResultPanel.
// page.tsx 는 step 진행·세션스토리지 입력값·generate mutation 결과를 props 로 전달.

import { type ToneId, type CtaId, type ObjectivePhase1Id } from "@entities/creative/options";
import InputForm from "./InputForm";
import ResultPanel from "./ResultPanel";

interface Props {
  brand: string;
  setBrand: (v: string) => void;
  target: string;
  setTarget: (v: string) => void;
  goal: string;
  setGoal: (v: string) => void;
  tone: ToneId;
  setTone: (id: ToneId) => void;
  outcomeChip: ObjectivePhase1Id | null;
  setOutcomeChip: (id: ObjectivePhase1Id | null) => void;
  outcomeHint: string;
  setOutcomeHint: (v: string) => void;
  generating: boolean;
  generated: boolean;
  headlines: string[] | null;
  headlineIdx: number;
  onSelectHeadline: (i: number) => void;
  primaryText: string;
  setPrimaryText: (v: string) => void;
  cta: CtaId;
  setCta: (id: CtaId) => void;
  ctaLabels: [string, string, string] | null;
  elapsed: number;
  onGenerate: () => void;
  onSaveToLibrary: () => void;
  saved: boolean;
  goLibrary: () => void;
  onNext: () => void;
  imageDataUrl: string | null;
  setImageDataUrl: (v: string | null) => void;
}

export default function CreativeStep(p: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, alignItems: "flex-start" }}>
      <InputForm
        brand={p.brand}
        setBrand={p.setBrand}
        target={p.target}
        setTarget={p.setTarget}
        goal={p.goal}
        setGoal={p.setGoal}
        tone={p.tone}
        setTone={p.setTone}
        outcomeChip={p.outcomeChip}
        setOutcomeChip={p.setOutcomeChip}
        outcomeHint={p.outcomeHint}
        setOutcomeHint={p.setOutcomeHint}
        generating={p.generating}
        onGenerate={p.onGenerate}
      />
      <ResultPanel
        generating={p.generating}
        generated={p.generated}
        headlines={p.headlines}
        headlineIdx={p.headlineIdx}
        onSelectHeadline={p.onSelectHeadline}
        primaryText={p.primaryText}
        setPrimaryText={p.setPrimaryText}
        cta={p.cta}
        setCta={p.setCta}
        ctaLabels={p.ctaLabels}
        elapsed={p.elapsed}
        onSaveToLibrary={p.onSaveToLibrary}
        saved={p.saved}
        goLibrary={p.goLibrary}
        onNext={p.onNext}
        imageDataUrl={p.imageDataUrl}
        setImageDataUrl={p.setImageDataUrl}
      />
    </div>
  );
}
