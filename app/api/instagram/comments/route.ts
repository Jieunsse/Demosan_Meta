import { NextResponse, type NextRequest } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { listComments, createComment } from "@/lib/instagram-comments"

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 })

  const mediaId = req.nextUrl.searchParams.get("mediaId")?.trim()
  if (!mediaId) return NextResponse.json({ ok: false, error: "mediaId 가 필요합니다." }, { status: 400 })

  const result = await listComments({
    mediaId,
    igAccessToken: session.igAccessToken,
    pageId: session.pageId,
    accessToken: session.accessToken,
  })
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 })

  const { mediaId, message } = await req.json() as { mediaId?: string; message?: string }
  if (!mediaId || !message?.trim()) {
    return NextResponse.json({ ok: false, error: "mediaId 와 message 가 필요합니다." }, { status: 400 })
  }

  const result = await createComment({
    mediaId,
    message: message.trim(),
    igAccessToken: session.igAccessToken,
    pageId: session.pageId,
    accessToken: session.accessToken,
  })
  return NextResponse.json(result)
}
