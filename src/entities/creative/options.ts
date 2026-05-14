export const TONES = [
  { id: 'warm' as const, label: '감성적·따뜻하게', promptDesc: '감성적이고 따뜻한 톤' },
  { id: 'pro' as const, label: '전문적·신뢰감 있게', promptDesc: '전문적이고 신뢰감 있는 톤' },
  { id: 'trendy' as const, label: '트렌디·발랄하게', promptDesc: '트렌디하고 발랄한 톤' },
] as const

export const CTAS = [
  { id: 'buy' as const, label: '지금 구매하기' },
  { id: 'learn' as const, label: '자세히 알아보기' },
  { id: 'sample' as const, label: '무료 샘플 받기' },
] as const

export const IMAGES = [
  { id: 'img1' as const, art: 'art-cyan' },
  { id: 'img2' as const, art: 'art-lavender' },
  { id: 'img3' as const, art: 'art-warmgreen' },
] as const

export type ToneId = (typeof TONES)[number]['id']
export type CtaId = (typeof CTAS)[number]['id']
export type ImageId = (typeof IMAGES)[number]['id']

export const TONE_PROMPT_DESC: Record<ToneId, string> = {
  warm: '감성적이고 따뜻한 톤',
  pro: '전문적이고 신뢰감 있는 톤',
  trendy: '트렌디하고 발랄한 톤',
}

export const CTA_LABEL: Record<CtaId, string> = {
  buy: '지금 구매하기',
  learn: '자세히 알아보기',
  sample: '무료 샘플 받기',
}

export const CTA_META_TYPE: Record<CtaId, string> = {
  buy: 'SHOP_NOW',
  learn: 'LEARN_MORE',
  sample: 'GET_OFFER',
}

export const IMAGE_ART: Record<ImageId, string> = {
  img1: 'art-cyan',
  img2: 'art-lavender',
  img3: 'art-warmgreen',
}

export const OBJECTIVES_PHASE1 = [
  { id: 'traffic'    as const, metaObjective: 'OUTCOME_TRAFFIC'    as const, label: '트래픽',  outcomeLabel: '더 많은 사이트 방문', copyTone: '클릭 유도·urgency·명확한 CTA 강조' },
  { id: 'engagement' as const, metaObjective: 'OUTCOME_ENGAGEMENT' as const, label: '참여',    outcomeLabel: '더 많은 게시물 반응', copyTone: '공감·질문 던지기·대화형, 댓글/공유를 유도' },
  { id: 'awareness'  as const, metaObjective: 'OUTCOME_AWARENESS'  as const, label: '인지도',  outcomeLabel: '인지도 넓히기',       copyTone: '브랜드 약속·메모러블·짧고 강한 헤드라인, 첫 노출 인상 위주' },
] as const

export const OBJECTIVES_PHASE2 = [
  { id: 'leads'         as const, label: '잠재고객', outcomeLabel: '더 많은 가입자',  reason: '리드 폼·개인정보처리방침 URL 연동 필요' },
  { id: 'sales'         as const, label: '판매',     outcomeLabel: '더 많은 매출',    reason: 'Meta Pixel·전환 이벤트 매핑 필요' },
  { id: 'app_promotion' as const, label: '앱 홍보',  outcomeLabel: '더 많은 앱 설치', reason: '앱 등록·Meta SDK 연동 필요' },
] as const

export type ObjectivePhase1Id = (typeof OBJECTIVES_PHASE1)[number]['id']
export type ObjectivePhase2Id = (typeof OBJECTIVES_PHASE2)[number]['id']
export type MetaObjective = (typeof OBJECTIVES_PHASE1)[number]['metaObjective']

export function findObjective(id: ObjectivePhase1Id) {
  return OBJECTIVES_PHASE1.find((o) => o.id === id)!
}

export const META_OBJECTIVE_API_MAP: Record<MetaObjective, { optimizationGoal: string; billingEvent: string }> = {
  OUTCOME_TRAFFIC:    { optimizationGoal: 'LINK_CLICKS',     billingEvent: 'LINK_CLICKS' },
  OUTCOME_ENGAGEMENT: { optimizationGoal: 'POST_ENGAGEMENT', billingEvent: 'IMPRESSIONS' },
  OUTCOME_AWARENESS:  { optimizationGoal: 'REACH',           billingEvent: 'IMPRESSIONS' },
}
