import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { metaAds } from '@/lib/meta-ads'
import { withRouteHandler, ValidationError } from '@/lib/route-handler'
import { CTA_META_TYPE, type CtaId } from '@/lib/creative-options'
import { COUNTRY_CODES } from '@/lib/geo-options'

const MIN_DAILY_BUDGET_KRW = 10_000
// 3MB 이미지를 base64 로 인코딩하면 약 4MB — data URL prefix 포함 여유분
const MAX_IMAGE_DATA_URL_LEN = 4_300_000

type CampaignRequestBody = {
  headline?: string
  primaryText?: string
  dailyBudget?: number
  startDate?: string
  endDate?: string
  ageMin?: number
  ageMax?: number
  genders?: number[]
  countries?: string[]
  linkUrl?: string
  cta?: CtaId
  status?: 'ACTIVE' | 'PAUSED'
  imageDataUrl?: string
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken || !session?.adAccountId || !session?.pageId) {
    return NextResponse.json(
      { error: '광고 계정과 페이스북 페이지를 먼저 선택해주세요.' },
      { status: 401 },
    )
  }
  const { accessToken, adAccountId, pageId } = session
  return withRouteHandler(true, '', async () => {
      const body = (await req.json()) as CampaignRequestBody
      const { headline, primaryText, dailyBudget, startDate, endDate, ageMin, ageMax, linkUrl, cta, imageDataUrl } = body
      const genders = Array.isArray(body.genders)
        ? Array.from(new Set(body.genders.filter((g) => g === 1 || g === 2)))
        : []
      const countries = Array.isArray(body.countries)
        ? Array.from(new Set(body.countries.filter((c) => typeof c === 'string' && COUNTRY_CODES.has(c))))
        : []
      if (countries.length === 0) {
        throw new ValidationError('타겟 지역(국가)을 최소 한 곳 선택해주세요.')
      }

      if (!headline || !primaryText || !dailyBudget || !startDate || !endDate || !linkUrl) {
        throw new ValidationError('필수 필드가 누락됐어요.')
      }

      let parsedUrl: URL
      try {
        parsedUrl = new URL(linkUrl)
      } catch {
        throw new ValidationError('랜딩 URL 형식이 올바르지 않아요.')
      }
      if (parsedUrl.protocol !== 'https:') {
        throw new ValidationError('랜딩 URL 은 https:// 로 시작해야 해요.')
      }

      if (typeof dailyBudget !== 'number' || !Number.isFinite(dailyBudget) || dailyBudget < MIN_DAILY_BUDGET_KRW) {
        throw new ValidationError(`일일 예산은 최소 ₩${MIN_DAILY_BUDGET_KRW.toLocaleString('ko-KR')} 이상이어야 해요.`)
      }

      const status = body.status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED'
      if (status === 'ACTIVE') {
        const today = new Date().toISOString().slice(0, 10)
        if (startDate < today) {
          throw new ValidationError('지금 바로 게재하려면 시작일이 오늘 이후여야 해요.')
        }
      }

      if (imageDataUrl !== undefined) {
        if (typeof imageDataUrl !== 'string' || !imageDataUrl.startsWith('data:image/')) {
          throw new ValidationError('업로드한 이미지 형식을 인식할 수 없어요.')
        }
        if (imageDataUrl.length > MAX_IMAGE_DATA_URL_LEN) {
          throw new ValidationError('이미지 용량은 3MB 이하여야 해요. (JPEG 권장)')
        }
      }

      const ctaType = (cta && CTA_META_TYPE[cta]) || 'LEARN_MORE'

      const result = await metaAds.createCampaign(
        {
          headline,
          primaryText,
          dailyBudget,
          startDate,
          endDate,
          ageMin: ageMin ?? 18,
          ageMax: ageMax ?? 65,
          genders,
          countries,
          linkUrl,
          ctaType,
          status,
          imageDataUrl,
        },
        accessToken,
        adAccountId,
        pageId,
      )
      return NextResponse.json(result)
    })
}
