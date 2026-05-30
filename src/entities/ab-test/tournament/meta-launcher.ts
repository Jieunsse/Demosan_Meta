// 실 게재 어댑터 (ADR-038 결정 4) — server-side only. 한 라운드 = 챔피언(A) vs 챌린저(B)
// 2광고를 한 AdSet 에 게재. axis(헤드라인|카피)만 갈리고 나머지 필드는 공유한다.
//
// ADR §4 는 Meta ad study(SPLIT_TEST)+Meta verdict 를 정석으로 두지만, adstudy verdict 왕복은
// 실계정 1회 검증 전까지 머지 보류다(§4 검증게이트). 그 전 경로 = 동일 AdSet 2광고 + 셀 insights
// z-검정 폴백(meta-kpi-source → engine.settleRound). 검증된 createCampaign A/B 분기를 그대로 재사용한다.
// 검증 통과 시 이 launch 만 /act_X/ad_studies 게재로 교체하면 KpiSource·엔진은 불변.

import { metaAdsCampaign, type AbTestVariantBParam } from "@/lib/meta-ads-campaign";
import type { ObjectivePhase1Id } from "@entities/creative/options";
import type { RoundLauncher } from "./adapters";
import { deriveAxis, type TourVariant } from "./engine";

function isoDateKST(daysFromNow: number): string {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 3600_000 + daysFromNow * 86400_000);
  return kst.toISOString().slice(0, 10);
}

// 챌린저에서 갈리는 축만 variantB 로. image 축은 토너먼트 자동 순회에 없고(헤드라인/카피 전용),
// 셋업 라운드1 image 도 dataUrl 이 없으면 헤드라인 차이로 폴백한다.
function variantB(challenger: TourVariant, axis: "headline" | "primary_text" | "image"): AbTestVariantBParam {
  if (axis === "primary_text") return { axis: "primary_text", primaryText: challenger.primaryText };
  return { axis: "headline", headline: challenger.headline };
}

export function createMetaRoundLauncher(): RoundLauncher {
  return {
    async launch(t, round) {
      const d = t.delivery;
      if (!d) throw new Error("실 게재 자격증명이 없는 토너먼트입니다.");
      const rawAxis = deriveAxis(round.champion, round.challenger);
      const axis = rawAxis === "image" ? "headline" : rawAxis;

      const result = await metaAdsCampaign.createCampaign(
        {
          headline: round.champion.headline,
          primaryText: round.champion.primaryText,
          dailyBudget: t.dailyBudget,
          startDate: isoDateKST(0),
          endDate: isoDateKST(d.roundDays),
          ageMin: d.ageMin,
          ageMax: d.ageMax,
          genders: d.genders,
          countries: d.countries,
          linkUrl: d.linkUrl,
          ctaType: d.ctaType,
          status: "ACTIVE",
          imageDataUrl: d.imageDataUrl,
          goalId: d.goalId as ObjectivePhase1Id | undefined,
          brandName: t.productName,
          abTestEnabled: true,
          abTestAxis: axis,
          abTestVariantB: variantB(round.challenger, axis),
        },
        d.accessToken,
        d.adAccountId,
        d.pageId,
      );

      if (!result.adIds) throw new Error("A/B 광고 2개 생성에 실패했어요. 광고 계정 권한을 확인해주세요.");
      return { campaignId: result.campaignId, adIds: result.adIds };
    },
  };
}
