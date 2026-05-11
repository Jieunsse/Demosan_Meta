"use client";

import { useState } from "react";
import type { CampaignIds } from "../_hooks/useLaunchCampaign";

interface Props {
  campaignIds: CampaignIds;
  onNext: () => void;
}

const ID_ROWS = [
  { key: "Campaign ID", id: "camp" as const },
  { key: "Ad Set ID", id: "adset" as const },
  { key: "Ad ID", id: "ad" as const },
];

function CopyIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default function CampaignSuccessCard({ campaignIds, onNext }: Props) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, val: string) => {
    navigator.clipboard?.writeText(val).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1400);
  };

  return (
    <article className="success-card">
      <span className="success-icon" aria-hidden="true">✓</span>
      <h2 className="success-title">광고가 Meta에 성공적으로 등록됐어요</h2>

      <p className="success-status">
        <span className="status-flow">
          <span className="badge badge--warning">검토 중</span>
          <span className="status-flow__arrow" aria-hidden="true">→</span>
          <span className="badge badge--success">게재 중</span>
        </span>
      </p>

      <dl className="id-list" aria-label="Meta IDs">
        {ID_ROWS.map(({ key, id }) => {
          const val = campaignIds[id];
          return (
            <div key={id} className="id-row">
              <dt className="id-row__key">{key}</dt>
              <dd className="id-row__val">
                {val}
                <button
                  className={`id-row__copy${copiedId === id ? " is-copied" : ""}`}
                  type="button"
                  aria-label={`${key} 복사`}
                  onClick={() => handleCopy(id, val)}
                >
                  {copiedId === id ? <CheckIcon /> : <CopyIcon />}
                </button>
              </dd>
            </div>
          );
        })}
      </dl>

      <p className="success-hint">
        Meta 광고 정책 검토 후 게재가 시작돼요
        <br />
        보통 수 분 ~ 수 시간 소요됩니다
      </p>

      <button className="btn btn--primary" type="button" onClick={onNext}>
        성과 확인하러 가기
        <span aria-hidden="true" style={{ marginLeft: "4px" }}>→</span>
      </button>
    </article>
  );
}
