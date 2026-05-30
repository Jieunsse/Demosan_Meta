// 실 KPI 어댑터 (ADR-038 결정 1) — server-side only. 라운드 campaign 의 광고별 insights →
// 챔피언(A)·챌린저(B) 두 셀 AdKpi. engine.settleRound 가 이 KPI 로 z-검정 판정한다(ADR §4 폴백 경로).
// 시드 생성기(roundAdKpis)와 달리 실 Meta 노출/클릭/지출을 그대로 옮긴다 — fake-performance 금지 원칙.

import { metaAdsInsights } from "@/lib/meta-ads-insights";
import type { ObjectivePhase1Id } from "@entities/creative/options";
import type { AdKpi } from "@entities/insights/ab-verdict";
import type { KpiSource } from "./adapters";

const EMPTY: AdKpi = { ctr: 0, impressions: 0, clicks: 0, spend: 0 };

export function createMetaKpiSource(): KpiSource {
  return {
    async roundKpis(t, round) {
      const d = t.delivery;
      if (!d) throw new Error("실 게재 자격증명이 없는 토너먼트입니다.");
      if (!round.adIds) return [EMPTY, EMPTY];

      const insights = await metaAdsInsights.getInsights(
        round.campaignId,
        d.accessToken,
        "all",
        undefined,
        d.goalId as ObjectivePhase1Id | undefined,
        round.adIds,
      );
      const rows = insights.ads;
      if (!rows) return [EMPTY, EMPTY];

      const toKpi = (r: { impressions: number; clicks: number; ctr: number; spend: number }): AdKpi => ({
        impressions: r.impressions,
        clicks: r.clicks,
        ctr: r.ctr,
        spend: r.spend,
      });
      return [toKpi(rows[0]), toKpi(rows[1])];
    },
  };
}
