import { NextRequest, NextResponse } from 'next/server'
import { geminiImage, type GenerateImageParams, type ReferenceImage } from '@/lib/gemini-image'
import { withRouteHandler, ValidationError } from '@/lib/route-handler'

const MAX_REFERENCE_IMAGES = 6

function sanitizeRefs(raw: unknown): ReferenceImage[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const refs = raw
    .filter((r): r is ReferenceImage =>
      !!r && typeof (r as ReferenceImage).mimeType === 'string' && typeof (r as ReferenceImage).dataBase64 === 'string',
    )
    .slice(0, MAX_REFERENCE_IMAGES)
  return refs.length ? refs : undefined
}

export async function POST(req: NextRequest) {
  return withRouteHandler(
    geminiImage.isConfigured,
    'GOOGLE_AI_API_KEY 가 .env.local 에 설정되지 않았어요.',
    async () => {
      const body = (await req.json()) as Partial<GenerateImageParams>
      const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : ''
      if (!prompt) throw new ValidationError('이미지 프롬프트를 입력해주세요.')
      const result = await geminiImage.generate({
        prompt,
        referenceImages: sanitizeRefs(body.referenceImages),
        count: typeof body.count === 'number' ? body.count : undefined,
      })
      return NextResponse.json(result)
    },
  )
}
