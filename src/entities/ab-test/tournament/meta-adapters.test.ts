import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMetaRoundLauncher } from "./meta-launcher";
import { createMetaKpiSource } from "./meta-kpi-source";
import type { Tournament, TourRound, TournamentDelivery } from "./engine";

vi.mock("@/lib/meta-ads-campaign", () => ({
  metaAdsCampaign: { createCampaign: vi.fn() },
}));
vi.mock("@/lib/meta-ads-insights", () => ({
  metaAdsInsights: { getInsights: vi.fn() },
}));

import { metaAdsCampaign } from "@/lib/meta-ads-campaign";
import { metaAdsInsights } from "@/lib/meta-ads-insights";

const delivery: TournamentDelivery = {
  accessToken: "tok", adAccountId: "act_1", pageId: "page_1", ownerEmail: "u@x.com",
  goalId: "traffic", linkUrl: "https://x.com", ctaType: "LEARN_MORE",
  countries: ["KR"], ageMin: 20, ageMax: 45, roundDays: 7,
};

function tour(over: Partial<Tournament> = {}): Tournament {
  return {
    id: "t1", brandProfileId: "b1", productId: "p1", productName: "세럼",
    tone: "warm", objective: "traffic", mode: "auto", dailyBudget: 30000,
    champion: { headline: "촉촉 세럼", primaryText: "겨울 필수" }, championCtr: 1.5,
    axisCursor: 0, rounds: [], spentBudget: 0, status: "running",
    createdAt: "2026-05-31T00:00:00Z", delivery, ...over,
  };
}

function round(over: Partial<TourRound> = {}): TourRound {
  return {
    index: 1, axis: "headline", campaignId: "c1",
    champion: { headline: "촉촉 세럼", primaryText: "겨울 필수" },
    challenger: { headline: "보습 끝판왕", primaryText: "겨울 필수" },
    fastForwardDays: 0, status: "running", ...over,
  };
}

describe("createMetaRoundLauncher", () => {
  beforeEach(() => vi.clearAllMocks());

  it("헤드라인 축 라운드를 A/B 2광고로 게재하고 adIds 를 반환한다", async () => {
    vi.mocked(metaAdsCampaign.createCampaign).mockResolvedValue({
      campaignId: "camp_9", adSetId: "as_9", adIds: ["ad_A", "ad_B"],
    });
    const res = await createMetaRoundLauncher().launch(tour(), round());

    expect(res).toEqual({ campaignId: "camp_9", adIds: ["ad_A", "ad_B"] });
    const [params, token, accountId, pageId] = vi.mocked(metaAdsCampaign.createCampaign).mock.calls[0];
    expect(token).toBe("tok");
    expect(accountId).toBe("act_1");
    expect(pageId).toBe("page_1");
    expect(params.abTestEnabled).toBe(true);
    expect(params.abTestAxis).toBe("headline");
    expect(params.abTestVariantB).toEqual({ axis: "headline", headline: "보습 끝판왕" });
    expect(params.headline).toBe("촉촉 세럼"); // A = 챔피언
  });

  it("카피 축이면 variantB 가 primary_text 로 간다", async () => {
    vi.mocked(metaAdsCampaign.createCampaign).mockResolvedValue({
      campaignId: "c", adSetId: "a", adIds: ["x", "y"],
    });
    await createMetaRoundLauncher().launch(
      tour(),
      round({ challenger: { headline: "촉촉 세럼", primaryText: "지금 50% 할인" } }),
    );
    const [params] = vi.mocked(metaAdsCampaign.createCampaign).mock.calls[0];
    expect(params.abTestAxis).toBe("primary_text");
    expect(params.abTestVariantB).toEqual({ axis: "primary_text", primaryText: "지금 50% 할인" });
  });

  it("delivery 없으면 던진다", async () => {
    await expect(createMetaRoundLauncher().launch(tour({ delivery: undefined }), round())).rejects.toThrow();
  });

  it("adIds 가 없으면(개발모드 등) 던진다", async () => {
    vi.mocked(metaAdsCampaign.createCampaign).mockResolvedValue({ campaignId: "c", adSetId: "a" });
    await expect(createMetaRoundLauncher().launch(tour(), round())).rejects.toThrow();
  });
});

describe("createMetaKpiSource", () => {
  beforeEach(() => vi.clearAllMocks());

  it("광고별 insights 행을 두 셀 AdKpi 로 매핑한다", async () => {
    vi.mocked(metaAdsInsights.getInsights).mockResolvedValue({
      impressions: 20000, clicks: 400, ctr: 2, spend: 200000, daily: [],
      ads: [
        { adId: "ad_A", impressions: 10000, clicks: 150, ctr: 1.5, spend: 100000 },
        { adId: "ad_B", impressions: 10000, clicks: 250, ctr: 2.5, spend: 100000 },
      ],
    });
    const kpis = await createMetaKpiSource().roundKpis(tour(), round({ adIds: ["ad_A", "ad_B"] }));

    expect(kpis[0]).toEqual({ impressions: 10000, clicks: 150, ctr: 1.5, spend: 100000 });
    expect(kpis[1]).toEqual({ impressions: 10000, clicks: 250, ctr: 2.5, spend: 100000 });
    const [campaignId, token, period, , goalId, adIds] = vi.mocked(metaAdsInsights.getInsights).mock.calls[0];
    expect(campaignId).toBe("c1");
    expect(token).toBe("tok");
    expect(period).toBe("all");
    expect(goalId).toBe("traffic");
    expect(adIds).toEqual(["ad_A", "ad_B"]);
  });

  it("adIds 가 아직 없으면 빈 KPI 두 개", async () => {
    const kpis = await createMetaKpiSource().roundKpis(tour(), round());
    expect(kpis).toEqual([
      { ctr: 0, impressions: 0, clicks: 0, spend: 0 },
      { ctr: 0, impressions: 0, clicks: 0, spend: 0 },
    ]);
    expect(metaAdsInsights.getInsights).not.toHaveBeenCalled();
  });
});
