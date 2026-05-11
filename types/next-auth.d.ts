import "next-auth"
import "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    adAccountId?: string
    adAccountName?: string
    pageId?: string
    pageName?: string
    browseMode?: boolean
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    adAccountId?: string
    adAccountName?: string
    pageId?: string
    pageName?: string
    browseMode?: boolean
  }
}
