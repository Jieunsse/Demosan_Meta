// ADR-038 결정 6 — 데모/실제 공존의 이음매. 순수 엔진(engine.ts)은 양쪽 공유, 갈라지는 건 어댑터 3개뿐.
// 데모 = localStorage store + 시뮬 게재 + 시드 KPI / 실제 = Supabase store + Meta ad study + Meta insights.
// 전부 async — 실 토너먼트는 며칠에 걸쳐 서버 폴러가 브라우저 없이 진행하므로 Supabase 가 진실의 원천.
// 섬1: 인터페이스 + SupabaseTournamentStore 구현. RoundLauncher·KpiSource 의 Meta 구현·UI 배선은 섬2.

import type { AdKpi } from "@entities/insights/ab-verdict";
import type { Tournament, TourRound } from "./engine";

// 영속화 (ADR-038 결정 2) — 서버 cron 폴러와 클라 UI 양쪽이 읽고 쓴다. 데모는 localStorage 동기 함수 유지.
export interface TournamentStore {
  list(): Promise<Tournament[]>;
  get(id: string): Promise<Tournament | null>;
  upsert(t: Tournament): Promise<void>;
  remove(id: string): Promise<void>;
}

// 라운드 게재 (ADR-038 결정 4) — 데모=결정적 campaignId 시뮬, 실제=Meta ad study(SPLIT_TEST) 생성.
export interface RoundLauncher {
  launch(t: Tournament, round: TourRound): Promise<{ campaignId: string }>;
}

// KPI 소스 (ADR-038 결정 1) — 데모=시드 결정적 생성기(roundAdKpis), 실제=Meta insights 폴링.
export interface KpiSource {
  roundKpis(t: Tournament, round: TourRound): Promise<[AdKpi, AdKpi]>;
}
