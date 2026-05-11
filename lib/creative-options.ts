// 소재 옵션 단일 소스 — 클라이언트/서버 양쪽에서 import 가능
// 톤·CTA·이미지 옵션을 여기서만 정의해요.

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

// Meta Marketing API 의 call_to_action.type 으로 매핑
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
