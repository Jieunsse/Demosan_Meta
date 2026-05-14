"use client";

// PRD §5.1·§5.2 — 카드 상단 세그먼티드 토글 (간단 ↔ 디테일).
// 간단 → 디테일은 자유 전환. 디테일 → 간단은 ConfirmModal 로 데이터 손실 안내 후 디테일 입력 reset.

import { useState } from "react";
import Icon from "@shared/ui/Icon";
import ConfirmModal from "@shared/ui/ConfirmModal";
import { useLaunchDraft } from "@entities/campaign/model";

export default function ModeToggle() {
  const { state, dispatch } = useLaunchDraft();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleSwitch = (target: "simple" | "detailed") => {
    if (target === state.mode) return;
    if (state.mode === "detailed" && target === "simple") {
      setConfirmOpen(true);
      return;
    }
    dispatch({ type: "SET_MODE", mode: target });
  };

  const confirmSwitchToSimple = () => {
    dispatch({ type: "RESET_DETAIL_FIELDS" });
    dispatch({ type: "SET_MODE", mode: "simple" });
    setConfirmOpen(false);
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
        <div className="seg" role="tablist" aria-label="광고 집행 설정 모드">
          <button
            type="button"
            className={state.mode === "simple" ? "on" : ""}
            onClick={() => handleSwitch("simple")}
            role="tab"
            aria-selected={state.mode === "simple"}
          >
            <Icon name="sparkles" size={13} /> 간단 설정
          </button>
          <button
            type="button"
            className={state.mode === "detailed" ? "on" : ""}
            onClick={() => handleSwitch("detailed")}
            role="tab"
            aria-selected={state.mode === "detailed"}
          >
            <Icon name="settings" size={13} /> 디테일 설정
          </button>
        </div>
        <span style={{ font: "500 12px/1.4 var(--w-font-sans)", color: "var(--w-fg-neutral)" }}>
          {state.mode === "simple"
            ? "최소 입력으로 빨리 집행해요. 캠페인 목표는 AI가 알아서 골라요."
            : "캠페인 목표·입찰·맞춤 타겟·플레이스먼트를 직접 골라요."}
        </span>
      </div>

      {confirmOpen && (
        <ConfirmModal
          title="간단 설정으로 이동할까요?"
          desc={
            <>
              디테일 설정에서 입력한 값이 사라져요:
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                <li>입찰 전략 · 입력 금액</li>
                <li>맞춤 타겟 · 유사 타겟</li>
                <li>플레이스먼트 (수동 선택 시)</li>
                <li>자동 광고중단 · A/B 소재 시험</li>
              </ul>
            </>
          }
          confirmLabel="간단으로 이동"
          cancelLabel="취소"
          tone="danger"
          onClose={() => setConfirmOpen(false)}
          onConfirm={confirmSwitchToSimple}
        />
      )}
    </>
  );
}
