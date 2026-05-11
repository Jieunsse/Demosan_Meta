"use client";

import { useEffect, useState } from "react";
import AppHeader from "./_components/AppHeader";
import CreateTab from "./_components/CreateTab";
import LaunchTab from "./_components/LaunchTab";
import ReportTab from "./_components/ReportTab";

type Tab = "create" | "launch" | "report";
const TABS: Tab[] = ["create", "launch", "report"];
const TAB_STORAGE_KEY = "adflow_active_tab";

export default function Home() {
  // 첫 렌더는 SSR 과 동일하게 기본 탭으로 — 하이드레이션 미스매치 방지.
  const [activeTab, setActiveTab] = useState<Tab>("create");

  // 마운트 후 sessionStorage 에서 보던 탭 복원.
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(TAB_STORAGE_KEY);
      if (stored && (TABS as string[]).includes(stored)) {
        setActiveTab(stored as Tab);
      }
    } catch {
      /* sessionStorage 사용 불가 환경 — 무시 */
    }
  }, []);

  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    try {
      sessionStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      /* 무시 */
    }
  };

  return (
    <>
      <AppHeader activeTab={activeTab} onTabChange={changeTab} />

      <main className="app-main">
        <section className="tab-panel" hidden={activeTab !== "create"}>
          <CreateTab onNext={() => changeTab("launch")} />
        </section>

        <section className="tab-panel" hidden={activeTab !== "launch"}>
          <LaunchTab onNext={() => changeTab("report")} />
        </section>

        <section className="tab-panel" hidden={activeTab !== "report"}>
          <ReportTab onNew={() => changeTab("create")} />
        </section>
      </main>
    </>
  );
}
