// Meta Marketing API 모듈 (Server-side 전용)
// 'use client' 컴포넌트에서 import 금지 — 액세스 토큰이 노출돼요.

import { AuthError } from './route-handler'

const GRAPH = 'https://graph.facebook.com/v20.0'

/* ── Types ──────────────────────────────────────────────────────── */

export interface CreateCampaignParams {
  headline: string
  bodyCopy: string
  dailyBudget: number  // 원화(KRW) 정수 — Meta 에 그대로 전달 (KRW 는 소수 단위 없음)
  startDate: string    // YYYY-MM-DD
  endDate: string      // YYYY-MM-DD
  ageMin: number
  ageMax: number
  genders?: number[]   // Meta 규격 — 1=남성, 2=여성, 비거나 미지정이면 전체
  countries: string[]  // ISO 3166-1 alpha-2 코드 (최소 1개)
  linkUrl: string      // 광고 클릭 시 이동할 랜딩 URL (https)
  ctaType: string      // Meta call_to_action.type — 예: LEARN_MORE, SHOP_NOW
  status: 'ACTIVE' | 'PAUSED' // Campaign/AdSet/Ad 모두 동일하게 적용
  imageDataUrl?: string // 선택 — data:image/...;base64,... 형식의 광고 이미지
}

export interface CampaignResult {
  campaignId: string
  adSetId: string
  adId: string
}

export interface InsightsResult {
  impressions: number
  clicks: number
  ctr: number
  spend: number
  daily: Array<{ date: string; clicks: number; ctr: number; spend: number }>
}

export interface AccountStatus {
  connected: boolean
  accountId: string
  accountName: string
  currency: string
}

/* ── Internal helpers ───────────────────────────────────────────── */

interface MetaError { error: { message: string; code: number; error_subcode?: number; error_user_msg?: string; error_data?: string } }

async function graphFetch<T extends object>(path: string, init: RequestInit = {}): Promise<T> {
  const url = path.startsWith('http') ? path : `${GRAPH}${path}`
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  const json = (await res.json()) as T | MetaError
  if ('error' in json) {
    const e = (json as MetaError).error
    // 190 = 액세스 토큰 만료/무효 → 재로그인 필요
    if (e.code === 190) {
      throw new AuthError('Meta 인증이 만료됐어요. 로그아웃 후 다시 로그인해주세요.')
    }
    const detail = [
      e.error_subcode ? `subcode=${e.error_subcode}` : '',
      e.error_user_msg ?? '',
      e.error_data ? `data=${e.error_data}` : '',
    ].filter(Boolean).join(' | ')
    throw new Error(`Meta API 오류 (${e.code}): ${e.message}${detail ? ` — ${detail}` : ''}`)
  }
  return json as T
}

function toUnixKST(date: string, endOfDay = false): number {
  const d = new Date(`${date}T${endOfDay ? '23:59:59' : '00:00:00'}+09:00`)
  return Math.floor(d.getTime() / 1000)
}

// 광고 이미지를 Meta 에 업로드하고 image_hash 를 돌려줘요.
// dataUrl 은 'data:image/png;base64,XXXX' 형식 — 앞 prefix 를 떼고 bytes 로 전송해요.
async function uploadAdImage(dataUrl: string, token: string, accountId: string): Promise<string> {
  const base64 = dataUrl.includes(',') ? dataUrl.slice(dataUrl.indexOf(',') + 1) : dataUrl
  const data = await graphFetch<{ images: Record<string, { hash: string; url: string }> }>(
    `/${accountId}/adimages`,
    { method: 'POST', body: JSON.stringify({ bytes: base64, access_token: token }) },
  )
  const first = Object.values(data.images ?? {})[0]
  if (!first?.hash) throw new Error('광고 이미지 업로드에 실패했어요. 다른 이미지로 다시 시도해주세요.')
  return first.hash
}

/* ── API ─────────────────────────────────────────────────────────── */

