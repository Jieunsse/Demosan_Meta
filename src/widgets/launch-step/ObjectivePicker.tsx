"use client";

// 디테일 모드 전용 — 6개 캠페인 목표 라디오 칩 + Phase 2 "곧 열려요" 카드 + 카피 부합성 callout.
// PRD §5.4.1.

import { useState } from "react";
import Icon from "@shared/ui/Icon";
import { Badge } from "@shared/ui/primitives";
import { useToast } from "@shared/ui/Toast";
import { OBJECTIVES_PHASE1, OBJECTIVES_PHASE2 } from "@entities/creative/options";
import { useCreativeDraft } from "@entities/creative/model";
import SubHead from "./SubHead";

interface Props {
  /** STEP 01 카피 다시 만들기 — 카피 부합성 callout 의 링크. */
  goCreative: () => void;
}

export default function ObjectivePicker({ goCreative }: Props) {
  const creative = useCreativeDraft();
  const showToast = useToast();
  const [phase2Inspect, setPhase2Inspect] = useState<typeof OBJECTIVES_PHASE2[number]["id"] | null>(null);
  const [phase2Email, setPhase2Email] = useState("");

  // STEP 01 outcome 매핑 vs 현재 선택된 목표 비교 — 다르면 카피 톤 부합성 경고.
  const expectedObjective = creative.state.outcomeChip
    ? OBJECTIVES_PHASE1.find((o) => o.id === creative.state.outcomeChip)?.metaObjective
    : null;
  const objectiveMismatch =
    !!creative.state.outcomeChip &&
    !!creative.state.objective &&
    !!expectedObjective &&
    creative.state.objective !== expectedObjective;

  return (
    <>
      <SubHead title="캠페인 목표" subtitle="6개 중 하나를 골라요. Phase 2 목표는 곧 열려요." />
      <div className="chips" style={{ marginBottom: 12 }}>
        {OBJECTIVES_PHASE1.map((o) => (
          <button
            key={o.id}
            type="button"
            className={"chip" + (creative.state.objective === o.metaObjective ? " chip--on" : "")}
            onClick={() => {
              setPhase2Inspect(null);
              creative.dispatch({ type: "SET_OBJECTIVE", objective: o.metaObjective });
            }}
            title={o.copyTone}
          >
            {o.label}
          </button>
        ))}
        {OBJECTIVES_PHASE2.map((o) => (
          <button
            key={o.id}
            type="button"
            className={"chip" + (phase2Inspect === o.id ? " chip--on" : "")}
            onClick={() => setPhase2Inspect((curr) => (curr === o.id ? null : o.id))}
            style={{ opacity: phase2Inspect === o.id ? 1 : 0.7 }}
            title={o.reason}
          >
            {o.label} <Icon name="lock" size={11} style={{ marginLeft: 4 }} />
          </button>
        ))}
      </div>

      {phase2Inspect && (() => {
        const o = OBJECTIVES_PHASE2.find((x) => x.id === phase2Inspect)!;
        return (
          <div className="card" style={{ background: "var(--w-accent-violet-soft)", borderColor: "transparent", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(101,65,242,0.16)", color: "var(--w-accent-violet)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
                <Icon name="sparkles" size={18} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <Badge kind="violet">Coming Soon</Badge>
                  <span style={{ font: "600 13.5px/1.3 var(--w-font-sans)", color: "var(--w-fg-strong)" }}>{o.label} 광고는 곧 열려요</span>
                </div>
                <p style={{ font: "500 12.5px/1.55 var(--w-font-sans)", color: "var(--w-fg-neutral)", margin: "0 0 12px" }}>
                  {o.reason}. 열리면 알림받기.
                </p>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    className="input"
                    type="email"
                    placeholder="이메일 주소"
                    value={phase2Email}
                    onChange={(e) => setPhase2Email(e.target.value)}
                    style={{ flex: 1 }}
                  />
                  <button
                    className="btn btn--primary btn--sm"
                    type="button"
                    disabled={!phase2Email.trim()}
                    onClick={() => {
                      // 실 알림 채널은 후속. Phase 1엔 토스트 + 콘솔로 충분 (PRD §5.4.1)
                      console.log("[phase2 notify]", { objective: o.id, email: phase2Email.trim() });
                      showToast(`${o.label} 광고가 열리면 알림드릴게요`);
                      setPhase2Email("");
                      setPhase2Inspect(null);
                    }}
                  >
                    알림받기
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {objectiveMismatch && expectedObjective && (
        <div className="callout callout--warn" style={{ marginBottom: 14 }}>
          <Icon name="warn" size={16} />
          <div style={{ font: "500 12.5px/1.5 var(--w-font-sans)", flex: 1 }}>
            AI가 추천한 목표는 <strong>{OBJECTIVES_PHASE1.find((o) => o.metaObjective === expectedObjective)?.label}</strong>이었어요.
            변경한 목표(<strong>{OBJECTIVES_PHASE1.find((o) => o.metaObjective === creative.state.objective)?.label}</strong>)에는 카피 톤이 안 맞을 수 있어요.
          </div>
          <button className="btn btn--ghost btn--sm" type="button" onClick={goCreative}>
            STEP 01에서 카피 다시 만들기 <Icon name="arrow-right" size={13} />
          </button>
        </div>
      )}
    </>
  );
}
