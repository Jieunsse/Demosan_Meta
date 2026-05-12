import { useApiMutation } from './useApiMutation'
import type { CtaId } from '@/lib/creative-options'

export type CampaignIds = { camp: string; adset: string; ad: string }

export type LaunchParams = {
  headline: string
  primaryText: string
  dailyBudget: number // 원화(KRW) 정수 — 그대로 Meta 에 전달
  startDate: string
  endDate: string
  ageMin: number
  ageMax: number
  genders: number[] // Meta 규격 — 1=남성, 2=여성, [] = 전체
  countries: string[] // ISO 3166-1 alpha-2
  linkUrl: string
  cta: CtaId
  status: 'ACTIVE' | 'PAUSED'
  imageDataUrl?: string // 선택 — data:image/...;base64,...
}

type LaunchResponse = { campaignId: string; adSetId: string; adId: string }

export function useLaunchCampaign() {
  const mutation = useApiMutation<LaunchParams, LaunchResponse>('/api/campaign')

  const campaignIds: CampaignIds | null = mutation.data
    ? {
        camp: mutation.data.campaignId,
        adset: mutation.data.adSetId,
        ad: mutation.data.adId || '—',
      }
    : null

  return { mutation, campaignIds }
}
