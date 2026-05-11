import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { metaAds } from '@/lib/meta-ads'
import { withRouteHandler } from '@/lib/route-handler'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const { accessToken } = session
  return withRouteHandler(true, '', async () =>
    NextResponse.json(await metaAds.getInsights(id, accessToken))
  )
}
