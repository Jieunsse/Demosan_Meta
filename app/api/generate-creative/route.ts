import { NextRequest, NextResponse } from 'next/server'
import { geminiCreative, type GenerateCreativeParams } from '@/lib/gemini-creative'
import { withRouteHandler, ValidationError } from '@/lib/route-handler'

export async function POST(req: NextRequest) {
  return withRouteHandler(
    geminiCreative.isConfigured,
    'GOOGLE_AI_API_KEY 가 .env.local 에 설정되지 않았어요.',
    async () => {
      const body = (await req.json()) as Partial<GenerateCreativeParams>
      const { brand, target, goal, tone } = body
      if (!brand || !target || !goal || !tone) {
        throw new ValidationError('필수 필드가 누락됐어요.')
      }
      const result = await geminiCreative.generate({ brand, target, goal, tone })
      return NextResponse.json(result)
    }
  )
}
