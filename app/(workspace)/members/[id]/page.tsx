"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Icon from "@shared/ui/Icon";
import { EmptyState } from "@shared/ui/primitives";
import { campaignGradient } from "@shared/lib/format";
import {
  getMember,
  getMemberActivity,
  type Member,
  type ReviewActivityItem,
} from "@/lib/mock-members";
import type { CampaignSummary } from "@/lib/meta-ads";

type ActivityTab = "created" | "launched" | "reviews";

const TAB_LABEL: Record<ActivityTab, string> = {
  created: "생성",
  launched: "게재",
  reviews: "검토",
};

const ROLE_CHIP: Record<Member["role"], string> = {
  owner: "role-chip role-chip--owner",
  launcher: "role-chip role-chip--launcher",
  reviewer: "role-chip role-chip--reviewer",
};

const ROLE_LABEL: Record<Member["role"], string> = {
  owner: "팀장",
  launcher: "팀원·게재",
  reviewer: "팀원·검토",
};

const OBJECTIVE_CHIP_CLASS: Record<string, string> = {
  OUTCOME_TRAFFIC: "chip--obj-traffic",
  LINK_CLICKS: "chip--obj-traffic",
  OUTCOME_SALES: "chip--obj-conversion",
  CONVERSIONS: "chip--obj-conversion",
  OUTCOME_AWARENESS: "chip--obj-awareness",
  REACH: "chip--obj-awareness",
  OUTCOME_LEADS: "chip--obj-leads",
  OUTCOME_ENGAGEMENT: "chip--obj-engagement",
  OUTCOME_APP_PROMOTION: "chip--obj-install",
};

const STATUS_CHIP: Record<string, { label: string; chip: string }> = {
  live: { label: "게재 중", chip: "live" },
  review: { label: "검토 중", chip: "review" },
  paused: { label: "일시정지", chip: "paused" },
  ended: { label: "종료", chip: "ended" },
  issue: { label: "문제 있음", chip: "issue" },
};

const REVIEW_STATUS: Record<"pending" | "approved" | "rejected", { label: string; chip: string }> = {
  pending: { label: "대기중", chip: "review" },
  approved: { label: "승인", chip: "live" },
  rejected: { label: "반려", chip: "issue" },
};

export default function MemberDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const memberId = params.id;
  const member = getMember(memberId);
  const [tab, setTab] = useState<ActivityTab>("created");

  const activity = useMemo(() => getMemberActivity(memberId), [memberId]);

  if (!member) {
    return (
      <div className="page" data-screen-label="구성원 활동">
        <BackLink onClick={() => router.push("/members")} />
        <EmptyState
          icon={<Icon name="users" size={26} />}
          title="멤버를 찾을 수 없어요"
          desc="삭제됐거나 잘못된 주소일 수 있어요."
          action={
            <button className="btn btn--secondary" type="button" onClick={() => router.push("/members")}>
              구성원 목록으로
            </button>
          }
        />
      </div>
    );
  }

  const isInvited = member.status === "invited";

  return (
    <div className="page" data-screen-label="구성원 활동">
      <BackLink onClick={() => router.push("/members")} />

      <header style={{ display: "flex", gap: 16, alignItems: "flex-start", marginTop: 4, marginBottom: 24 }}>
        <BigAvatar member={member} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <span className="w-overline" style={{ color: "var(--w-fg-neutral)" }}>구성원 활동</span>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
            <h1 className="page__title" style={{ marginTop: 0 }}>
              {member.name ?? "(이름 없음)"}
            </h1>
            <span className={ROLE_CHIP[member.role]}>
              <span className={`role-dot role-dot--${member.role}`} />
              {ROLE_LABEL[member.role]}
            </span>
            {isInvited && (
              <span className="status-badge status-badge--invited">
                <Icon name="clock" size={11} /> 초대됨
              </span>
            )}
          </div>
          <div style={{ font: "500 13px/1.5 var(--w-font-mono)", color: "var(--w-fg-neutral)", marginTop: 6 }}>
            {member.email}
          </div>
          {!isInvited && (
            <div style={{ font: "500 12.5px/1.5 var(--w-font-sans)", color: "var(--w-fg-alternative)", marginTop: 4 }}>
              {member.joined} 합류 · {member.lastActive} 활동
            </div>
          )}
        </div>
      </header>

      {isInvited ? (
        <EmptyState
          icon={<Icon name="clock" size={26} />}
          title="아직 합류 전이라 활동이 없어요"
          desc="초대 메일의 링크에서 Google 로그인하면 합류해요. 합류 후 만든 캠페인·검토 요청이 여기에 모여요."
          action={
            <button className="btn btn--secondary" type="button" onClick={() => router.push("/members")}>
              구성원 목록으로
            </button>
          }
        />
      ) : (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {(Object.keys(TAB_LABEL) as ActivityTab[]).map((k) => {
              const count =
                k === "created" ? activity.created.length :
                k === "launched" ? activity.launched.length :
                activity.reviews.length;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setTab(k)}
                  className={"filter-chip" + (tab === k ? " filter-chip--on" : "")}
                >
                  {TAB_LABEL[k]}
                  <span style={{ font: "600 11px/1 var(--w-font-mono)", marginLeft: 4, opacity: 0.7 }}>{count}</span>
                </button>
              );
            })}
          </div>

          {tab === "created" && (
            <CampaignTabList
              kind="created"
              memberName={member.name ?? member.email}
              rows={activity.created}
              onSwitchTab={setTab}
              onRowClick={(id) => router.push(`/campaigns/${id}`)}
            />
          )}
          {tab === "launched" && (
            <CampaignTabList
              kind="launched"
              memberName={member.name ?? member.email}
              rows={activity.launched}
              onSwitchTab={setTab}
              onRowClick={(id) => router.push(`/campaigns/${id}`)}
            />
          )}
          {tab === "reviews" && (
            <ReviewTabList
              memberName={member.name ?? member.email}
              rows={activity.reviews}
              onSwitchTab={setTab}
              onRowClick={(id) => router.push(`/campaigns/${id}`)}
            />
          )}
        </>
      )}
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-link"
      style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--w-fg-neutral)", marginBottom: 4, background: "none", border: 0, padding: 0, cursor: "pointer" }}
    >
      <Icon name="arrow-left" size={13} /> 구성원
    </button>
  );
}

