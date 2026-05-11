"use client";

import { useState } from "react";
import { useGenerateCreative } from "../_hooks/useGenerateCreative";
import { useToast } from "./Toast";
import { useCreative } from "./CreativeProvider";
import { useSessionStorage } from "../_hooks/useSessionStorage";
import CreativeInputForm from "./CreativeInputForm";
import CreativeResultPanel from "./CreativeResultPanel";

const DEFAULT_HEADLINES: [string, string, string] = [
  "피부가 먼저 느끼는 차이, 그린루틴",
  "자극 없이, 촉촉하게. 비건 수분크림",
  "지구도 내 피부도 건강하게",
];

export default function CreateTab({ onNext }: { onNext: () => void }) {
  const { state, dispatch } = useCreative();
  const [brand, setBrand] = useSessionStorage("adflow_brand", "");
  const [target, setTarget] = useSessionStorage("adflow_target", "");
  const [goal, setGoal] = useSessionStorage("adflow_goal", "");
  const [displayedHeadlines, setDisplayedHeadlines] = useState<[string, string, string]>(DEFAULT_HEADLINES);
  const [elapsedSec, setElapsedSec] = useState<number | null>(null);

  const copyMutation = useGenerateCreative();
  const showToast = useToast();

  const handleGenerate = () => {
    const startedAt = Date.now();
    const params = { brand, target, goal, tone: state.tone };

    copyMutation.mutate(params, {
      onSuccess: (data) => {
        setDisplayedHeadlines(data.headlines);
        dispatch({ type: "SET_HEADLINE", headline: data.headlines[0] });
        dispatch({ type: "SET_BODY_COPY", bodyCopy: data.bodyCopy });
        dispatch({ type: "SET_TARGETING", targeting: data.targeting });
        setElapsedSec(Math.round((Date.now() - startedAt) / 100) / 10);
      },
      onError: (error) => {
        console.error("[generate-creative]", error);
        showToast("카피 생성에 실패했어요, 다시 시도해주세요");
      },
    });
  };

  return (
    <div className="create-screen">
      <CreativeInputForm
        brand={brand}
        setBrand={setBrand}
        target={target}
        setTarget={setTarget}
        goal={goal}
        setGoal={setGoal}
        isPending={copyMutation.isPending}
        onGenerate={handleGenerate}
      />
      <CreativeResultPanel
        displayedHeadlines={displayedHeadlines}
        elapsedSec={elapsedSec}
        copyPending={copyMutation.isPending}
        copySuccess={copyMutation.isSuccess}
        onNext={onNext}
      />
    </div>
  );
}
