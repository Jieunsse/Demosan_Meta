// Shared performance thresholds used by both server-side winner detection
// (lib/optimization.ts) and client-side suggestion engine (optimization.ts).

export const MIN_IMPRESSIONS = 1_000;
export const MIN_DAYS = 3;

export const GOOD_CTR_PCT = 2.0;
export const HIGH_CPC_KRW = 2000;
export const HIGH_FREQUENCY = 3.0;
export const HIGH_CPM_KRW = 8000;
export const GOOD_ENGAGEMENT_RATE = 2.5;