export const metaAds = {
  async checkAccount(token: string, accountId: string): Promise<AccountStatus> {
    const data = await graphFetch<{
      name: string
      account_status: number
      currency: string
    }>(`/${accountId}?fields=name,account_status,currency&access_token=${token}`)
    return {
      connected: data.account_status === 1,
      accountId,
      accountName: data.name,
      currency: data.currency,
    }
  },

  async createCampaign(params: CreateCampaignParams, token: string, accountId: string, pageId: string): Promise<CampaignResult> {
    if (!pageId) {
      throw new Error('광고를 게재하려면 페이스북 페이지를 먼저 선택해야 해요.')
    }
    if (!params.countries || params.countries.length === 0) {
      throw new Error('타겟 지역(국가)을 최소 한 곳 선택해야 해요.')
    }
    const status = params.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED'

    // 0. (선택) 광고 이미지 업로드 → image_hash
    const imageHash = params.imageDataUrl
      ? await uploadAdImage(params.imageDataUrl, token, accountId)
      : undefined

    // 1. Campaign
    const campaign = await graphFetch<{ id: string }>(`/${accountId}/campaigns`, {
      method: 'POST',
      body: JSON.stringify({
        name: `AdFlow — ${params.headline}`,
        objective: 'OUTCOME_TRAFFIC',
        status,
        special_ad_categories: [],
        is_adset_budget_sharing_enabled: false,
        access_token: token,
      }),
    })

    // 캠페인 생성 이후 단계에서 실패하면, 만들어진 캠페인(+하위 광고세트/광고)을 지워서
    // 광고 계정에 미완성 캠페인이 남지 않게 해요.
    try {
      // 2. Ad Set
      const adSet = await graphFetch<{ id: string }>(`/${accountId}/adsets`, {
        method: 'POST',
        body: JSON.stringify({
          name: `AdFlow AdSet — ${params.headline}`,
          campaign_id: campaign.id,
          billing_event: 'IMPRESSIONS',
          optimization_goal: 'LINK_CLICKS',
          bid_strategy: 'LOWEST_COST_WITHOUT_CAP',
          daily_budget: String(params.dailyBudget),
          destination_type: 'WEBSITE',
          targeting: {
            age_min: params.ageMin,
            age_max: params.ageMax,
            ...(params.genders && params.genders.length > 0 ? { genders: params.genders } : {}),
            geo_locations: { countries: params.countries },
            targeting_automation: { advantage_audience: 0 },
          },
          start_time: toUnixKST(params.startDate),
          end_time: toUnixKST(params.endDate, true),
          status,
          access_token: token,
        }),
      })

      // 3. Ad Creative
      const creative = await graphFetch<{ id: string }>(`/${accountId}/adcreatives`, {
        method: 'POST',
        body: JSON.stringify({
          name: `AdFlow Creative — ${params.headline}`,
          object_story_spec: {
            page_id: pageId,
            link_data: {
              message: params.bodyCopy,
              link: params.linkUrl,
              name: params.headline,
              call_to_action: { type: params.ctaType },
              ...(imageHash ? { image_hash: imageHash } : {}),
            },
          },
          access_token: token,
        }),
      })

      // 4. Ad
      const ad = await graphFetch<{ id: string }>(`/${accountId}/ads`, {
        method: 'POST',
        body: JSON.stringify({
          name: `AdFlow Ad — ${params.headline}`,
          adset_id: adSet.id,
          creative: { creative_id: creative.id },
          status,
          access_token: token,
        }),
      })

      return { campaignId: campaign.id, adSetId: adSet.id, adId: ad.id }
    } catch (err) {
      try {
        await graphFetch<{ success?: boolean }>(`/${campaign.id}?access_token=${token}`, { method: 'DELETE' })
      } catch {
        // 정리 실패는 무시 — 원래 에러를 그대로 올려요
      }
      throw err
    }
  },

  async getInsights(campaignId: string, token: string): Promise<InsightsResult> {
    const data = await graphFetch<{
      data: Array<{
        date_start: string
        impressions: string
        clicks: string
        ctr: string
        spend: string
      }>
    }>(
      `/${campaignId}/insights` +
        `?fields=impressions,clicks,ctr,spend` +
        `&time_increment=1` +
        `&access_token=${token}`
    )

    const daily = data.data.map((d) => ({
      date: d.date_start,
      clicks: Number(d.clicks ?? 0),
      ctr: parseFloat(d.ctr ?? '0'),
      spend: parseFloat(d.spend ?? '0'),
    }))

    const totals = daily.reduce(
      (acc, d) => ({
        impressions: acc.impressions,
        clicks: acc.clicks + d.clicks,
        spend: acc.spend + d.spend,
      }),
      { impressions: 0, clicks: 0, spend: 0 }
    )

    const impressionsTotal = data.data.reduce((s, d) => s + Number(d.impressions ?? 0), 0)
    const ctr = impressionsTotal > 0 ? (totals.clicks / impressionsTotal) * 100 : 0

    return {
      impressions: impressionsTotal,
      clicks: totals.clicks,
      ctr: Math.round(ctr * 100) / 100,
      spend: Math.round(totals.spend),
      daily,
    }
  },

  // Meta 는 PATCH 대신 POST /{id} 로 객체 필드를 갱신해요.
  async setStatus(objectId: string, token: string, status: 'ACTIVE' | 'PAUSED'): Promise<void> {
    await graphFetch<{ success?: boolean }>(`/${objectId}`, {
      method: 'POST',
      body: JSON.stringify({ status, access_token: token }),
    })
  },

  async setAdSetDailyBudget(adSetId: string, token: string, dailyBudgetKrw: number): Promise<void> {
    await graphFetch<{ success?: boolean }>(`/${adSetId}`, {
      method: 'POST',
      body: JSON.stringify({ daily_budget: String(dailyBudgetKrw), access_token: token }),
    })
  },

  // 캠페인 일시정지 — 캠페인을 멈추면 하위 광고세트/광고 상태와 무관하게 게재가 중단돼요.
  async pauseCampaign(campaignId: string, token: string): Promise<void> {
    await this.setStatus(campaignId, token, 'PAUSED')
  },

  // 캠페인 재개 — 생성 시 PAUSED 였을 수도 있으니 캠페인·광고세트·광고를 모두 ACTIVE 로.
  async resumeCampaign(campaignId: string, adSetId: string, adId: string, token: string): Promise<void> {
    await this.setStatus(campaignId, token, 'ACTIVE')
    await this.setStatus(adSetId, token, 'ACTIVE')
    if (adId) await this.setStatus(adId, token, 'ACTIVE')
  },
}