function BigAvatar({ member }: { member: Member }) {
  if (member.status === "invited") {
    return (
      <div style={{ width: 56, height: 56, borderRadius: "50%", border: "1.5px dashed var(--w-line-normal)", background: "var(--w-bg-alternative)", color: "var(--w-fg-alternative)", display: "grid", placeItems: "center", flex: "0 0 auto" }}>
        <Icon name="message" size={22} />
      </div>
    );
  }
  return (
    <div style={{ width: 56, height: 56, borderRadius: "50%", background: member.avatarBg || "var(--w-fg-neutral)", color: "#fff", display: "grid", placeItems: "center", font: "700 22px/1 var(--w-font-display)", flex: "0 0 auto" }}>
      {member.name?.[0] ?? "?"}
    </div>
  );
}

function CampaignTabList({
  kind, memberName, rows, onSwitchTab, onRowClick,
}: {
  kind: "created" | "launched";
  memberName: string;
  rows: CampaignSummary[];
  onSwitchTab: (tab: ActivityTab) => void;
  onRowClick: (campaignId: string) => void;
}) {
  if (rows.length === 0) {
    const verb = kind === "created" ? "만든" : "게재한";
    return (
      <EmptyState
        icon={<Icon name="folder" size={26} />}
        title={`${memberName}님이 ${verb} 캠페인이 없어요`}
        desc="다른 활동 탭에서 이 멤버의 캠페인·검토 내역을 확인해보세요."
        action={
          <div style={{ display: "inline-flex", gap: 8 }}>
            {kind !== "created" && (
              <button className="btn btn--ghost" type="button" onClick={() => onSwitchTab("created")}>생성 탭으로</button>
            )}
            <button className="btn btn--ghost" type="button" onClick={() => onSwitchTab("reviews")}>검토 탭으로</button>
          </div>
        }
      />
    );
  }
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table className="dtable">
        <thead>
          <tr>
            <th>캠페인</th>
            <th style={{ width: 110, textAlign: "center" }}>목표</th>
            <th style={{ width: 120, textAlign: "center" }}>상태</th>
            <th style={{ width: 120, textAlign: "center" }}>{kind === "created" ? "생성일" : "게재일"}</th>
            <th style={{ width: 44 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.id} className="dtable__row" onClick={() => onRowClick(c.id)} style={{ cursor: "pointer" }}>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 8, background: campaignGradient(c.id), flex: "0 0 auto" }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ font: "600 13.5px/1.35 var(--w-font-sans)", color: "var(--w-fg-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.headline}
                    </div>
                  </div>
                </div>
              </td>
              <td style={{ textAlign: "center" }}>
                <span className={`chip ${OBJECTIVE_CHIP_CLASS[c.objective] ?? "chip--neutral"}`}>{c.goal}</span>
              </td>
              <td style={{ textAlign: "center" }}>
                <CampaignStatusChip status={c.status} />
              </td>
              <td style={{ textAlign: "center", font: "500 12.5px/1 var(--w-font-mono)", color: "var(--w-fg-strong)" }}>
                {c.startDate ?? "—"}
              </td>
              <td style={{ color: "var(--w-fg-alternative)" }}>
                <Icon name="arrow-right" size={14} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReviewTabList({
  memberName, rows, onSwitchTab, onRowClick,
}: {
  memberName: string;
  rows: ReviewActivityItem[];
  onSwitchTab: (tab: ActivityTab) => void;
  onRowClick: (campaignId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<Icon name="users" size={26} />}
        title={`${memberName}님의 검토 내역이 없어요`}
        desc="검토 요청을 보내거나 받은 적이 없어요. 다른 탭에서 생성·게재 내역을 확인해보세요."
        action={
          <button className="btn btn--ghost" type="button" onClick={() => onSwitchTab("created")}>생성 탭으로</button>
        }
      />
    );
  }

  const outgoingCount = rows.filter((r) => r.direction === "outgoing").length;
  const incomingCount = rows.length - outgoingCount;

  return (
    <>
      <div style={{ font: "500 12.5px/1.5 var(--w-font-sans)", color: "var(--w-fg-neutral)", marginBottom: 10 }}>
        보낸 요청 <strong style={{ color: "var(--w-fg-strong)" }}>{outgoingCount}</strong>건 · 받은 요청 <strong style={{ color: "var(--w-fg-strong)" }}>{incomingCount}</strong>건
      </div>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table className="dtable">
          <thead>
            <tr>
              <th style={{ width: 44, textAlign: "center" }} />
              <th>캠페인</th>
              <th style={{ width: 180 }}>상대</th>
              <th style={{ width: 100, textAlign: "center" }}>상태</th>
              <th style={{ width: 110, textAlign: "center" }}>요청일</th>
              <th style={{ width: 44 }} />
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => {
              const { request, campaign, direction, counterpart } = item;
              const isOut = direction === "outgoing";
              return (
                <tr key={request.id} className="dtable__row" onClick={() => onRowClick(campaign.id)} style={{ cursor: "pointer" }}>
                  <td style={{ textAlign: "center", color: isOut ? "var(--w-primary-press)" : "var(--w-fg-alternative)" }}>
                    <Icon name={isOut ? "arrow-right" : "arrow-left"} size={16} />
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 7, background: campaignGradient(campaign.id), flex: "0 0 auto" }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ font: "600 13px/1.35 var(--w-font-sans)", color: "var(--w-fg-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {campaign.headline}
                        </div>
                        {request.status === "rejected" && request.comment && (
                          <div style={{ font: "500 11.5px/1.4 var(--w-font-sans)", color: "var(--w-fg-alternative)", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={request.comment}>
                            반려 사유: {request.comment}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CounterpartAvatar member={counterpart} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ font: "500 11px/1 var(--w-font-mono)", color: "var(--w-fg-alternative)", marginBottom: 2 }}>
                          {isOut ? "검토자" : "요청자"}
                        </div>
                        <div style={{ font: "600 12.5px/1.3 var(--w-font-sans)", color: "var(--w-fg-strong)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {counterpart.name ?? counterpart.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <ReviewStatusChip status={request.status} />
                  </td>
                  <td style={{ textAlign: "center", font: "500 12.5px/1 var(--w-font-mono)", color: "var(--w-fg-strong)" }}>
                    {request.requestedAt}
                  </td>
                  <td style={{ color: "var(--w-fg-alternative)" }}>
                    <Icon name="arrow-right" size={14} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function CounterpartAvatar({ member }: { member: Member }) {
  return (
    <div
      style={{
        width: 28, height: 28, borderRadius: "50%",
        background: member.avatarBg || "var(--w-fg-neutral)",
        color: "#fff", display: "grid", placeItems: "center",
        font: "700 11px/1 var(--w-font-display)", flex: "0 0 auto",
      }}
    >
      {member.name?.[0] ?? "?"}
    </div>
  );
}

function CampaignStatusChip({ status }: { status: string }) {
  const def = STATUS_CHIP[status] ?? { label: status, chip: "neutral" };
  return (
    <span className={`chip chip--${def.chip}`}>
      <span className="chip__dot" />
      {def.label}
    </span>
  );
}

function ReviewStatusChip({ status }: { status: "pending" | "approved" | "rejected" }) {
  const def = REVIEW_STATUS[status];
  return (
    <span className={`chip chip--${def.chip}`}>
      <span className="chip__dot" />
      {def.label}
    </span>
  );
}
