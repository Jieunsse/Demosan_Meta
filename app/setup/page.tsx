"use client"

import { useSession, signOut } from "next-auth/react"
import { useEffect, useState } from "react"

interface AdAccount {
  id: string
  name: string
  currency: string
  account_status: number
}

interface FbPage {
  id: string
  name: string
}

type Phase = "account" | "page"

function ListButton({
  title,
  subtitle,
  busy,
  dimmed,
  disabled,
  onClick,
}: {
  title: string
  subtitle?: string
  busy: boolean
  dimmed: boolean
  disabled: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-3)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: dimmed ? 0.5 : 1,
        transition: "border-color 160ms ease, box-shadow 160ms ease",
        textAlign: "left",
        width: "100%",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"
          ;(e.currentTarget as HTMLButtonElement).style.boxShadow = "0 0 0 1px var(--accent), 0 0 20px var(--accent-glow)"
        }
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = "none"
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <span style={{ fontSize: "var(--text-base)", fontWeight: 600, color: "var(--text-primary)" }}>{title}</span>
        {subtitle && (
          <span className="mono" style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {subtitle}
          </span>
        )}
      </div>
      {busy ? (
        <span className="check-row__spinner" />
      ) : (
        <span style={{ color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>→</span>
      )}
    </button>
  )
}

export default function SetupPage() {
  const { update } = useSession()
  const [phase, setPhase] = useState<Phase>("account")
  const [accounts, setAccounts] = useState<AdAccount[]>([])
  const [pages, setPages] = useState<FbPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selecting, setSelecting] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/setup/ad-accounts")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error)
        else setAccounts(data.accounts)
        setLoading(false)
      })
      .catch(() => {
        setError("광고 계정 목록을 불러오지 못했어요.")
        setLoading(false)
      })
  }, [])

  async function selectAccount(account: AdAccount) {
    setSelecting(account.id)
    setError(null)
    await update({ adAccountId: account.id, adAccountName: account.name })
    setLoading(true)
    try {
      const res = await fetch("/api/setup/pages")
      const data = await res.json()
      if (data.error) setError(data.error)
      else setPages(data.pages)
    } catch {
      setError("페이스북 페이지 목록을 불러오지 못했어요.")
    }
    setSelecting(null)
    setLoading(false)
    setPhase("page")
  }

  async function selectPage(page: FbPage) {
    setSelecting(page.id)
    await update({ pageId: page.id, pageName: page.name, browseMode: false })
    window.location.href = "/"
  }

  async function browseAround() {
    setSelecting("__browse__")
    await update({ browseMode: true })
    window.location.href = "/"
  }

  const isPage = phase === "page"

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-5)",
      }}
    >
      <div
        className="card"
        style={{
          width: "100%",
          maxWidth: "480px",
          padding: "var(--space-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <a className="logo" href="#" style={{ fontSize: "18px" }}>
            <span className="logo__dot" />
            <span>AdFlow</span>
          </a>
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {isPage ? "2 / 2 단계" : "1 / 2 단계"}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-md)",
              fontWeight: 600,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            {isPage ? "광고를 게재할 페이스북 페이지를 선택해주세요" : "광고 계정을 선택해주세요"}
          </p>
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-secondary)" }}>
            {isPage
              ? "선택한 페이지 명의로 광고 소재가 게재돼요."
              : "선택한 계정으로 광고를 집행하고 성과를 확인해요."}
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "var(--space-6) 0" }}>
            <span className="check-row__spinner" style={{ display: "inline-block", margin: "0 auto" }} />
            <p style={{ marginTop: "var(--space-3)", fontSize: "var(--text-sm)" }}>불러오는 중...</p>
          </div>
        )}

        {error && (
          <div
            style={{
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.3)",
              borderRadius: "var(--radius-md)",
              padding: "var(--space-4)",
              fontSize: "var(--text-sm)",
              color: "var(--warning)",
            }}
          >
            {error}
          </div>
        )}

        {!loading && !error && !isPage && accounts.length === 0 && (
          <div className="empty-frame" style={{ minHeight: "120px" }}>
            <p className="empty-frame__title">연결된 광고 계정이 없어요</p>
            <p className="empty-frame__hint">Meta Business Manager에서 광고 계정을 먼저 만들어주세요.</p>
          </div>
        )}

        {!loading && !error && isPage && pages.length === 0 && (
          <div className="empty-frame" style={{ minHeight: "120px" }}>
            <p className="empty-frame__title">관리 중인 페이스북 페이지가 없어요</p>
            <p className="empty-frame__hint">
              페이지 권한이 없거나 페이지가 없어요. 로그아웃 후 다시 로그인하면 페이지 접근 권한을 다시 요청해요.
            </p>
          </div>
        )}

        {!loading && !isPage && accounts.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {accounts.map((account) => (
              <ListButton
                key={account.id}
                title={account.name}
                subtitle={`${account.id} · ${account.currency}`}
                busy={selecting === account.id}
                dimmed={!!selecting && selecting !== account.id}
                disabled={!!selecting}
                onClick={() => selectAccount(account)}
              />
            ))}
          </div>
        )}

        {!loading && isPage && pages.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            {pages.map((page) => (
              <ListButton
                key={page.id}
                title={page.name}
                subtitle={page.id}
                busy={selecting === page.id}
                dimmed={!!selecting && selecting !== page.id}
                disabled={!!selecting}
                onClick={() => selectPage(page)}
              />
            ))}
          </div>
        )}

        {isPage && !selecting && (
          <button
            className="btn btn--ghost"
            style={{ fontSize: "var(--text-sm)", padding: "8px 16px", alignSelf: "flex-start" }}
            onClick={() => {
              setPhase("account")
              setError(null)
            }}
          >
            ← 광고 계정 다시 선택
          </button>
        )}

        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <button
            className="btn btn--ghost"
            style={{ fontSize: "var(--text-sm)", padding: "8px 16px" }}
            disabled={!!selecting}
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            다른 계정으로 로그인
          </button>
          <button
            className="btn btn--ghost"
            style={{ fontSize: "var(--text-sm)", padding: "8px 16px" }}
            disabled={!!selecting}
            onClick={browseAround}
          >
            {selecting === "__browse__" ? "이동 중…" : "우선 둘러보기 →"}
          </button>
        </div>
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
          둘러보기 모드에선 소재 생성·화면 미리보기는 가능하지만, 실제 광고 집행은 광고 계정·페이지를 연결해야 해요.
        </p>
      </div>
    </div>
  )
}
