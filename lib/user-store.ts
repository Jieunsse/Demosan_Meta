// Server-side only — service-role Supabase 접근. axhub 신원에 매달리는 영속 레이어.
//
// 모델 (사용자 합의):
//   직원 (axhub/Google 신원)
//     └─ Meta 연결  { accessToken(60일), adAccountId, pageId, igUserId, igAccessToken ... }
//     └─ role · workspace  (자체 관리, Q4)
//
// Google 로그인 = 신원 앵커. 최초 1회 Facebook 연결로 받은 Meta 연결을 여기 저장 →
// 2회차+ 로그인 시 자동 복원 → 페북·인스타가 한꺼번에 붙는다.
//
// Supabase 미설정(로컬/데모)이면 모든 함수가 graceful no-op/기본값 → 휴면.

import { getSupabaseServer } from "@shared/lib/supabase-server"
import type { AxhubUser } from "./axhub-auth"

const TABLE = "app_users"

export type Role = "팀장" | "팀원·게재" | "팀원·검토"

// auth.ts 의 JWT/Session Meta 필드와 1:1 대응.
export type MetaConnection = {
  accessToken?: string
  adAccountId?: string
  adAccountName?: string
  pageId?: string
  pageName?: string
  pixelId?: string
  pixelName?: string
  igUserId?: string
  igUsername?: string
  igAccessToken?: string
}

export type AppUser = {
  axhubId: string
  email: string
  name?: string
  image?: string
  role: Role
  workspaceId?: string
}

// 첫 로그인이면 생성(기본 역할 팀장 — 기존 FB 흐름과 동일), 있으면 신원 필드만 갱신.
// 역할·워크스페이스는 자체 관리값이므로 로그인 때 덮어쓰지 않고 보존한다.
export async function upsertUserOnLogin(u: AxhubUser): Promise<AppUser> {
  const supabase = getSupabaseServer()
  if (!supabase) return { axhubId: u.axhubId, email: u.email, name: u.name, image: u.image, role: "팀장" }

  const { data: existing } = await supabase
    .from(TABLE)
    .select("role, workspace_id")
    .eq("axhub_id", u.axhubId)
    .maybeSingle()

  const role: Role = (existing?.role as Role) ?? "팀장"
  const workspaceId: string | undefined = existing?.workspace_id ?? undefined

  const { error } = await supabase.from(TABLE).upsert({
    axhub_id: u.axhubId,
    email: u.email,
    name: u.name ?? null,
    image: u.image ?? null,
    role,
    workspace_id: workspaceId ?? null,
    updated_at: new Date().toISOString(),
  })
  if (error) throw new Error(`사용자 저장 실패: ${error.message}`)

  return { axhubId: u.axhubId, email: u.email, name: u.name, image: u.image, role, workspaceId }
}

// 2회차+ 로그인 시 저장된 Meta 연결을 꺼내 JWT 로 복원.
export async function loadMetaConnection(axhubId: string): Promise<MetaConnection | null> {
  const supabase = getSupabaseServer()
  if (!supabase) return null
  const { data, error } = await supabase
    .from(TABLE)
    .select("meta_connection")
    .eq("axhub_id", axhubId)
    .maybeSingle()
  if (error || !data) return null
  return (data.meta_connection as MetaConnection | null) ?? null
}

// Facebook·Instagram 연결(또는 계정 스위처) 변경 시 호출 → 다음 로그인 자동 복원용으로 영속.
export async function saveMetaConnection(axhubId: string, conn: MetaConnection): Promise<void> {
  const supabase = getSupabaseServer()
  if (!supabase) return
  const { error } = await supabase
    .from(TABLE)
    .update({ meta_connection: conn, updated_at: new Date().toISOString() })
    .eq("axhub_id", axhubId)
  if (error) throw new Error(`Meta 연결 저장 실패: ${error.message}`)
}
