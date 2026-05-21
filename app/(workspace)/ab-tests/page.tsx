"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Icon from "@shared/ui/Icon";
import { fetchCampaigns } from "@entities/campaign/api";
import { MOCK_CAMPAIGN_SUMMARIES } from "@/lib/mock-campaigns";
import type { CampaignSummary } from "@/lib/meta-ads";

type Filter = "all" | "running" | "concluded";

const AXIS_LABEL: Record<string, string> = {
  headline: "헤드라인",
  primary_text: "광고 문구",
  image: "이미지",
};

const STATUS_MAP: Record<string, { label: string; chip: string }> = {
  live: { label: "게재 중", chip: "live" },
  paused: { label: "일시정지", chip: "paused" },
  ended: { label: "종료", chip: "ended" },
  review: { label: "검토 중", chip: "review" },
  issue: { label: "문제 있음", chip: "issue" },
};

const MOCK_AB_CAMPAIGNS = MOCK_CAMPAIGN_SUMMARIES.filter((c) => c.abTestEnabled);

function isRunning(c: CampaignSummary) {
  return c.status === "live" || c.status === "review";
}

export default function AbTestsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const connected = !!(session?.adAccountName && session?.pageName);
  const [filter, setFilter] = useState<Filter>("all");

  const campaignsQ = useQuery({
    queryKey: ["campaigns", "all"],
    queryFn: () => fetchCampaigns("all"),
    enabled: connected,
    retry: false,
  });

  const abCampaigns = (campaignsQ.data ?? []).filter((c) => c.abTestEnabled);

  const filtered = abCampaigns.filter((c) => {
    if (filter === "running") return isRunning(c);
    if (filter === "concluded") return !isRunning(c);
    return true;
  });

  const useMock = !connected || (!campaignsQ.isLoading && !campaignsQ.isError && filtered.length === 0);

  const mockFiltered = MOCK_AB_CAMPAIGNS.filter((c) => {
    if (filter === "running") return isRunning(c);
    if (filter === "concluded") return !isRunning(c);
    return true;
  });

  return (
    <div className="page" data-screen-label="A/B 테스트">
      <div className="page__head">
        <div>
          <h1 className="page__title">A/B 테스트</h1>
          <p className="page__sub">진행 중인 실험과 결과를 한눈에 확인해요</p>
        </div>
        <button className="btn btn--primary" type="button" onClick={() => router.push("/ab-tests/new")}>
          <Icon name="plus" size={14} /> 새 A/B 테스트
        </button>
      </div>

      <div className="seg" style={{ marginBottom: 20 }}>
        <button type="button" className={filter === "all" ? "on" : ""} onClick={() => setFilter("all")}>전체</button>
        <button type="button" className={filter === "running" ? "on" : ""} onClick={() => setFilter("running")}>진행 중</button>
        <button type="button" className={filter === "concluded" ? "on" : ""} onClick={() => setFilter("concluded")}>완료</button>
      </div>

      {campaignsQ.isLoading ? (
        <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "40px 32px" }}>
          <div className="spinner" style={{ width: 28, height: 28 }} />
          <div style={{ font: "600 14px/1.3 var(--w-font-sans)", color: "var(--w-fg-strong)" }}>불러오는 중…</div>
        </div>
      ) : campaignsQ.isError ? (
        <EmptyCard
          icon="warn"
          title="불러오지 못했어요"
          sub={campaignsQ.error instanceof Error ? campaignsQ.error.message : "잠시 후 다시 시도해 주세요"}
          ctaLabel="다시 시도"
          onAction={() => campaignsQ.refetch()}
        />
      ) : useMock ? (
        <>
          <MockBanner connected={connected} onConnect={() => router.push("/connect")} onCreate={() => router.push("/create")} />
          {mockFiltered.length === 0 ? (
            <div className="card" style={{ padding: "32px", textAlign: "center", color: "var(--w-fg-neutral)", font: "500 13px/1.5 var(--w-font-sans)" }}>
              {filter === "running" ? "진행 중인 예시가 없어요" : "완료된 예시가 없어요"}
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {mockFiltered.map((c) => (
                <AbTestCard key={c.id} campaign={c} demo onClick={() => router.push(`/campaigns/${c.id}`)} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((c) => (
            <AbTestCard key={c.id} campaign={c} onClick={() => router.push(`/campaigns/${c.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}

function MockBanner({ connected, onConnect, onCreate }: { connected: boolean; onConnect: () => void; onCreate: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderRadius: 10, background: "var(--w-primary-soft)", border: "1px solid var(--w-primary-weak)", marginBottom: 16 }}>
      <Icon name="eye" size={16} style={{ color: "var(--w-primary-normal)", flex: "0 0 auto" }} />
      <span style={{ flex: 1, font: "500 13px/1.4 var(--w-font-sans)", color: "var(--w-primary-press)" }}>
        {connected ? "아직 A/B 테스트가 없어요. 아래는 예시예요." : "계정 미연결 상태예요. 아래는 예시 데이터예요."}
      </span>
      {connected ? (
        <button className="btn btn--primary btn--sm" type="button" onClick={onCreate}>광고 만들기</button>
      ) : (
        <button className="btn btn--primary btn--sm" type="button" onClick={onConnect}>계정 연결</button>
      )}
    </div>
  );
}

function AbTestCard({ campaign: c, onClick, demo = false }: { campaign: CampaignSummary; onClick: () => void; demo?: boolean }) {
  const running = isRunning(c);
  const statusInfo = STATUS_MAP[c.status] ?? { label: c.status, chip: "neutral" };
  const axisLabel = AXIS_LABEL[c.abTestAxis ?? ""] ?? c.abTestAxis ?? "—";

  return (
    <button
      type="button"
      className="card"
      onClick={onClick}
      style={{ textAlign: "left", cursor: "pointer", width: "100%", display: "flex", alignItems: "center", gap: 18, padding: "18px 20px", opacity: demo ? 0.85 : 1 }}
    >
      <div style={{ width: 40, height: 40, borderRadius: 10, background: running ? "var(--w-primary-soft)" : "var(--w-bg-alternative)", color: running ? "var(--w-primary-normal)" : "var(--w-fg-alternative)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
        <Icon name="chart" size={20} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
          <span className={`chip chip--${statusInfo.chip}`}><span className="chip__dot" />{statusInfo.label}</span>
          <span className="chip chip--neutral">{axisLabel} 축</span>
          {demo && <span className="chip chip--neutral" style={{ opacity: 0.7 }}>예시</span>}
        </div>
        <div style={{ font: "600 14px/1.4 var(--w-font-sans)", color: "var(--w-fg-strong)", marginBottom: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {c.headline ?? c.name}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "16px 1fr", gap: "4px 8px", font: "500 12.5px/1.4 var(--w-font-sans)", color: "var(--w-fg-neutral)" }}>
          <span style={{ color: "var(--w-fg-alternative)", fontSize: 10, fontWeight: 700, placeSelf: "center" }}>A</span>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.abTestVariantA ?? "—"}</span>
          <span style={{ color: "var(--w-primary-normal)", fontSize: 10, fontWeight: 700, placeSelf: "center" }}>B</span>
          <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.abTestVariantB ?? "—"}</span>
        </div>
      </div>

      <Icon name="arrow-right" size={16} style={{ color: "var(--w-fg-alternative)", flex: "0 0 auto" }} />
    </button>
  );
}

function EmptyCard({ icon, title, sub, ctaLabel, onAction }: { icon: import("@shared/ui/Icon").IconName; title: string; sub: string; ctaLabel: string; onAction: () => void }) {
  return (
    <div className="card" style={{ padding: "48px 32px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: "var(--w-bg-alternative)", color: "var(--w-fg-alternative)", display: "grid", placeItems: "center" }}>
        <Icon name={icon} size={24} />
      </div>
      <div style={{ font: "700 17px/1.3 var(--w-font-sans)", color: "var(--w-fg-strong)" }}>{title}</div>
      <div style={{ font: "500 13px/1.5 var(--w-font-sans)", color: "var(--w-fg-neutral)", maxWidth: 380 }}>{sub}</div>
      <button className="btn btn--secondary" type="button" style={{ marginTop: 8 }} onClick={onAction}>{ctaLabel}</button>
    </div>
  );
}
