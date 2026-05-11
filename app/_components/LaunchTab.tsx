"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useLaunchCampaign } from "../_hooks/useLaunchCampaign";
import { useAgeSlider } from "../_hooks/useAgeSlider";
import { calcPeriod } from "@/lib/launch-utils";
import { DEFAULT_COUNTRIES } from "@/lib/geo-options";
import { useCreative } from "./CreativeProvider";
import LaunchSettingsForm from "./LaunchSettingsForm";
import LaunchStatusPanel from "./LaunchStatusPanel";

export type Gender = "all" | "male" | "female";

function isoDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function gendersToEnum(genders: number[]): Gender {
  if (genders.length === 1) return genders[0] === 1 ? "male" : "female";
  return "all";
}

function genderToList(g: Gender): number[] {
  return g === "male" ? [1] : g === "female" ? [2] : [];
}

export default function LaunchTab({ onNext }: { onNext: () => void }) {
  const { state, dispatch } = useCreative();
  const { data: session } = useSession();
  const notConnected = !session?.adAccountId || !session?.pageId;

  const [budget, setBudget] = useState("30,000");
  const [dateStart, setDateStart] = useState(() => isoDate(0));
  const [dateEnd, setDateEnd] = useState(() => isoDate(7));
  const [linkUrl, setLinkUrl] = useState("");
  const [status, setStatus] = useState<"ACTIVE" | "PAUSED">("PAUSED");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender>("all");
  const [countries, setCountries] = useState<string[]>(DEFAULT_COUNTRIES);

  const slider = useAgeSlider();
  const { mutation, campaignIds } = useLaunchCampaign();
  const period = calcPeriod(dateStart, dateEnd);

  // AI 카피 생성 시 추출한 타겟팅이 들어오면 슬라이더·성별을 그 값으로 채워줘요 (수정 가능).
  const targeting = state.targeting;
  const { setRange } = slider;
  useEffect(() => {
    if (!targeting) return;
    setRange(targeting.ageMin, targeting.ageMax);
    setGender(gendersToEnum(targeting.genders));
  }, [targeting, setRange]);

  const handleLaunch = () => {
    const dailyBudget = parseInt(budget.replace(/[^\d]/g, ""), 10) || 0;
    mutation.mutate(
      {
        headline: state.headline,
        bodyCopy: state.bodyCopy,
        dailyBudget,
        startDate: dateStart,
        endDate: dateEnd,
        ageMin: slider.ageMin,
        ageMax: slider.ageMax,
        genders: genderToList(gender),
        countries,
        linkUrl: linkUrl.trim(),
        cta: state.cta,
        status,
        imageDataUrl: imageDataUrl ?? undefined,
      },
      {
        onSuccess: (data) => {
          dispatch({
            type: "SET_LAUNCHED_CAMPAIGN",
            value: {
              campaignId: data.campaignId,
              adSetId: data.adSetId,
              adId: data.adId,
              dailyBudget,
              startDate: dateStart,
              endDate: dateEnd,
              status,
            },
          });
        },
      },
    );
  };

  return (
    <div className="launch-screen">
      <LaunchSettingsForm
        budget={budget}
        setBudget={setBudget}
        dateStart={dateStart}
        setDateStart={setDateStart}
        dateEnd={dateEnd}
        setDateEnd={setDateEnd}
        linkUrl={linkUrl}
        setLinkUrl={setLinkUrl}
        status={status}
        setStatus={setStatus}
        imageDataUrl={imageDataUrl}
        setImageDataUrl={setImageDataUrl}
        gender={gender}
        setGender={setGender}
        countries={countries}
        setCountries={setCountries}
        targetingPrefilled={!!targeting}
        notConnected={notConnected}
        slider={slider}
        period={period}
        isPending={mutation.isPending}
        launchError={mutation.isError ? mutation.error : null}
        onLaunch={handleLaunch}
      />
      <LaunchStatusPanel
        mutation={mutation}
        campaignIds={campaignIds}
        onNext={onNext}
      />
    </div>
  );
}
