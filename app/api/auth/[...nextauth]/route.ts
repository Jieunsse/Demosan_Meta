import NextAuth from "next-auth"
import { getAuthOptionsForNextAuth } from "@/lib/auth"

// NextAuth 핸들러는 요청마다 동적으로 빌드 — Meta 자격증명이 마법사로 교체되면 5분 캐시 후 자동 반영.
async function handler(
  req: Request,
  ctx: { params: Promise<{ nextauth: string[] }> },
): Promise<Response> {
  const authOptions = await getAuthOptionsForNextAuth()
  // @ts-expect-error — NextAuth v4 의 App Router 핸들러는 (req, ctx) 시그니처를 받지만 타입이 엄격하지 않음.
  return NextAuth(authOptions)(req, ctx)
}

export { handler as GET, handler as POST }
