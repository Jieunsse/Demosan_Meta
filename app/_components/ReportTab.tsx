"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useCreative, type LaunchedCampaign } from "./CreativeProvider";
import { useApiMutation } from "../_hooks/useApiMutation";
import { useToast } from "./Toast";
import PerformanceChart from "./PerformanceChart";
import { suggestOptimizations, assessAutomationReadiness, type Suggestion } from "@/lib/optimization";

interface Props {
  onNew: () => void;
}

type Insights = {
  impressions: number;
  clicks: number;
  ctr: number;
  spend: number;
  daily: { date: string; clicks: number; ctr: number; spend: number }[];
};

type ControlParams = {
  campaignId: string;
  adSetId: string;
  adId: string;
  action: "pause" | "resume" | "set-daily-budget";
  dailyBudget?: number;
};
type ControlResult = { ok: true; status?: "ACTIVE" | "PAUSED"; dailyBudget?: number };

const won = (n: number) => `₩${Math.round(n).toLocaleString("ko-KR")}`;

// "성과 예시 미리보기"용 목업 — 실제 데이터가 아니에요.
const MOCK_LAUNCHED: LaunchedCampaign = {
  campaignId: "예시 캠페인",
  adSetId: "예시",
  adId: "예시",
  dailyBudget: 30_000,
  startDate: "2026-05-04",
  endDate: "2026-05-10",
  status: "ACTIVE",
};
// 양호 예시 — 지표가 자동화에 충분 (readiness: ready)
const MOCK_INSIGHTS_GOOD: Insights = {
  impressions: 48_291,
  clicks: 1_371,
  ctr: 2.84,
  spend: 127_400,
  daily: [
    { date: "2026-05-04", clicks: 180, ctr: 2.5, spend: 16_800 },
    { date: "2026-05-05", clicks: 210, ctr: 2.7, spend: 19_200 },
    { date: "2026-05-06", clicks: 195, ctr: 2.6, spend: 18_100 },
    { date: "2026-05-07", clicks: 220, ctr: 2.9, spend: 20_400 },
    { date: "2026-05-08", clicks: 198, ctr: 2.8, spend: 18_800 },
    { date: "2026-05-09", clicks: 178, ctr: 2.7, spend: 17_300 },
    { date: "2026-05-10", clicks: 190, ctr: 2.84, spend: 16_800 },
  ],
};
// 개선 필요 예시 — 노출·클릭 부족 + CTR 낮음 (readiness: not ready) → "일시정지" 제안
const MOCK_INSIGHTS_POOR: Insights = {
  impressions: 8_240,
  clicks: 47,
  ctr: 0.57,
  spend: 19_800,
  daily: [
    { date: "2026-05-06", clicks: 12, ctr: 0.62, spend: 4_100 },
    { date: "2026-05-07", clicks: 11, ctr: 0.59, spend: 4_000 },
    { date: "2026-05-08", clicks: 9, ctr: 0.55, spend: 3_900 },
    { date: "2026-05-09", clicks: 8, ctr: 0.54, spend: 3_900 },
    { date: "2026-05-10", clicks: 7, ctr: 0.52, spend: 3_900 },
  ],
};

