import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/auth/callback")) {
    const params = Object.fromEntries(request.nextUrl.searchParams)
    console.log("[middleware][oauth-callback] path:", request.nextUrl.pathname)
    console.log("[middleware][oauth-callback] params:", JSON.stringify(params))
    console.log("[middleware][oauth-callback] has_state:", !!params.state)
    console.log("[middleware][oauth-callback] has_code:", !!params.code)
    console.log("[middleware][oauth-callback] has_error:", !!params.error)
  }
  return NextResponse.next()
}

export const config = {
  matcher: "/api/auth/:path*",
}
