"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import Icon from "@shared/ui/Icon";
import { Badge } from "@shared/ui/primitives";
import { useTheme, type ThemeChoice } from "@shared/lib/useTheme";
import { useToast } from "@shared/ui/Toast";

type Tab = "account" | "theme" | "notif" | "danger";
const TABS: [Tab, string][] = [["account", "계정 연결"], ["theme", "화면 테마"], ["notif", "알림"], ["danger", "계정 관리"]];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("account");
  return (
    <div className="page" data-screen-label="설정">
      <div className="page__head">
        <div>
          <span className="w-overline" style={{ color: "var(--w-fg-neutral)" }}>설정</span>
          <h1 className="page__title" style={{ marginTop: 4 }}>설정</h1>
          <p className="page__sub">계정 연결, 화면 테마, 알림을 관리해요.</p>
        </div>
      </div>

      <div className="seg">
        {TABS.map(([k, l]) => (
          <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {tab === "account" && <AccountTab />}
      {tab === "theme" && <ThemeTab />}
      {tab === "notif" && <NotifTab />}
      {tab === "danger" && <DangerTab />}
    </div>
  );
}

function AccountTab() {
  const router = useRouter();
  const { data: session } = useSession();
  const connected = !!(session?.adAccountId && session?.pageId);
  const browseMode = !!session?.browseMode;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20 }}>
      <div className="card card--lg">
        <h2 className="section-title">연결 상태</h2>
        <p className="section-sub">
          {connected ? "Meta 광고 계정과 페이스북 페이지가 연결되어 있어요." : "아직 광고 계정·페이지가 연결되지 않았어요."}
        </p>
        <hr className="divider" />
        {connected ? (
          <>
            <div className="list-row">
              <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--w-primary-soft)", color: "var(--w-primary-press)", display: "grid", placeItems: "center", flex: "0 0 auto" }}><Icon name="wallet" size={18} /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="list-row__title">{session?.adAccountName ?? "광고 계정"}</div>
                  <div className="list-row__sub">{session?.adAccountId}</div>
                </div>
              </div>
            </div>
            <div className="list-row">
              <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--w-accent-violet-soft)", color: "var(--w-accent-violet)", display: "grid", placeItems: "center", flex: "0 0 auto" }}><Icon name="doc" size={18} /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="list-row__title">{session?.pageName ?? "페이스북 페이지"}</div>
                  <div className="list-row__sub">{session?.pageId}</div>
                </div>
              </div>
            </div>
            <hr className="divider" />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div className="field__hint">광고 계정·페이지 변경이나 연결 해제는 계정 연결 탭에서 할 수 있어요.</div>
              <button className="btn btn--secondary btn--sm" type="button" onClick={() => router.push("/connect")}>연결 관리 <Icon name="arrow-right" size={13} /></button>
            </div>
          </>
        ) : (
          <div className="list-row" style={{ borderStyle: "dashed" }}>
            <div>
              <div className="list-row__title">광고 계정이 연결되지 않았어요</div>
              <div className="list-row__sub">{browseMode ? "둘러보기 모드예요. 광고를 집행하려면 Meta 광고 계정·페이지를 연결해주세요." : "Meta 광고 계정·페이지를 연결하면 광고를 만들고 집행할 수 있어요."}</div>
            </div>
            <button className="btn btn--primary btn--sm" type="button" onClick={() => router.push("/connect")}><Icon name="link" size={14} /> 계정 연결하기</button>
          </div>
        )}
      </div>

      {connected ? (
        <div className="card" style={{ background: "linear-gradient(135deg, rgba(0,102,255,0.04), rgba(101,65,242,0.05))", borderColor: "transparent" }}>
          <Badge kind="success" dot live>연결됨</Badge>
          <div style={{ font: "700 18px/1.3 var(--w-font-sans)", color: "var(--w-fg-strong)", marginTop: 12, letterSpacing: "-0.012em" }}>광고를 만들 수 있어요</div>
          <p style={{ font: "500 13px/1.55 var(--w-font-sans)", color: "var(--w-fg-neutral)", margin: "10px 0 16px" }}>바로 광고 만들기 화면으로 이동해 첫 캠페인을 시작해보세요.</p>
          <button className="btn btn--primary btn--sm" type="button" onClick={() => router.push("/create")}><Icon name="sparkles" size={14} /> 광고 만들기로 이동</button>
        </div>
      ) : (
        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Badge kind="neutral" dot>둘러보기 모드</Badge>
          <div style={{ font: "700 17px/1.3 var(--w-font-sans)", color: "var(--w-fg-strong)" }}>연결 없이 먼저 둘러보는 중이에요</div>
          <p style={{ font: "500 13px/1.55 var(--w-font-sans)", color: "var(--w-fg-neutral)", margin: 0 }}>예시 데이터로 화면과 흐름을 살펴볼 수 있어요. 광고 집행은 연결 후에 가능해요.</p>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => router.push("/connect")}>지금 연결하기 →</button>
        </div>
      )}
    </div>
  );
}

