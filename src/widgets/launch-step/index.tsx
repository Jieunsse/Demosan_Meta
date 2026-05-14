"use client";

// STEP 02 광고 집행 widget. ADR-001 §"후속 결정" deepening ③.
// 이 파일은 폼 레이아웃 오케스트레이터 — 모드 토글, 디테일 분기, 폼 입력(랜딩 URL · 예산 · 일정 · 타겟 · 게재 상태),
// 좌측 카드(설정) + 우측 컬럼(상태 + 요약) 의 자리 잡기. 각 노브/카드/패널은 sub-component 가 자기 슬라이스 hook 으로 접근.
//
// page.tsx 는 navigation 콜백 3 개만 전달:
//   - onNext     → STEP 03 으로
//   - goSettings → /setup (계정 연결 페이지)
//   - goCreative → STEP 01 로 (카피 부합성 callout 의 링크용)

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import Icon from "@shared/ui/Icon";
import AgeRange from "@shared/ui/AgeRange";
import { fmt } from "@shared/lib/format";
import { fmtBudget } from "@shared/lib/launch-utils";
import { COUNTRIES } from "@shared/lib/geo-options";
import { useLaunchCampaign } from "@widgets/launch-step/useLaunchCampaign";
import { useCreativeDraft } from "@entities/creative/model";
import { useLaunchDraft } from "@entities/campaign/model";
import { gendersToUi, uiToGenders, type Gender } from "@shared/lib/meta/targeting";
import { calcDaysBetween, estimateImpressionRange } from "@entities/insights/budget-estimates";

import SubHead from "./SubHead";
import ModeToggle from "./ModeToggle";
import ObjectivePicker from "./ObjectivePicker";
import DetailKnobs from "./DetailKnobs";
import CreativePreview from "./CreativePreview";
import SummaryCard from "./SummaryCard";
import LaunchStatusPanel from "./LaunchStatusPanel";

const GENDER_OPTS: [Gender, string][] = [["all", "전체"], ["male", "남성"], ["female", "여성"]];

interface Props {
  onNext: () => void;
  goSettings: () => void;
  /** PRD §5.4.1 — 디테일에서 목표 변경했을 때 STEP 01 카피 다시 만들기 링크 (Q6 결정). */
  goCreative: () => void;
}

