"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

type Tab = "create" | "launch" | "report";

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const TABS: { id: Tab; step: string; label: string }[] = [
  { id: "create", step: "①", label: "소재 만들기" },
  { id: "launch", step: "②", label: "광고 집행" },
  { id: "report", step: "③", label: "성과 확인" },
];

export default function AppHeader({ activeTab, onTabChange }: Props) {
  const { data: session } = useSession();
  const router = useRouter();

  const userName = session?.user?.name ?? "";
  const userInitial = userName.charAt(0).toUpperCase() || "M";
  const adAccountName = session?.adAccountName;
  const pageName = session?.pageName;
  const notConnected = !adAccountName || !pageName;

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <a className="logo" href="#" aria-label="AdFlow home">
          <span className="logo__dot" aria-hidden="true" />
          <span>AdFlow</span>
        </a>

        <nav className="nav-tabs" aria-label="기본 탐색">
          {TABS.map(({ id, step, label }) => (
            <button
              key={id}
              className="nav-tab"
              type="button"
              aria-current={activeTab === id ? "page" : undefined}
              onClick={() => onTabChange(id)}
            >
              <span className="nav-tab__step">{step}</span>
              {label}
            </button>
          ))}
        </nav>

        <div className="header-spacer" />

        <div className="header-meta">
          {notConnected ? (
            <button
              className="btn btn--primary"
              style={{ padding: "4px 12px", fontSize: "13px", height: "28px" }}
              onClick={() => router.push("/setup")}
              title="광고 계정·페이지 연결"
            >
              광고 계정 연결
            </button>
          ) : (
            <>
              <span
                className="badge badge--neutral mono"
                title={adAccountName}
                style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                {adAccountName}
              </span>
              <span
                className="badge badge--neutral mono"
                title={`페이지: ${pageName}`}
                style={{ maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                📄 {pageName}
              </span>
              <button
                className="btn btn--ghost"
                style={{ padding: "4px 10px", fontSize: "13px", height: "28px" }}
                onClick={() => router.push("/setup")}
                title="광고 계정·페이지 전환"
              >
                계정 전환
              </button>
            </>
          )}
          <button
            className="btn btn--ghost"
            style={{ padding: "4px 10px", fontSize: "13px", height: "28px" }}
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            로그아웃
          </button>
          <div className="avatar" aria-label={userName || "사용자"}>
            {userInitial}
          </div>
        </div>
      </div>
    </header>
  );
}