export default function ReportTab({ onNew }: Props) {
  const { state, dispatch } = useCreative();
  const realLaunched = state.launchedCampaign;
  const [preview, setPreview] = useState(false);
  const [previewVariant, setPreviewVariant] = useState<"good" | "poor">("good");
  const showToast = useToast();

  const q = useQuery<Insights>({
    queryKey: ["insights", realLaunched?.campaignId],
    enabled: !!realLaunched,
    queryFn: async () => {
      const res = await fetch(`/api/insights/${realLaunched!.campaignId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error((data as { error?: string }).error ?? "성과를 불러오지 못했어요");
      }
      return data as Insights;
    },
  });

  const control = useApiMutation<ControlParams, ControlResult>("/api/campaign/control");

  const isPreview = !realLaunched && preview;

  const applyControl = (
    params: Omit<ControlParams, "campaignId" | "adSetId" | "adId">,
    successMsg: string,
  ) => {
    if (!realLaunched) return;
    control.mutate(
      { campaignId: realLaunched.campaignId, adSetId: realLaunched.adSetId, adId: realLaunched.adId, ...params },
      {
        onSuccess: (res) => {
          dispatch({
            type: "SET_LAUNCHED_CAMPAIGN",
            value: {
              ...realLaunched,
              ...(res.status ? { status: res.status } : {}),
              ...(typeof res.dailyBudget === "number" ? { dailyBudget: res.dailyBudget } : {}),
            },
          });
          showToast(successMsg);
          q.refetch();
        },
        onError: (err) => showToast(err instanceof Error ? err.message : "적용에 실패했어요"),
      },
    );
  };

  // ── 빈 상태 (실제 캠페인 없음 + 미리보기도 아님) ──
  if (!realLaunched && !preview) {
    return (
      <div className="report-screen">
        <div className="success-card" style={{ borderStyle: "dashed", maxWidth: 520, margin: "0 auto" }}>
          <span className="success-icon" aria-hidden="true" style={{ background: "rgba(79,126,255,0.08)", color: "var(--text-muted)" }}>
            📊
          </span>
          <h2 className="success-title" style={{ color: "var(--text-secondary)" }}>아직 집행한 광고가 없어요</h2>
          <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
            &lsquo;광고 집행&rsquo; 탭에서 광고를 등록하면 여기서 실제 성과를 확인하고 최적화 제안을 받을 수 있어요.
          </p>
          <button className="btn btn--ghost" type="button" onClick={onNew}>
            새 소재 만들기
          </button>
          <button className="btn btn--ghost" type="button" onClick={() => setPreview(true)}>
            성과 예시 미리보기
          </button>
        </div>
      </div>
    );
  }

  // ── 여기부터: 실제 캠페인이 있거나, 예시 미리보기 모드 ──
  const launched: LaunchedCampaign = realLaunched ?? MOCK_LAUNCHED;

  const headerEl = (
    <header className="campaign-bar">
      <div className="campaign-bar__left">
        <h1 className="campaign-bar__name">{state.headline}</h1>
        {isPreview ? (
          <span className="badge badge--neutral">예시</span>
        ) : launched.status === "PAUSED" ? (
          <span className="badge badge--warning">일시정지</span>
        ) : (
          <span className="badge badge--neutral">게재 중(또는 검토 중)</span>
        )}
        <span className="badge badge--neutral mono">{launched.campaignId}</span>
      </div>
      <div className="campaign-bar__right">
        <time className="campaign-bar__period">{launched.startDate} ~ {launched.endDate}</time>
        {isPreview ? (
          <button className="text-btn" type="button" onClick={() => setPreview(false)}>
            ← 예시 닫기
          </button>
        ) : (
          <button className="text-btn" type="button" onClick={() => q.refetch()} disabled={q.isFetching}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="23 4 23 10 17 10" />
              <polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10" />
              <path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14" />
            </svg>
            {q.isFetching ? "불러오는 중…" : "성과 새로고침"}
          </button>
        )}
      </div>
    </header>
  );

  // ── 실제 캠페인일 때만: 로딩/에러/데이터없음 분기 ──
  if (realLaunched) {
    if (q.isLoading) {
      return (
        <div className="report-screen">
          {headerEl}
          <div style={{ textAlign: "center", padding: "var(--space-8) 0", color: "var(--text-muted)" }}>
            <span className="check-row__spinner" style={{ display: "inline-block" }} />
            <p style={{ marginTop: 12, fontSize: 13 }}>성과를 불러오는 중…</p>
          </div>
        </div>
      );
    }
    if (q.isError || !q.data) {
      return (
        <div className="report-screen">
          {headerEl}
          <div className="success-card" style={{ borderColor: "var(--warning)", maxWidth: 520, margin: "0 auto" }}>
            <span className="success-icon" aria-hidden="true" style={{ background: "rgba(255,160,60,0.12)", color: "var(--warning)" }}>✕</span>
            <h2 className="success-title" style={{ color: "var(--warning)" }}>성과를 불러오지 못했어요</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", margin: 0 }}>
              {q.error instanceof Error ? q.error.message : "알 수 없는 오류"}
            </p>
            <button className="btn btn--primary" type="button" onClick={() => q.refetch()}>다시 시도</button>
          </div>
        </div>
      );
    }
    if (q.data.daily.length === 0) {
      return (
        <div className="report-screen">
          {headerEl}
          <div className="success-card" style={{ borderStyle: "dashed", maxWidth: 560, margin: "0 auto" }}>
            <span className="success-icon" aria-hidden="true" style={{ background: "rgba(79,126,255,0.08)", color: "var(--accent)" }}>⏳</span>
            <h2 className="success-title">아직 성과 데이터가 없어요</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", textAlign: "center", margin: 0, lineHeight: 1.7 }}>
              Meta가 광고를 검토하고 집계를 준비하고 있어요.<br />
              심사를 통과해 게재가 시작되고 노출이 쌓이면 여기에 표시돼요.<br />
              <span style={{ color: "var(--text-muted)" }}>보통 수 분 ~ 수 시간 걸리고, 데이터는 몇 시간 단위로 업데이트돼요.</span>
            </p>
            <button className="btn btn--primary" type="button" onClick={() => q.refetch()} disabled={q.isFetching}>
              {q.isFetching ? "확인 중…" : "성과 새로고침"}
            </button>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>Campaign ID · {launched.campaignId}</p>
          </div>
        </div>
      );
    }
  }

  // ── 데이터 뷰 (실제 데이터 또는 예시 목업) ──
  const d: Insights = isPreview
    ? previewVariant === "good"
      ? MOCK_INSIGHTS_GOOD
      : MOCK_INSIGHTS_POOR
    : (q.data as Insights);
  const kpis = [
    { label: "노출수", value: d.impressions.toLocaleString("ko-KR"), unit: "회" },
    { label: "클릭수", value: d.clicks.toLocaleString("ko-KR"), unit: "회" },
    { label: "CTR", value: d.ctr.toFixed(2), unit: "%" },
    { label: "총 지출", value: won(d.spend), unit: "" },
  ];
  const metricSnapshot = { impressions: d.impressions, clicks: d.clicks, ctr: d.ctr, spend: d.spend };
  const suggestions: Suggestion[] = suggestOptimizations(metricSnapshot, launched.dailyBudget);
  const readiness = assessAutomationReadiness(metricSnapshot, d.daily.length);
  const busy = control.isPending;

  return (
    <div className="report-screen">
      {headerEl}

      {isPreview && (
        <div
          className="card"
          style={{ padding: "var(--space-4)", borderStyle: "dashed", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <span aria-hidden="true" style={{ fontSize: 18, flexShrink: 0 }}>👀</span>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, flex: 1, wordBreak: "keep-all" }}>
              <strong>예시 데이터예요.</strong> 실제 광고를 집행하면 진짜 성과가 표시되고, 최적화 제안의 적용 버튼이 활성화돼요.
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>예시 시나리오</span>
            <div className="segmented" role="radiogroup" aria-label="예시 시나리오" style={{ alignSelf: "flex-start" }}>
              {[
                { v: "good" as const, label: "양호 예시" },
                { v: "poor" as const, label: "개선 필요 예시" },
              ].map(({ v, label }) => (
                <button
                  key={v}
                  className="segmented__opt"
                  type="button"
                  role="radio"
                  aria-checked={previewVariant === v}
                  onClick={() => setPreviewVariant(v)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <ul className="kpi-grid">
        {kpis.map(({ label, value, unit }) => (
          <li key={label} className="kpi-card">
            <p className="kpi-card__label">{label}</p>
            <p className="kpi-card__value">
              {value}
              {unit && <span className="kpi-card__value-unit">{unit}</span>}
            </p>
          </li>
        ))}
      </ul>

      {/* 자동화 & 최적화 */}
      <section className="card" style={{ padding: "var(--space-5)" }}>
        <h2 className="sec__head" style={{ marginBottom: "var(--space-3)", justifyContent: "flex-start", gap: "6px" }}>
          <span aria-hidden="true">✦</span> 자동화 &amp; 최적화
        </h2>

        {!isPreview && launched.status === "PAUSED" ? (
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-4)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-2)",
            }}
          >
            <p style={{ margin: 0, fontWeight: 600, color: "var(--text-primary)" }}>이 광고는 일시정지 상태예요</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, wordBreak: "keep-all" }}>
                다시 게재하려면 재개하거나, 성과가 부진했다면 새 소재로 다시 만드는 걸 권해요.
              </p>
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, wordBreak: "keep-all" }}>
                Meta 광고 관리자에서 외부로 상태가 바뀌었다면 새로고침 후 다시 확인해주세요.
              </p>
            </div>
            <div style={{ display: "flex", gap: "8px", marginTop: "4px", flexWrap: "wrap" }}>
              <button
                className="btn btn--primary"
                type="button"
                disabled={busy}
                onClick={() => applyControl({ action: "resume" }, "광고를 다시 게재했어요")}
              >
                {busy ? "처리 중…" : "광고 재개"}
              </button>
              <button className="btn btn--ghost" type="button" disabled={busy} onClick={onNew}>
                새 소재로 다시 만들기
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {/* 자동화 준비도 */}
            {readiness.ready ? (
              <div
                style={{
                  border: "1px solid rgba(34,197,94,0.4)",
                  background: "rgba(34,197,94,0.07)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-4)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                <p style={{ margin: 0, fontWeight: 600, color: "var(--text-primary)" }}>
                  <span aria-hidden="true">✅ </span>자동화 준비 완료 — 이 캠페인을 자동화에 맡길 수 있어요
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, wordBreak: "keep-all" }}>
                    {readiness.reason}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, wordBreak: "keep-all" }}>
                    자동화를 켜면 성과 기준에 따라 일시정지·예산조정이 마케터 승인 없이 자동으로 적용돼요.
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px", flexWrap: "wrap" }}>
                  <button className="btn btn--primary" type="button" disabled title="자동 실행 환경 연동 후 활성화돼요">
                    자동화 켜기
                  </button>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>(자동 실행 환경 연동 후 활성화돼요)</span>
                </div>
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-4)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <p style={{ margin: 0, fontWeight: 600, color: "var(--text-primary)" }}>
                  <span aria-hidden="true">📊 </span>아직 자동화를 맡기기엔 지표가 아쉬워요
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, wordBreak: "keep-all" }}>
                    부족: {readiness.reason}.
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, wordBreak: "keep-all" }}>
                    데이터가 더 쌓이고 성과가 안정되면 자동화를 제안해드릴게요.
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, wordBreak: "keep-all" }}>
                    그동안은 아래 제안을 참고해 직접 조정해보세요.
                  </p>
                </div>
              </div>
            )}

            {suggestions.map((s, i) => {
              const warn = s.severity === "warn";
              return (
                <div
                  key={i}
                  style={{
                    border: `1px solid ${warn ? "rgba(245,158,11,0.35)" : "var(--border)"}`,
                    background: warn ? "rgba(245,158,11,0.06)" : "transparent",
                    borderRadius: "var(--radius-md)",
                    padding: "var(--space-4)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <p style={{ margin: 0, fontWeight: 600, color: warn ? "var(--warning)" : "var(--text-primary)" }}>
                    {warn && <span aria-hidden="true">⚠ </span>}
                    {s.title}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {s.detail.map((line, j) => (
                      <p key={j} style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, wordBreak: "keep-all" }}>
                        {line}
                      </p>
                    ))}
                  </div>

                  {s.kind === "pause" && (
                    <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                      <button
                        className="btn btn--warning-outline"
                        type="button"
                        disabled={busy || isPreview}
                        onClick={() => applyControl({ action: "pause" }, "광고를 일시정지했어요")}
                      >
                        {busy ? "처리 중…" : "광고 일시정지"}
                      </button>
                      <button className="btn btn--ghost" type="button" disabled={busy} onClick={onNew}>
                        새 소재로 다시 만들기
                      </button>
                    </div>
                  )}

                  {s.kind === "increase-budget" && (
                    <div style={{ display: "flex", gap: "8px", marginTop: "6px", flexWrap: "wrap" }}>
                      <button
                        className="btn btn--primary"
                        type="button"
                        disabled={busy || isPreview}
                        onClick={() =>
                          applyControl(
                            { action: "set-daily-budget", dailyBudget: s.toDailyBudget },
                            `일일예산을 ${won(s.toDailyBudget)}로 올렸어요`,
                          )
                        }
                      >
                        {busy ? "처리 중…" : `일일예산 ${won(s.toDailyBudget)}로 올리기`}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="sec__hint" style={{ marginTop: "var(--space-3)", lineHeight: 1.6, maxWidth: "72ch", wordBreak: "keep-all" }}>
          {isPreview
            ? "예시 모드 — 적용 버튼은 실제 광고를 집행하면 활성화돼요."
            : <>제안은 마케터가 확인한 뒤 버튼으로 적용돼요 — 자동으로 바뀌지 않아요. 현재 일일예산: <span className="mono">{won(launched.dailyBudget)}</span></>}
        </p>
      </section>

      <PerformanceChart data={d.daily.map((x) => ({ date: x.date, clicks: x.clicks, ctr: x.ctr }))} />

      <section className="card" style={{ padding: "var(--space-5)" }}>
        <h2 className="sec__head" style={{ marginBottom: "var(--space-3)" }}>일별 상세</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "var(--text-muted)" }}>
                <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600 }}>날짜</th>
                <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600 }}>클릭</th>
                <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600 }}>CTR</th>
                <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 600 }}>지출</th>
              </tr>
            </thead>
            <tbody>
              {d.daily.map((x) => (
                <tr key={x.date} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ textAlign: "left", padding: "6px 8px" }}>{x.date}</td>
                  <td className="mono" style={{ textAlign: "right", padding: "6px 8px" }}>{x.clicks.toLocaleString("ko-KR")}</td>
                  <td className="mono" style={{ textAlign: "right", padding: "6px 8px" }}>{x.ctr.toFixed(2)}%</td>
                  <td className="mono" style={{ textAlign: "right", padding: "6px 8px" }}>{won(x.spend)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="sec__hint" style={{ marginTop: "var(--space-3)" }}>
          {isPreview ? "예시 데이터" : "Meta 인사이트 기준 · 데이터는 몇 시간 단위로 갱신돼요"}
        </p>
      </section>

      <footer className="report-actions">
        {isPreview && (
          <button className="btn btn--ghost" type="button" onClick={() => setPreview(false)}>
            ← 예시 닫기
          </button>
        )}
        <button className="btn btn--primary" type="button" onClick={onNew}>
          <span aria-hidden="true">✨</span> 새 소재로 다시 만들기
        </button>
      </footer>
    </div>
  );
}
