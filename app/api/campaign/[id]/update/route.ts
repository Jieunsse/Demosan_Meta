import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { metaAds, type BidStrategyParam, type PlatformsParam, type PlacementsParam } from '@/lib/meta-ads'
import { withRouteHandler, ValidationError } from '@/lib/route-handler'

const MIN_DAILY_BUDGET_KRW = 10_000

type UpdateBody = {
  adSet?: {
    dailyBudget?: number
    startDate?: string       // YYYY-MM-DD
    endDate?: string | null  // null = 종료일 제거
    targeting?: {
      ageMin?: number
      ageMax?: number
      genders?: number[]
      countries?: string[]
    }
    bidStrategy?: BidStrategyParam
    bidAmount?: number | null
    platforms?: PlatformsParam
    placements?: PlacementsParam
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken || !session?.adAccountId) {
    return NextResponse.json({ error: '광고 계정을 먼저 연결해주세요.' }, { status: 401 })
  }
  const { accessToken } = session
  const { id: campaignId } = await params

  return withRouteHandler(true, '', async () => {
    const body = (await req.json()) as UpdateBody

    if (!body.adSet || Object.keys(body.adSet).length === 0) {
      throw new ValidationError('변경할 필드가 없어요.')
    }

    if (
      body.adSet.dailyBudget !== undefined &&
      (typeof body.adSet.dailyBudget !== 'number' || body.adSet.dailyBudget < MIN_DAILY_BUDGET_KRW)
    ) {
      throw new ValidationError(`일일 예산은 최소 ₩${MIN_DAILY_BUDGET_KRW.toLocaleString('ko-KR')} 이상이어야 해요.`)
    }

    const campaign = await metaAds.getCampaign(campaignId, accessToken)
    if (!campaign.adSetId) {
      throw new ValidationError('이 캠페인의 광고 세트를 찾을 수 없어요.')
    }

    const appliedFields = await metaAds.updateAdSet(campaign.adSetId, accessToken, body.adSet)

    return NextResponse.json({ ok: true, appliedFields, updatedAt: new Date().toISOString() })
  })
}
