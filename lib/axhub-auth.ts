// Server-side only — AXHUB_* 시크릿. "use client" 컴포넌트에서 import 금지.
//
// axhub 플랫폼 로그인 = Google 기반. 우리 앱은 axhub 가 넘겨주는 "신원"만 받는다.
// (Meta 광고 권한 토큰은 Google 이 줄 수 없으므로 Facebook 연결로 별도 획득 → user-store 에 영속)
//
// 사수 확인 중인 3가지를 이 파일이 분기로 흡수한다:
//   (1) 전달 프로토콜  → AXHUB_AUTH_MODE: "oidc" | "token" | "header"
//   (2) 사용자 조회    → oidc=wellKnown userinfo/idToken 자동 / token·header=verifyAxhubIdentity
//   (3) 검증 방법      → oidc=JWKS 자동 / token·header=verifyAxhubIdentity 스텁(스펙 확정 후)
// 확정된 것:
//   (4) 역할·워크스페이스 = 우리 자체 관리 (lib/user-store.ts, Supabase)

import type { AuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

type Provider = NonNullable<AuthOptions["providers"]>[number]

export type AxhubAuthMode = "oidc" | "token" | "header"

// axhub 가 넘겨주는 신원의 정규화 형태. 프로토콜이 무엇이든 이 형태로 좁힌다.
export type AxhubUser = {
  axhubId: string // axhub 사용자 고유 id (Google sub 기반)
  email: string
  name?: string
  image?: string
}

function resolveMode(): AxhubAuthMode | null {
  const m = process.env.AXHUB_AUTH_MODE
  return m === "oidc" || m === "token" || m === "header" ? m : null
}

export function isAxhubAuthConfigured(): boolean {
  return resolveMode() !== null
}

// NextAuth provider 빌더. 미설정이면 null → 등록 안 됨(휴면). Facebook conditional 등록과 동일 패턴.
export function buildAxhubProvider(): Provider | null {
  const mode = resolveMode()
  if (!mode) return null

  if (mode === "oidc") {
    const issuer = process.env.AXHUB_ISSUER
    const clientId = process.env.AXHUB_CLIENT_ID
    const clientSecret = process.env.AXHUB_CLIENT_SECRET
    if (!issuer || !clientId || !clientSecret) return null
    // OIDC authorization code flow: wellKnown 디스커버리가 (2)userinfo·(3)JWKS 검증을 자동 흡수.
    // axhub 가 OIDC 면 이 모드만으로 별도 검증 구현 없이 동작한다.
    return {
      id: "axhub",
      name: "axhub",
      type: "oauth",
      wellKnown: `${issuer.replace(/\/+$/, "")}/.well-known/openid-configuration`,
      authorization: { params: { scope: "openid email profile" } },
      idToken: true,
      clientId,
      clientSecret,
      profile(p: { sub: string; email?: string; name?: string; picture?: string }) {
        return { id: p.sub, email: p.email ?? "", name: p.name, image: p.picture }
      },
    } as unknown as Provider
  }

  // token / header 모드: axhub 가 서명된 토큰(또는 신뢰 헤더)으로 신원을 주입하는 경우.
  // 검증 로직은 스펙 확정 후 verifyAxhubIdentity 에 채운다(미구현 시 로그인 시도하면 명시적 throw).
  return CredentialsProvider({
    id: "axhub",
    name: "axhub",
    credentials: { token: { label: "axhub token", type: "text" } },
    async authorize(creds) {
      const user = await verifyAxhubIdentity(creds?.token, mode)
      if (!user) return null
      return { id: user.axhubId, email: user.email, name: user.name, image: user.image }
    },
  })
}

// (2)(3) 검증 seam — 스펙 확정 후 구현.
//   token  : axhub 서명 JWT → JWKS(공개키) 또는 공유 시크릿으로 서명 검증 후 클레임에서 신원 추출.
//   header : 리버스 프록시 신뢰 헤더(예: X-Axhub-User) → middleware 가 전달한 값 신뢰.
// OIDC 라면 이 함수는 호출되지 않는다 (AXHUB_AUTH_MODE=oidc 권장).
async function verifyAxhubIdentity(
  _token: string | undefined,
  mode: Exclude<AxhubAuthMode, "oidc">,
): Promise<AxhubUser | null> {
  throw new Error(
    `axhub ${mode} 인증은 아직 미구현이에요. 스펙(검증 방법) 확정 후 verifyAxhubIdentity 를 채워주세요. ` +
      `axhub 가 OIDC provider 라면 AXHUB_AUTH_MODE=oidc 로 두면 별도 구현 없이 동작해요.`,
  )
}