export default function LaunchStep({ onNext, goSettings, goCreative }: Props) {
  const creative = useCreativeDraft();
  const launch = useLaunchDraft();
  const state = launch.state;
  const dispatch = launch.dispatch;

  // STEP 02 진입 시 — STEP 01 AI 가 채운 타겟팅으로 연령·성별 기본값을 한 번만 prefill.
  const targeting = creative.state.targeting;
  useEffect(() => {
    if (!targeting) return;
    dispatch({ type: "SET_AGE_RANGE", min: targeting.ageMin, max: targeting.ageMax });
    dispatch({ type: "SET_GENDER", value: gendersToUi(targeting.genders) });
  }, [targeting, dispatch]);

  // 외부 정보 — 세션·집행 mutation.
  const { data: session } = useSession();
  const accountConnected = !!(session?.adAccountId && session?.pageId);
  const { mutation: launchMutation } = useLaunchCampaign();

  const handleLaunch = () => {
    const dailyBudget = parseInt(state.budget.replace(/[^\d]/g, ""), 10) || 0;
    launchMutation.mutate(
      {
        headline: creative.state.headline,
        primaryText: creative.state.primaryText,
        dailyBudget,
        startDate: state.dateStart,
        endDate: state.dateEnd,
        ageMin: state.ageMin,
        ageMax: state.ageMax,
        genders: uiToGenders(state.gender),
        countries: state.countries,
        linkUrl: state.landingUrl.trim(),
        cta: creative.state.cta,
        status: state.delivery,
        imageDataUrl: state.imageDataUrl ?? undefined,
        // PRD §5.5 — 디테일 모드면 state의 값을, 간단 모드면 기본값 전송
        objective: creative.state.objective ?? "OUTCOME_TRAFFIC",
        mode: state.mode,
        bidStrategy: state.mode === "detailed" ? state.bidStrategy : undefined,
        bidAmount: state.mode === "detailed" ? (state.bidAmount ?? undefined) : undefined,
        placements: state.mode === "detailed" ? state.placements : undefined,
        platforms: state.platforms,
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
              startDate: state.dateStart,
              endDate: state.dateEnd,
              status: state.delivery,
              objective: creative.state.objective ?? "OUTCOME_TRAFFIC",
            },
          });
        },
      },
    );
  };

  // 파생값 — UI 표시·집행 가능 조건.
  const budgetNum = parseInt(state.budget.replace(/[^\d]/g, ""), 10) || 0;
  const days = calcDaysBetween(state.dateStart, state.dateEnd);
  const { min: impMin, max: impMax } = estimateImpressionRange(budgetNum, days);
  const httpsOk = state.landingUrl.trim().startsWith("https://");
  const hasCreative = creative.state.headline.trim().length > 0;
  const canLaunch = accountConnected && hasCreative && httpsOk && state.countries.length > 0 && !launchMutation.isPending && !state.launchedCampaign;

  const toggleCountry = (code: string) => {
    const next = state.countries.includes(code)
      ? state.countries.filter((c) => c !== code)
      : [...state.countries, code];
    dispatch({ type: "SET_COUNTRIES", value: next });
  };

  return (
    <>
      <ModeToggle />

      <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 20, alignItems: "flex-start" }}>
        {/* Left: form */}
        <div className="card card--lg">
          <h2 className="section-title">광고 집행 설정</h2>
          <p className="section-sub">
            {state.mode === "detailed"
              ? "캠페인 목표를 고르고 입찰·타겟·플레이스먼트를 세부 조정해요."
              : "예산·기간·타겟을 확인하고 Meta에 광고를 집행하세요."}
          </p>
          <hr className="divider" />

          {state.mode === "detailed" && (
            <>
              <ObjectivePicker goCreative={goCreative} />
              <DetailKnobs />
              <hr className="divider" />
            </>
          )}

          <CreativePreview />

          <hr className="divider" />
          <SubHead title="광고 클릭 시 보여줄 페이지" subtitle="광고를 누른 사용자가 이동할 URL 이에요." />
          <input
            className="input"
            value={state.landingUrl}
            onChange={(e) => dispatch({ type: "SET_LANDING_URL", value: e.target.value })}
            placeholder="https://example.com/landing"
            type="url"
            inputMode="url"
          />
          {!httpsOk && (
            <div className="field__hint field__hint--err" style={{ marginTop: 8 }}>
              https:// 로 시작해야 해요.
            </div>
          )}

          <hr className="divider" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div>
              <SubHead title="일일 예산" />
              <div className="input--addon">
                <span className="addon">₩</span>
                <input
                  value={state.budget}
                  onChange={(e) => dispatch({ type: "SET_BUDGET", value: fmtBudget(e.target.value) })}
                  inputMode="numeric"
                  placeholder="50,000"
                  aria-label="일일 예산"
                />
              </div>
              <div className="field__hint" style={{ marginTop: 8 }}>최소 ₩10,000부터 설정할 수 있어요.</div>
            </div>
            <div>
              <SubHead title="집행 기간" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}>
                <input
                  type="date"
                  className="input"
                  value={state.dateStart}
                  onChange={(e) => dispatch({ type: "SET_DATE_START", value: e.target.value })}
                  aria-label="시작일"
                />
                <span style={{ color: "var(--w-fg-neutral)" }}>—</span>
                <input
                  type="date"
                  className="input"
                  value={state.dateEnd}
                  onChange={(e) => dispatch({ type: "SET_DATE_END", value: e.target.value })}
                  aria-label="종료일"
                />
              </div>
              <div className="field__hint" style={{ marginTop: 8 }}>총 {days}일 · 예상 노출 {fmt(impMin)}–{fmt(impMax)}</div>
            </div>
          </div>

          <hr className="divider" />
          <SubHead title="타겟" subtitle="AI가 채워둔 값이에요. 그대로 두거나 조정해도 돼요." />
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label className="field__label" style={{ marginBottom: 10 }}>연령</label>
              {targeting && (
                <div className="field__hint" style={{ color: "var(--w-primary-press)", marginBottom: 8 }}>
                  ✦ &lsquo;누구에게 보여줄 광고인가요&rsquo; 입력 내용에서 자동으로 채웠어요 · 수정 가능
                </div>
              )}
              <AgeRange
                value={[state.ageMin, state.ageMax]}
                onChange={(v) => dispatch({ type: "SET_AGE_RANGE", min: v[0], max: v[1] })}
              />
            </div>
            <div>
              <label className="field__label" style={{ marginBottom: 8 }}>성별</label>
              <div className="chips">
                {GENDER_OPTS.map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    className={"chip" + (state.gender === k ? " chip--on" : "")}
                    onClick={() => dispatch({ type: "SET_GENDER", value: k })}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="field__label" style={{ marginBottom: 8 }}>지역 (국가, 복수 선택)</label>
              <div className="chips">
                {COUNTRIES.map((c) => {
                  const on = state.countries.includes(c.code);
                  return (
                    <button
                      key={c.code}
                      type="button"
                      className={"chip" + (on ? " chip--accent" : "")}
                      onClick={() => toggleCountry(c.code)}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
              {state.countries.length === 0 && (
                <div className="field__hint field__hint--warn" style={{ marginTop: 8 }}>최소 1개 국가를 선택해주세요.</div>
              )}
            </div>
            {state.mode === "simple" && (
              <div>
                <label className="field__label" style={{ marginBottom: 8 }}>광고 플랫폼</label>
                <div className="chips" style={{ marginBottom: 8 }}>
                  {([
                    { id: "both" as const, label: "페이스북 · 인스타그램 (권장)" },
                    { id: "facebook" as const, label: "페이스북만" },
                    { id: "instagram" as const, label: "인스타그램만" },
                  ]).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      className={"chip" + (state.platforms === opt.id ? " chip--on" : "")}
                      onClick={() => dispatch({ type: "SET_PLATFORMS", platforms: opt.id })}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <div className="field__hint" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Icon name="lock" size={12} />
                  선택한 플랫폼 안에서는 Meta Advantage+가 가장 반응이 좋은 위치에 자동 배치해요.
                </div>
              </div>
            )}
          </div>

          <hr className="divider" />
          <SubHead title="게재 상태" />
          <div className="seg" style={{ marginTop: 4 }}>
            <button
              type="button"
              className={state.delivery === "PAUSED" ? "on" : ""}
              onClick={() => dispatch({ type: "SET_DELIVERY", value: "PAUSED" })}
            >
              일시중지로 생성
            </button>
            <button
              type="button"
              className={state.delivery === "ACTIVE" ? "on" : ""}
              onClick={() => dispatch({ type: "SET_DELIVERY", value: "ACTIVE" })}
            >
              지금 바로 게재
            </button>
          </div>
          {state.delivery === "ACTIVE" && (
            <div className="field__hint field__hint--warn" style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center" }}>
              <Icon name="warn" size={14} />
              게재 즉시 Meta 정책 검토에 들어가요. 검토 통과 후 자동으로 노출과 광고비가 시작돼요.
            </div>
          )}

          <hr className="divider" />
          {!hasCreative && (
            <div className="field__hint field__hint--warn" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Icon name="warn" size={14} /> 아직 광고 소재가 없어요. STEP 01에서 소재를 만들면 집행할 수 있어요. (여기서는 설정 화면만 둘러볼 수 있어요.)
            </div>
          )}
          {!accountConnected && (
            <div className="field__hint field__hint--warn" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Icon name="warn" size={14} /> 광고 계정·페이지가 연결되지 않아 집행할 수 없어요.
              <button className="btn btn--ghost btn--sm" type="button" onClick={goSettings}>
                계정 연결하러 가기 →
              </button>
            </div>
          )}
          {launchMutation.isError && (
            <div className="callout callout--danger" style={{ marginBottom: 12 }}>
              <Icon name="warn" size={16} />
              <div style={{ font: "500 12.5px/1.5 var(--w-font-sans)" }}>{launchMutation.error?.message}</div>
            </div>
          )}
          <div className="between">
            <span style={{ font: "500 12px/1 var(--w-font-sans)", color: "var(--w-fg-neutral)", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Icon name="info" size={13} /> Meta 광고 정책 검토는 자동 진행돼요
            </span>
            <button className="btn btn--primary btn--lg" type="button" disabled={!canLaunch} onClick={handleLaunch}>
              {launchMutation.isPending ? (
                <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2.4 }} /> Meta에 전송 중…</>
              ) : (
                <><Icon name="megaphone" size={16} /> {state.delivery === "ACTIVE" ? "Meta에 광고 게재하기" : "Meta에 광고 등록하기 (일시중지)"}</>
              )}
            </button>
          </div>
        </div>

        {/* Right: status + summary */}
        <div style={{ position: "sticky", top: 20, display: "flex", flexDirection: "column", gap: 16 }}>
          <LaunchStatusPanel mutation={launchMutation} onNext={onNext} />
          <SummaryCard />
        </div>
      </div>
    </>
  );
}
