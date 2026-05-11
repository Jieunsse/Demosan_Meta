import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { metaAds } from '@/lib/meta-ads'
import { withRouteHandler } from '@/lib/route-handler'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.accessToken || !session?.adAccountId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { accessToken, adAccountId } = session
  return withRouteHandler(true, '', async () =>
    NextResponse.json(await metaAds.checkAccount(accessToken, adAccountId))
  )
}
