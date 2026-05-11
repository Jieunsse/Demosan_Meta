"use client";

import { useSession } from "next-auth/react";
import type { UseMutationResult } from "@tanstack/react-query";
import type { CampaignIds, LaunchParams } from "../_hooks/useLaunchCampaign";
import CampaignSuccessCard from "./CampaignSuccessCard";

type LaunchResponse = { campaignId: string; adSetId: string; adId: string };

type Props = {
  mutation: UseMutationResult<LaunchResponse, Error, LaunchParams>;
  campaignIds: CampaignIds | null;
  onNext: () => void;
};

export default function LaunchStatusPanel({ mutation, campaignIds, onNext }: Props) {
  const { data: session } = useSession();
  const adAccountName = session?.adAccountName;
  const adAccountId = session?.adAccountId;
  const pageName = session?.pageName;
  const connected = !!adAccountId && !!session?.pageId;

  return (
    <div className="panel--state" style={{ background: "transparent", padding: 0, gap: "var(--space-4)" }}>
      {mutation.isSuccess && campaignIds ? (
        <CampaignSuccessCard campaignIds={campaignIds} onNext={onNext} />
      ) : mutation.isError ? (
        <div className="success-card" style={{ borderColor: "var(--warning)" }}>
          <span className="success-icon" aria-hidden="true" style={{ background: "rgba(255,160,60,0.12)", color: "var(--warning)" }}>✕</span>
          <h2 className="success-title" style={{ color: "var(--warning)" }}>집행 중 오류가 발생했어요</h2>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", textAlign: "center", margin: 0 }}>
            {mutation.error?.message}
          </p>
          <button className="btn btn--primary" type="button" onClick={() => mutation.reset()}>다시 시도하기</button>
        </div>
      ) : (
        <div className="success-card" role="status" style={{ borderStyle: "dashed", opacity: mutation.isPending ? 0.6 : 1 }}>
          <span className="success-icon" aria-hidden="true" style={{ background: "rgba(79,126,255,0.08)", color: "var(--text-muted)" }}>
            {mutation.isPending
              ? <span className="check-row__spinner" style={{ width: 20, height: 20 }} aria-hidden="true" />
              : "📢"}
          </span>
          <h2 className="success-title" style={{ color: "var(--text-secondary)" }}>
            {mutation.isPending ? "Meta에 전송 중…" : "집행 설정 후 버튼을 눌러주세요"}
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-muted)", textAlign: "center", margin: 0 }}>
            {mutation.isPending
              ? "캠페인 · 광고 세트를 생성하고 있어요"
              : "좌측 설정을 완료하면 Meta 광고가 등록돼요"}
          </p>
        </div>
      )}

      {/* Summary card */}
      <section className="card" style={{ padding: "var(--space-5)" }}>
        <h2 className="sec__head" style={{ marginBottom: "var(--space-3)" }}>집행 요약</h2>
        <dl className="summary-list">
          {[
            { key: "캠페인 목표", val: "트래픽" },
            { key: "구매 유형", val: "경매 (Auction)" },
            { key: "게재 위치", val: "Advantage+ 자동" },
            { key: "특별 카테고리", val: "없음", muted: true },
          ].map(({ key, val, muted }) => (
            <div key={key} className="summary-row">
              <dt className="summary-row__key">{key}</dt>
              <dd className="summary-row__val" style={muted ? { color: "var(--text-muted)" } : {}}>{val}</dd>
            </div>
          ))}
        </dl>

        <hr className="divider" style={{ margin: "var(--space-5) 0" }} />

        <div className="meta-conn">
          <span className="meta-conn__dot" aria-hidden="true" />
          <div className="meta-conn__body">
            <p className="meta-conn__title">{connected ? "Meta 광고 계정 연결됨" : "광고 계정 미연결"}</p>
            <p className="meta-conn__meta">
              {connected
                ? `${adAccountName ?? adAccountId}${pageName ? ` · 📄 ${pageName}` : ""}`
                : "헤더의 '광고 계정 연결'에서 광고 계정·페이지를 선택해주세요"}
            </p>
          </div>
        </div>

        <hr className="divider" style={{ margin: "var(--space-5) 0" }} />

        <ul className="checklist">
          {[
            { text: "광고 계정·페이지 연결", done: connected },
            { text: "Meta API 집행 완료", done: mutation.isSuccess },
          ].map(({ text, done }) => (
            <li key={text} className={`check-row${done ? " check-row--done" : ""}`}>
              <span className="check-row__icon" aria-hidden="true">{done ? "✓" : "○"}</span>
              <span>{text}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