const THEME_OPTS: { k: ThemeChoice; label: string; desc: string }[] = [
  { k: "light", label: "라이트", desc: "기본값" },
  { k: "dark", label: "다크", desc: "어두운 환경" },
  { k: "system", label: "시스템 설정", desc: "기기 설정 따라가기" },
];

function ThemeTab() {
  const [theme, setTheme] = useTheme();
  return (
    <div className="card card--lg" style={{ maxWidth: 720 }}>
      <h2 className="section-title">화면 테마</h2>
      <p className="section-sub">눈에 편한 테마를 선택하세요. 기기 설정을 따를 수도 있어요.</p>
      <hr className="divider" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        {THEME_OPTS.map((opt) => (
          <button key={opt.k} type="button" onClick={() => setTheme(opt.k)} className={"radio-card" + (theme === opt.k ? " radio-card--on" : "")} style={{ flexDirection: "column", padding: 18, gap: 12, alignItems: "stretch" }}>
            <div style={{ height: 100, borderRadius: 10, position: "relative", overflow: "hidden", background: opt.k === "light" ? "#fff" : opt.k === "dark" ? "#171719" : "linear-gradient(90deg, #fff 50%, #171719 50%)", border: "1px solid var(--w-line-alternative)" }}>
              <div style={{ position: "absolute", left: 10, top: 10, right: 10, height: 6, background: opt.k === "dark" ? "rgba(255,255,255,0.2)" : "#e1e2e4", borderRadius: 3 }} />
              <div style={{ position: "absolute", left: 10, top: 24, width: "60%", height: 6, background: opt.k === "dark" ? "rgba(255,255,255,0.12)" : "#eaebec", borderRadius: 3 }} />
              <div style={{ position: "absolute", left: 10, bottom: 10, height: 24, width: "70%", background: "var(--w-primary-normal)", borderRadius: 6 }} />
            </div>
            <div style={{ textAlign: "left" }}>
              <div className="radio-card__text" style={{ marginTop: 0 }}>{opt.label}</div>
              <div style={{ font: "500 12px/1 var(--w-font-sans)", color: "var(--w-fg-neutral)", marginTop: 4 }}>{opt.desc}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

const NOTIF_OPTS: [string, string][] = [
  ["launch", "광고가 게재되기 시작했을 때"],
  ["perf", "성과가 갑자기 변동했을 때"],
  ["weekly", "주간 성과 요약"],
  ["opt", "AI 최적화 제안이 있을 때"],
];

function NotifTab() {
  const [n, setN] = useState<Record<string, boolean>>({ launch: true, perf: true, weekly: false, opt: true });
  return (
    <div className="card card--lg" style={{ maxWidth: 720 }}>
      <h2 className="section-title">알림</h2>
      <p className="section-sub">중요한 사건이 일어났을 때만 보내드려요.</p>
      <hr className="divider" />
      {NOTIF_OPTS.map(([k, l]) => (
        <div key={k} className="list-row">
          <div className="list-row__title">{l}</div>
          <Toggle on={!!n[k]} onChange={(v) => setN((s) => ({ ...s, [k]: v }))} />
        </div>
      ))}
      <div className="field__hint" style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="info" size={12} /> 알림 발송 기능은 아직 준비 중이에요. 이 설정은 지금은 저장되지 않아요.
      </div>
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!on)} aria-pressed={on} style={{ width: 40, height: 24, borderRadius: 999, background: on ? "var(--w-primary-normal)" : "var(--w-fg-assistive)", border: "none", cursor: "pointer", position: "relative", transition: "background 160ms ease", flex: "0 0 auto" }}>
      <span style={{ position: "absolute", top: 2, left: on ? 18 : 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left 160ms cubic-bezier(0.16,1,0.3,1)", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
    </button>
  );
}

const LOCAL_KEYS = ["adflow_library_v1", "adflow_loaded_creative"];
const SESSION_KEYS = ["adflow_brand", "adflow_target", "adflow_goal", "adflow_active_tab"];

function DangerTab() {
  const showToast = useToast();
  const [confirmClear, setConfirmClear] = useState(false);

  const clearLocalData = () => {
    try {
      LOCAL_KEYS.forEach((k) => localStorage.removeItem(k));
      SESSION_KEYS.forEach((k) => sessionStorage.removeItem(k));
      window.dispatchEvent(new CustomEvent("adflow:library"));
    } catch {
      /* storage 사용 불가 — 무시 */
    }
    setConfirmClear(false);
    showToast("로컬 데이터를 삭제했어요");
  };

  return (
    <>
      <div className="card card--lg" style={{ maxWidth: 720 }}>
        <h2 className="section-title">계정 관리</h2>
        <p className="section-sub">로그아웃하거나 이 브라우저에 저장된 데이터를 정리해요.</p>
        <hr className="divider" />
        <div className="list-row">
          <div>
            <div className="list-row__title">로그아웃</div>
            <div className="list-row__sub">이 기기에서 AdFlow를 종료하고 로그인 화면으로 돌아가요.</div>
          </div>
          <button className="btn btn--secondary btn--sm" type="button" onClick={() => signOut({ callbackUrl: "/login" })}><Icon name="logout" size={14} /> 로그아웃</button>
        </div>
        <div className="list-row" style={{ borderColor: "rgba(255,66,66,0.20)" }}>
          <div>
            <div className="list-row__title" style={{ color: "var(--w-status-negative)" }}>이 브라우저의 로컬 데이터 삭제</div>
            <div className="list-row__sub">소재 라이브러리, 작성 중이던 입력값·미리보기 데이터를 지워요. Meta에 집행된 광고와 캠페인은 영향받지 않아요.</div>
          </div>
          <button className="btn btn--sm" type="button" style={{ background: "rgba(255,66,66,0.10)", color: "var(--w-status-negative)" }} onClick={() => setConfirmClear(true)}>데이터 삭제</button>
        </div>
      </div>

      {confirmClear && (
        <div className="modal-overlay" onClick={() => setConfirmClear(false)}>
          <div className="modal" style={{ width: 460 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "26px 26px 8px" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(255,66,66,0.10)", color: "var(--w-status-negative)", display: "grid", placeItems: "center", marginBottom: 14 }}><Icon name="warn" size={20} /></div>
              <h3 style={{ font: "700 17px/1.35 var(--w-font-display)", color: "var(--w-fg-strong)", letterSpacing: "-0.01em", margin: 0 }}>로컬 데이터를 삭제할까요?</h3>
              <p style={{ font: "500 13.5px/1.6 var(--w-font-sans)", color: "var(--w-fg-neutral)", margin: "10px 0 0" }}>소재 라이브러리에 저장한 소재도 모두 지워지고 되돌릴 수 없어요. Meta에 집행된 광고는 영향받지 않아요.</p>
            </div>
            <div className="modal__foot">
              <button className="btn btn--ghost" type="button" onClick={() => setConfirmClear(false)}>취소</button>
              <button className="btn btn--danger" type="button" onClick={clearLocalData}>데이터 삭제</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
