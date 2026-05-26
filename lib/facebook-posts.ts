const GRAPH = "https://graph.facebook.com/v20.0"

export type FbPagePost = {
  id: string
  message: string
  fullPicture?: string
  permalinkUrl?: string
  createdTime: string
  reactionsCount: number
  commentsCount: number
}

export type FbComment = {
  id: string
  fromName?: string
  fromPictureUrl?: string
  message: string
  createdTime: string
  likeCount: number
}

export type FbPagePostsResult = {
  posts: FbPagePost[]
  nextCursor?: string
  mock: boolean
}

export type FbPostCommentsResult = {
  comments: FbComment[]
  mock: boolean
}

export const FB_PAGE_POSTS_MOCK: FbPagePost[] = [
  {
    id: "mock-post-1",
    message: "이번 주말 한정 프로모션 시작! 매장에서 최대 30% 할인을 만나보세요 ✨",
    fullPicture: "https://picsum.photos/seed/fbm1/640/640",
    permalinkUrl: "https://facebook.com/mock/1",
    createdTime: "2026-05-23T09:00:00Z",
    reactionsCount: 218,
    commentsCount: 34,
  },
  {
    id: "mock-post-2",
    message: "오프라인 매장 라이브 — 신제품 첫 공개를 함께해 주신 분들께 감사드려요.",
    fullPicture: "https://picsum.photos/seed/fbm2/640/640",
    permalinkUrl: "https://facebook.com/mock/2",
    createdTime: "2026-05-20T11:30:00Z",
    reactionsCount: 412,
    commentsCount: 89,
  },
  {
    id: "mock-post-3",
    message: "고객 후기 모음 (5월) — 진심을 담은 후기를 보내주신 모든 분들께 감사드립니다.",
    fullPicture: "https://picsum.photos/seed/fbm3/640/640",
    permalinkUrl: "https://facebook.com/mock/3",
    createdTime: "2026-05-15T14:00:00Z",
    reactionsCount: 167,
    commentsCount: 23,
  },
  {
    id: "mock-post-4",
    message: "브랜드 스토리 — 창업 비하인드 영상이 공개됐어요.",
    fullPicture: "https://picsum.photos/seed/fbm4/640/640",
    permalinkUrl: "https://facebook.com/mock/4",
    createdTime: "2026-05-10T10:00:00Z",
    reactionsCount: 298,
    commentsCount: 47,
  },
  {
    id: "mock-post-5",
    message: "팔로워 Q&A 라이브 다시보기 안내.",
    fullPicture: "https://picsum.photos/seed/fbm5/640/640",
    permalinkUrl: "https://facebook.com/mock/5",
    createdTime: "2026-05-04T13:00:00Z",
    reactionsCount: 184,
    commentsCount: 52,
  },
]

export const FB_COMMENTS_MOCK: FbComment[] = [
  { id: "mock-cm-1", fromName: "김민지", message: "정말 기대돼요! 매장 위치가 어디인가요?", createdTime: "2026-05-23T10:12:00Z", likeCount: 4 },
  { id: "mock-cm-2", fromName: "박서준", message: "지난 시즌에 산 제품 너무 만족합니다 👍", createdTime: "2026-05-23T11:42:00Z", likeCount: 12 },
  { id: "mock-cm-3", fromName: "이수아", message: "온라인에서도 같은 할인이 적용되나요?", createdTime: "2026-05-23T13:05:00Z", likeCount: 2 },
]

async function getPageToken(pageId: string, userToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${GRAPH}/${pageId}?fields=access_token&access_token=${userToken}`)
    const data = (await res.json()) as { access_token?: string }
    return data.access_token ?? null
  } catch {
    return null
  }
}

type RawPost = {
  id: string
  message?: string
  full_picture?: string
  permalink_url?: string
  created_time?: string
  reactions?: { summary?: { total_count?: number } }
  comments?: { summary?: { total_count?: number } }
}

export async function listPagePosts(
  pageId: string | undefined,
  userToken: string | undefined,
  cursor?: string,
): Promise<FbPagePostsResult> {
  if (!pageId || !userToken) return { posts: FB_PAGE_POSTS_MOCK, mock: true }
  try {
    const pageToken = await getPageToken(pageId, userToken)
    if (!pageToken) return { posts: FB_PAGE_POSTS_MOCK, mock: true }
    const fields = "id,message,full_picture,permalink_url,created_time,reactions.summary(total_count),comments.summary(total_count)"
    const after = cursor ? `&after=${encodeURIComponent(cursor)}` : ""
    const res = await fetch(`${GRAPH}/${pageId}/posts?fields=${fields}&limit=15${after}&access_token=${pageToken}`)
    if (!res.ok) return { posts: FB_PAGE_POSTS_MOCK, mock: true }
    const data = (await res.json()) as { data?: RawPost[]; paging?: { cursors?: { after?: string }; next?: string } }
    const raw = data.data ?? []
    if (raw.length === 0) return { posts: FB_PAGE_POSTS_MOCK, mock: true }
    const posts: FbPagePost[] = raw.map((p) => ({
      id: p.id,
      message: p.message ?? "",
      fullPicture: p.full_picture,
      permalinkUrl: p.permalink_url,
      createdTime: p.created_time ?? "",
      reactionsCount: p.reactions?.summary?.total_count ?? 0,
      commentsCount: p.comments?.summary?.total_count ?? 0,
    }))
    const nextCursor = data.paging?.next ? data.paging.cursors?.after : undefined
    return { posts, nextCursor, mock: false }
  } catch {
    return { posts: FB_PAGE_POSTS_MOCK, mock: true }
  }
}

type RawComment = {
  id: string
  from?: { name?: string; picture?: { data?: { url?: string } } }
  message?: string
  created_time?: string
  like_count?: number
}

export async function listPostComments(
  postId: string,
  pageId: string | undefined,
  userToken: string | undefined,
): Promise<FbPostCommentsResult> {
  if (!pageId || !userToken) return { comments: FB_COMMENTS_MOCK, mock: true }
  try {
    const pageToken = await getPageToken(pageId, userToken)
    if (!pageToken) return { comments: FB_COMMENTS_MOCK, mock: true }
    const fields = "id,from{name,picture{url}},message,created_time,like_count"
    const res = await fetch(`${GRAPH}/${postId}/comments?fields=${fields}&limit=25&access_token=${pageToken}`)
    if (!res.ok) return { comments: FB_COMMENTS_MOCK, mock: true }
    const data = (await res.json()) as { data?: RawComment[] }
    const raw = data.data ?? []
    const comments: FbComment[] = raw.map((c) => ({
      id: c.id,
      fromName: c.from?.name,
      fromPictureUrl: c.from?.picture?.data?.url,
      message: c.message ?? "",
      createdTime: c.created_time ?? "",
      likeCount: c.like_count ?? 0,
    }))
    return { comments, mock: false }
  } catch {
    return { comments: FB_COMMENTS_MOCK, mock: true }
  }
}
