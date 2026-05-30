// 실 유저 토너먼트 조립점 (ADR-038) — server-side only. Supabase store + Meta 어댑터 2종으로
// 서버 오케스트레이터를 만든다. cron 폴러·API 라우트가 이 한 곳에서 같은 러너를 얻는다.

import { createServerRunner, type ServerRunner } from "./server-runner";
import { supabaseTournamentStore } from "./supabase-store";
import { createMetaRoundLauncher } from "./meta-launcher";
import { createMetaKpiSource } from "./meta-kpi-source";

export function getRealTournamentRunner(): ServerRunner {
  return createServerRunner({
    store: supabaseTournamentStore,
    launcher: createMetaRoundLauncher(),
    kpiSource: createMetaKpiSource(),
  });
}

export { supabaseTournamentStore };
