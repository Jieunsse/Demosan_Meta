// 성과 기반 최적화 "제안" 규칙 — 순수 함수, 클라이언트/서버 양쪽 import 가능.
// 사람이 승인하는(human-in-the-loop) 자동화의 1단계: 규칙이 액션 후보만 만들고,
// 실제 적용(일시정지·예산조정)은 마케터가 버튼으로 확정해요.

export type OptimizationInsights = {
  impressions: number;
  clicks: number;
  ctr: number;   // %
  spend: number; // KRW
};

// detail: 문장 단위 배열 — UI 에서 한 문장씩 별도 줄로 표시해요.
export type Suggestion =
  | {
      kind: "pause";
      severity: "warn";
      title: string;
      detail: string[];
    }
  | {
      kind: "increase-budget";
      severity: "info";
      title: string;
      detail: string[];
      fromDailyBudget: number;
      toDailyBudget: number;
    }
  | {
      kind: "note"; // 액션 없는 정보성
      severity: "info" | "warn";
      title: string;
      detail: string[];
    };

/* ── 임계치 (튜닝 지점) ───────────────────────────────────────── */
const MIN_IMPRESSIONS_FOR_JUDGEMENT = 1000; // 이 이하면 데이터 부족 → 판단 보류
const LOW_CTR_PCT = 0.8;                     // 트래픽 광고 기준 이 아래면 부진
const GOOD_CTR_PCT = 2.0;                    // 이 이상이면 호조 → 확장 여지
const HIGH_CPC_KRW = 2000;                   // 클릭당 비용이 이 이상이면 비효율 경고
const BUDGET_BUMP_RATIO = 1.3;               // 예산 증액 제안 비율(+30%) — 학습기 재진입 피하려 과하지 않게
const MAX_SUGGESTED_DAILY_BUDGET = 1_000_000;

// 자동화(무인 일시정지·예산조정)를 맡길 만큼 데이터가 쌓였는지 판단하는 기준
const AUTOMATION_MIN_IMPRESSIONS = 10_000;
const AUTOMATION_MIN_CLICKS = 50;            // Meta 학습기 종료(최적화 이벤트 ~50건) 근처
const AUTOMATION_MIN_DAYS = 3;               // 최소 며칠치 데이터

const won = (n: number) => `₩${Math.round(n).toLocaleString("ko-KR")}`;
const pct = (n: number) => `${n.toFixed(2)}%`;

export function suggestOptimizations(
  ins: OptimizationInsights,
  currentDailyBudget: number,
): Suggestion[] {
  const out: Suggestion[] = [];

  if (ins.impressions < MIN_IMPRESSIONS_FOR_JUDGEMENT) {
    out.push({
      kind: "note",
      severity: "info",
      title: "데이터를 조금 더 모아보세요",
      detail: [
        `노출 ${ins.impressions.toLocaleString("ko-KR")}회로 아직 적어요.`,
        `노출 ${MIN_IMPRESSIONS_FOR_JUDGEMENT.toLocaleString("ko-KR")}회 정도 쌓이면 성과 판단을 도와드릴 수 있어요.`,
      ],
    });
    return out;
  }

  // 부진 → 일시정지 제안
  if (ins.ctr < LOW_CTR_PCT) {
    out.push({
      kind: "pause",
      severity: "warn",
      title: "성과가 부진해요 — 일시정지를 고려해보세요",
      detail: [
        `CTR이 ${pct(ins.ctr)}로 낮아요 (트래픽 광고 평균 ~1~2%).`,
        `광고를 일시정지하고 새 소재로 다시 만드는 걸 권해요.`,
      ],
    });
  }

  // 호조 → 예산 증액 제안
  if (ins.ctr >= GOOD_CTR_PCT) {
    const to = Math.min(MAX_SUGGESTED_DAILY_BUDGET, Math.round((currentDailyBudget * BUDGET_BUMP_RATIO) / 1000) * 1000);
    if (to > currentDailyBudget) {
      out.push({
        kind: "increase-budget",
        severity: "info",
        title: "성과가 좋아요 — 일일예산을 늘려볼까요?",
        detail: [
          `CTR ${pct(ins.ctr)}로 호조예요.`,
          `일일예산을 ${won(currentDailyBudget)} → ${won(to)}로 올려 더 많은 사람에게 노출해보세요.`,
          `한 번에 크게 올리면 Meta 학습기가 다시 시작될 수 있어 +30% 정도를 제안해요.`,
        ],
        fromDailyBudget: currentDailyBudget,
        toDailyBudget: to,
      });
    }
  }

  // CPC 경고 (액션 없는 정보성)
  if (ins.clicks > 0) {
    const cpc = ins.spend / ins.clicks;
    if (cpc >= HIGH_CPC_KRW) {
      out.push({
        kind: "note",
        severity: "warn",
        title: "클릭당 비용이 높아요",
        detail: [
          `클릭당 ${won(cpc)} 들고 있어요.`,
          `타겟을 좁히거나(나이·성별·지역) 소재를 점검해보세요.`,
          `재타겟팅은 새 캠페인으로 만들어야 해요.`,
        ],
      });
    }
  }

  if (out.length === 0) {
    out.push({
      kind: "note",
      severity: "info",
      title: "지금은 안정적이에요",
      detail: [
        `CTR ${pct(ins.ctr)} · 특별히 손볼 곳은 없어 보여요.`,
        `계속 지켜보다 성과가 바뀌면 다시 제안해드릴게요.`,
      ],
    });
  }

  return out;
}

/* ── 자동화 준비도 ────────────────────────────────────────────── */

export type AutomationReadiness = {
  ready: boolean;
  // ready면 "충분한 이유", 아니면 "부족한 항목" 설명
  reason: string;
};

export function assessAutomationReadiness(
  ins: OptimizationInsights,
  daysOfData: number,
): AutomationReadiness {
  const gaps: string[] = [];
  if (ins.impressions < AUTOMATION_MIN_IMPRESSIONS) {
    gaps.push(`노출 ${ins.impressions.toLocaleString("ko-KR")}회 (목표 ${AUTOMATION_MIN_IMPRESSIONS.toLocaleString("ko-KR")}회)`);
  }
  if (ins.clicks < AUTOMATION_MIN_CLICKS) {
    gaps.push(`클릭 ${ins.clicks.toLocaleString("ko-KR")}회 (목표 ${AUTOMATION_MIN_CLICKS}회)`);
  }
  if (daysOfData < AUTOMATION_MIN_DAYS) {
    gaps.push(`집행 ${daysOfData}일 (목표 ${AUTOMATION_MIN_DAYS}일)`);
  }
  if (ins.ctr < LOW_CTR_PCT) {
    gaps.push(`CTR ${pct(ins.ctr)} — 낮아서 먼저 개선 필요`);
  }
  if (gaps.length === 0) {
    return {
      ready: true,
      reason: `노출 ${ins.impressions.toLocaleString("ko-KR")}회 · 클릭 ${ins.clicks.toLocaleString("ko-KR")}회 · CTR ${pct(ins.ctr)} — 자동 판단이 안정적으로 동작할 만큼 데이터가 쌓였어요.`,
    };
  }
  return { ready: false, reason: gaps.join(" / ") };
}
