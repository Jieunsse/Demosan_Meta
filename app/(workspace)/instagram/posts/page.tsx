"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Image from "next/image";
import Icon from "@shared/ui/Icon";

import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { useToast } from "@shared/ui/Toast";
import ConfirmModal from "@shared/ui/ConfirmModal";
import { IgPostPreview } from "@shared/ui/IgPostPreview";
import type { IgComment } from "@/lib/instagram-comments";

type RecentItem = {
  id: string;
  mediaUrl: string;
  caption: string;
  permalink?: string;
  timestamp: string;
  likeCount?: number;
};

type PublishOk = { ok: true; postId: string; permalink?: string };
type PublishFail = { ok: false; error: string; status?: number };
type PublishResp = PublishOk | PublishFail;

type RecentResp =
  | { ok: true; items: RecentItem[] }
  | { ok: false; error: string };

type CommentsResp =
  | { ok: true; items: IgComment[]; mock?: boolean }
  | { ok: false; error: string };

type DeleteCommentResp = { ok: true; mock?: boolean } | { ok: false; error: string };

type UploadResp = { ok: true; url: string } | { ok: false; error: string };

function isHttpUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s.trim());
}


export default function PostsPage() {
  const router = useRouter();
  const showToast = useToast();
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const captionPrefill = searchParams.get("caption") ?? "";
  const handle = session?.igUsername ?? "instagram";
  const [igPicture, setIgPicture] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [caption, setCaption] = useState(captionPrefill);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<PublishResp | null>(null);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [recentErr, setRecentErr] = useState<string | null>(null);
  const [recentLoading, setRecentLoading] = useState(true);
  const [openMediaId, setOpenMediaId] = useState<string | null>(null);
  const [commentsByMedia, setCommentsByMedia] = useState<Record<string, IgComment[]>>({});
  const [commentsLoading, setCommentsLoading] = useState<Record<string, boolean>>({});
  const [commentsErr, setCommentsErr] = useState<Record<string, string | null>>({});
  const [commentsMock, setCommentsMock] = useState<Record<string, boolean>>({});
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ mediaId: string; comment: IgComment } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewBroken, setPreviewBroken] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiImages, setAiImages] = useState<string[]>([]);
  const [aiPicking, setAiPicking] = useState<string | null>(null);
  const [captionSuggesting, setCaptionSuggesting] = useState(false);
  const [promptSuggesting, setPromptSuggesting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadRecent = useCallback(async () => {
    setRecentLoading(true);
    try {
      const res = await fetch("/api/instagram/recent-media", { cache: "no-store" });
      const data = (await res.json()) as RecentResp;
      if (data.ok) {
        setRecent(data.items);
        setRecentErr(null);
      } else {
        setRecent([]);
        setRecentErr(data.error);
      }
    } catch (e) {
      setRecentErr(e instanceof Error ? e.message : "최근 게시 조회 실패");
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecent();
  }, [loadRecent]);

  useEffect(() => {
    fetch("/api/connect/profile-pictures")
      .then(r => r.ok ? r.json() : null)
      .then((data: { igPicture?: string | null } | null) => { if (data?.igPicture) setIgPicture(data.igPicture); })
      .catch(() => null);
  }, []);

  useEffect(() => {
    setPreviewBroken(false);
  }, [imageUrl]);

  const loadComments = useCallback(async (mediaId: string) => {
    setCommentsLoading((s) => ({ ...s, [mediaId]: true }));
    setCommentsErr((s) => ({ ...s, [mediaId]: null }));
    try {
      const res = await fetch(`/api/instagram/comments?mediaId=${encodeURIComponent(mediaId)}`, { cache: "no-store" });
      const data = (await res.json()) as CommentsResp;
      if (data.ok) {
        setCommentsByMedia((s) => ({ ...s, [mediaId]: data.items }));
        setCommentsMock((s) => ({ ...s, [mediaId]: !!data.mock }));
      } else {
        setCommentsErr((s) => ({ ...s, [mediaId]: data.error }));
      }
    } catch (e) {
      setCommentsErr((s) => ({ ...s, [mediaId]: e instanceof Error ? e.message : "댓글 조회 실패" }));
    } finally {
      setCommentsLoading((s) => ({ ...s, [mediaId]: false }));
    }
  }, []);

  const togglePanel = useCallback((mediaId: string) => {
    setOpenMediaId((prev) => {
      const next = prev === mediaId ? null : mediaId;
      if (next && !commentsByMedia[next]) loadComments(next);
      return next;
    });
  }, [commentsByMedia, loadComments]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    const { mediaId, comment } = pendingDelete;
    try {
      const res = await fetch(`/api/instagram/comments/${encodeURIComponent(comment.id)}`, { method: "DELETE" });
      const data = (await res.json()) as DeleteCommentResp;
      if (data.ok) {
        setCommentsByMedia((s) => ({
          ...s,
          [mediaId]: (s[mediaId] ?? []).filter((c) => c.id !== comment.id),
        }));
        showToast(data.mock ? "댓글 삭제 (mock)" : "댓글이 삭제됐어요");
      } else {
        showToast(`삭제 실패 — ${data.error}`);
      }
    } catch (e) {
      showToast(`삭제 실패 — ${e instanceof Error ? e.message : "요청 실패"}`);
    } finally {
      setDeleting(false);
      setPendingDelete(null);
    }
  }, [pendingDelete, showToast]);

  const canSubmit = imageUrl.trim().length > 0 && !submitting && !uploading;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setLastResult(null);
    try {
      const res = await fetch("/api/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: imageUrl.trim(), caption: caption.trim() }),
      });
      const data = (await res.json()) as PublishResp;
      setLastResult(data);
      if (data.ok) {
        showToast("Instagram 게시 완료");
        setImageUrl("");
        setCaption("");
        loadRecent();
      } else {
        showToast(`게시 실패 — ${data.error}`);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "요청 실패";
      setLastResult({ ok: false, error: msg });
      showToast(`게시 실패 — ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const uploadFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      showToast("이미지 파일만 선택할 수 있어요");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/instagram/upload", { method: "POST", body: fd });
      const data = (await res.json()) as UploadResp;
      if (data.ok) {
        setImageUrl(data.url);
      } else {
        showToast(`업로드 실패 — ${data.error}`);
      }
    } catch (e) {
      showToast(`업로드 실패 — ${e instanceof Error ? e.message : "요청 실패"}`);
    } finally {
      setUploading(false);
    }
  }, [showToast]);

  const openFilePicker = () => {
    if (submitting || uploading) return;
    fileInputRef.current?.click();
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.target.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      uploadFile(file);
      return;
    }
    const raw = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    const candidate = raw.split("\n").map((l) => l.trim()).find((l) => l && !l.startsWith("#")) ?? "";
    if (isHttpUrl(candidate)) {
      setImageUrl(candidate);
    } else {
      showToast("이미지 URL 을 인식하지 못했어요");
    }
  };

  const generateAi = useCallback(async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || aiGenerating) return;
    setAiGenerating(true);
    setAiImages([]);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, count: 4 }),
      });
      const data = (await res.json()) as { images?: string[]; error?: string };
      if (Array.isArray(data.images) && data.images.length > 0) {
        setAiImages(data.images);
      } else {
        showToast(`이미지 생성 실패 — ${data.error ?? "결과 없음"}`);
      }
    } catch (e) {
      showToast(`이미지 생성 실패 — ${e instanceof Error ? e.message : "요청 실패"}`);
    } finally {
      setAiGenerating(false);
    }
  }, [aiPrompt, aiGenerating, showToast]);

  const pickAiImage = useCallback(async (dataUrl: string) => {
    if (aiPicking) return;
    setAiPicking(dataUrl);
    setUploading(true);
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const mime = blob.type || "image/png";
      const ext = mime.split("/")[1] ?? "png";
      const file = new File([blob], `ai-${Date.now()}.${ext}`, { type: mime });
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/instagram/upload", { method: "POST", body: fd });
      const data = (await res.json()) as UploadResp;
      if (data.ok) setImageUrl(data.url);
      else showToast(`업로드 실패 — ${data.error}`);
    } catch (e) {
      showToast(`업로드 실패 — ${e instanceof Error ? e.message : "요청 실패"}`);
    } finally {
      setUploading(false);
      setAiPicking(null);
    }
  }, [aiPicking, showToast]);

  const suggestText = useCallback(async (kind: "caption" | "image-prompt") => {
    const setBusy = kind === "caption" ? setCaptionSuggesting : setPromptSuggesting;
    setBusy(true);
    try {
      const res = await fetch("/api/instagram/posts/suggest-text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          hint: kind === "caption" ? caption.trim() : aiPrompt.trim(),
          caption: kind === "image-prompt" ? caption.trim() : undefined,
        }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (data.text) {
        if (kind === "caption") setCaption(data.text);
        else setAiPrompt(data.text);
      } else {
        showToast(`AI 생성 실패 — ${data.error ?? "결과 없음"}`);
      }
    } catch (e) {
      showToast(`AI 생성 실패 — ${e instanceof Error ? e.message : "요청 실패"}`);
    } finally {
      setBusy(false);
    }
  }, [aiPrompt, caption, showToast]);

  const onPasteZone = (e: React.ClipboardEvent) => {
    const text = e.clipboardData.getData("text").trim();
    if (isHttpUrl(text)) {
      e.preventDefault();
      setImageUrl(text);
    }
  };

  return (
    <div className="px-10 py-9 max-w-[1180px] mx-auto">
      <header className="mb-6 flex items-start justify-between gap-6">
        <div>
          <h1 className="font-bold text-[24px] leading-tight tracking-[-0.02em] text-[var(--w-fg-strong)]">
            새 게시물
          </h1>
          <p className="text-[13.5px] leading-[1.55] text-[var(--w-fg-neutral)] mt-1.5">
            Instagram 비즈니스 계정에 사진과 캡션을 게시해요. 오른쪽 미리보기는 실제 피드와 같은 모양으로 보여줍니다.
          </p>
        </div>
      </header>

      <Card variant="lg">
        <form id="ig-publish" onSubmit={onSubmit} className="grid grid-cols-[1fr_360px] gap-8 items-start">
          <div className="flex flex-col gap-5 min-w-0">
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              onPaste={onPasteZone}
              onClick={openFilePicker}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openFilePicker(); } }}
              role="button"
              aria-label="이미지 파일 선택"
              tabIndex={0}
              className={`relative rounded-[14px] border-2 border-dashed outline-none transition-colors cursor-pointer ${
                dragOver
                  ? "border-[var(--w-primary-normal)] bg-[var(--w-primary-pale,rgba(99,93,255,0.06))]"
                  : "border-[var(--w-line-normal)] bg-[var(--w-bg-base)] hover:border-[var(--w-line-strong)] focus:border-[var(--w-primary-normal)]"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={onFileInputChange}
                className="hidden"
              />
              {imageUrl ? (
                <div className="flex items-start gap-4 p-4">
                  <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-[var(--w-bg-neutral)] shrink-0">
                    {!previewBroken ? (
                      <Image
                        src={imageUrl}
                        alt=""
                        fill
                        className="object-cover"
                        unoptimized
                        onError={() => setPreviewBroken(true)}
                      />
                    ) : (
                      <div className="absolute inset-0 grid place-items-center text-[var(--w-fg-alternative)]">
                        <Icon name="warn" size={20} />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[12.5px] font-semibold text-[var(--w-fg-strong)] mb-1">
                      이미지 선택됨
                      {previewBroken && (
                        <span className="ml-2 text-[11px] font-normal text-[var(--w-status-negative)]">미리보기 로드 실패 — URL 을 확인해 주세요</span>
                      )}
                    </div>
                    <div className="text-[11.5px] text-[var(--w-fg-alternative)] break-all line-clamp-2">{imageUrl}</div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setImageUrl(""); }}
                      className="mt-2 text-[11.5px] font-semibold text-[var(--w-fg-neutral)] hover:text-[var(--w-status-negative)]"
                      disabled={submitting}
                    >
                      제거
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid place-items-center text-center py-10 px-4">
                  <Icon name="image" size={28} />
                  <div className="text-[13.5px] font-semibold text-[var(--w-fg-strong)] mt-2">
                    {uploading ? "업로드 중..." : "클릭해서 파일을 고르거나 이미지 URL 을 드래그/붙여넣기"}
                  </div>
                  <div className="text-[11.5px] text-[var(--w-fg-alternative)] mt-1 leading-[1.5] max-w-[360px]">
                    JPG · PNG · WebP, 최대 8MB. 업로드한 파일은 공개 URL 로 호스팅돼 Instagram 이 가져갑니다.
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <label htmlFor="aiPrompt" className="text-[11.5px] font-semibold text-[var(--w-fg-neutral)] inline-flex items-center gap-1.5">
                <Icon name="sparkles" size={12} />
                AI 로 이미지 생성
              </label>
              <div className="flex gap-2 items-stretch">
                <textarea
                  id="aiPrompt"
                  placeholder="예: 따뜻한 햇살이 비치는 베이커리 진열대 위의 크루아상, 자연광, 따뜻한 톤"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  rows={2}
                  maxLength={500}
                  className="flex-1 px-3.5 py-2.5 rounded-[10px] border border-[var(--w-line-normal)] bg-[var(--w-bg-elevated)] text-[13px] text-[var(--w-fg-strong)] outline-none focus:border-[var(--w-primary-normal)] focus-visible:outline-none resize-none leading-[1.5]"
                  disabled={aiGenerating || submitting || promptSuggesting}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); generateAi(); }
                  }}
                />
                <div className="flex flex-col gap-1.5 self-stretch">
                  <button
                    type="button"
                    onClick={() => suggestText("image-prompt")}
                    disabled={promptSuggesting || aiGenerating || submitting}
                    className="flex-1 px-3 rounded-[10px] text-[11px] font-semibold bg-[var(--w-bg-neutral)] text-[var(--w-fg-neutral)] hover:bg-[var(--w-bg-elevated)] disabled:opacity-40 transition-colors whitespace-nowrap"
                  >
                    {promptSuggesting ? "생성 중..." : "AI가 프롬프트 작성"}
                  </button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={generateAi}
                    disabled={!aiPrompt.trim() || aiGenerating || submitting}
                    className="flex-1 h-auto"
                  >
                    {aiGenerating ? "생성 중..." : "생성"}
                  </Button>
                </div>
              </div>
              {(aiGenerating || aiImages.length > 0) && (
                <div className="grid grid-cols-4 gap-2 mt-1">
                  {(aiGenerating ? Array.from({ length: 4 }) : aiImages).map((url, i) => {
                    const dataUrl = typeof url === "string" ? url : null;
                    const selected = !!dataUrl && imageUrl === dataUrl;
                    const picking = !!dataUrl && aiPicking === dataUrl;
                    return (
                      <button
                        type="button"
                        key={dataUrl ?? `skeleton-${i}`}
                        onClick={() => dataUrl && pickAiImage(dataUrl)}
                        disabled={!dataUrl || !!aiPicking}
                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition ${
                          selected
                            ? "border-[var(--w-primary-normal)]"
                            : "border-transparent hover:border-[var(--w-line-normal)]"
                        } ${!dataUrl ? "bg-[var(--w-bg-neutral)] animate-pulse cursor-default" : ""}`}
                        aria-pressed={selected}
                        aria-label="생성된 이미지 선택"
                      >
                        {dataUrl && (
                          <Image src={dataUrl} alt="" fill className="object-cover" unoptimized sizes="80px" />
                        )}
                        {picking && (
                          <div className="absolute inset-0 grid place-items-center bg-black/40 text-white">
                            <Icon name="clock" size={14} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="caption" className="text-[11.5px] font-semibold text-[var(--w-fg-neutral)]">
                캡션
              </label>
              <div className="flex gap-2 items-start">
                <textarea
                  id="caption"
                  placeholder="게시글 본문, 해시태그(#), @멘션을 자유롭게 적어 주세요"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={6}
                  maxLength={2200}
                  className="flex-1 px-3.5 py-3 rounded-[10px] border border-[var(--w-line-normal)] bg-[var(--w-bg-elevated)] text-[13.5px] text-[var(--w-fg-strong)] outline-none focus:border-[var(--w-primary-normal)] focus-visible:outline-none resize-y leading-[1.55]"
                  disabled={submitting || captionSuggesting}
                />
                <button
                  type="button"
                  onClick={() => suggestText("caption")}
                  disabled={captionSuggesting || submitting}
                  className="px-3 py-2 rounded-[10px] text-[11px] font-semibold bg-[var(--w-bg-neutral)] text-[var(--w-fg-neutral)] hover:bg-[var(--w-bg-elevated)] disabled:opacity-40 transition-colors whitespace-nowrap"
                >
                  {captionSuggesting ? "생성 중..." : "AI가 캡션 작성"}
                </button>
              </div>
              <div className="text-[11.5px] text-[var(--w-fg-alternative)] self-end">{caption.length} / 2200</div>
              <Button form="ig-publish" type="submit" variant="primary" size="md" disabled={!canSubmit} className="w-48 self-center mt-1">
                {submitting ? "게시 중..." : "게시하기"}
              </Button>
            </div>

            {lastResult?.ok && lastResult.permalink && (
              <a
                href={lastResult.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12.5px] font-semibold text-[var(--w-primary-normal)] hover:underline"
              >
                방금 게시한 글 보기 →
              </a>
            )}
            {lastResult && !lastResult.ok && (
              <div className="rounded-lg border border-[var(--w-status-negative)] bg-[rgba(232,72,72,0.06)] px-3.5 py-3 text-[12.5px] text-[var(--w-status-negative)] leading-[1.5]">
                <span className="font-semibold">게시 실패 — </span>
                {lastResult.error}
              </div>
            )}
          </div>

          <div className="sticky top-6">
            <div className="text-[10.5px] font-semibold tracking-wide uppercase text-[var(--w-fg-alternative)] mb-2">
              미리보기
            </div>
            <IgPostPreview
              imageUrl={imageUrl}
              caption={caption}
              handle={handle}
              profilePicture={igPicture}
              broken={previewBroken}
              className="w-full"
            />
          </div>
        </form>
      </Card>

      <Card variant="default" className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-[14px] text-[var(--w-fg-strong)]">최근 게시</h2>
          <button
            type="button"
            onClick={loadRecent}
            className="text-[11.5px] font-semibold text-[var(--w-fg-neutral)] hover:text-[var(--w-fg-strong)] inline-flex items-center gap-1"
            disabled={recentLoading}
          >
            <Icon name="refresh" size={11} />
            새로고침
          </button>
        </div>
        {recentLoading ? (
          <div className="text-[12.5px] text-[var(--w-fg-alternative)] py-8 text-center">불러오는 중…</div>
        ) : recentErr ? (
          <div className="text-[12.5px] text-[var(--w-fg-alternative)] py-8 text-center leading-[1.55]">{recentErr}</div>
        ) : recent.length === 0 ? (
          <div className="text-[12.5px] text-[var(--w-fg-alternative)] py-8 text-center">아직 게시물이 없어요.</div>
        ) : (
          <div className="flex gap-6 items-start">
            <ul className="flex-1 min-w-0 flex flex-col gap-y-1">
              {recent.map((item) => {
                const isOpen = openMediaId === item.id;
                const isSelected = selectedPostId === item.id;
                const comments = commentsByMedia[item.id] ?? [];
                const loading = commentsLoading[item.id] ?? false;
                const err = commentsErr[item.id] ?? null;
                const mock = commentsMock[item.id] ?? false;
                return (
                  <li
                    key={item.id}
                    className={`flex flex-col rounded-lg px-2 py-2 cursor-pointer transition-colors ${isSelected ? "bg-[var(--w-bg-neutral)]" : "hover:bg-[var(--w-bg-base)]"}`}
                    onClick={() => setSelectedPostId((prev) => prev === item.id ? null : item.id)}
                  >
                    <div className="flex gap-3 items-start">
                      {item.mediaUrl ? (
                        <Image
                          src={item.mediaUrl}
                          alt=""
                          width={56}
                          height={56}
                          className="w-14 h-14 rounded-lg object-cover bg-[var(--w-bg-neutral)] shrink-0"
                          unoptimized
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-[var(--w-bg-neutral)] shrink-0 grid place-items-center">
                          <Icon name="image" size={18} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-[12.5px] text-[var(--w-fg-strong)] leading-[1.4] line-clamp-2">
                          {item.caption || <span className="text-[var(--w-fg-alternative)]">(캡션 없음)</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[11px] text-[var(--w-fg-alternative)]">
                          <span>{formatDate(item.timestamp)}</span>
                          {item.permalink && (
                            <a
                              href={item.permalink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-semibold text-[var(--w-primary-normal)] hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              열기
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); togglePanel(item.id); }}
                            className="font-semibold text-[var(--w-primary-normal)] hover:underline inline-flex items-center gap-1"
                          >
                            <Icon name="message" size={11} />
                            {isOpen ? "댓글 접기" : "댓글 관리"}
                          </button>
                        </div>
                        <div className="mt-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const hint = item.caption?.slice(0, 60).trim() ?? "";
                              const params = new URLSearchParams({ from: "channel-insights", outcome: "boost_post" });
                              if (hint) params.set("outcomeHint", hint);
                              router.push(`/create?${params.toString()}`);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--w-primary-soft)] text-[var(--w-primary-normal)] font-semibold text-[11px] leading-none hover:bg-[rgba(0,102,255,0.15)] transition-colors duration-[120ms]"
                          >
                            <Icon name="sparkles" size={11} /> 광고 만들기
                          </button>
                        </div>
                      </div>
                    </div>
                    {isOpen && (
                      <div className="mt-2.5 ml-[68px] rounded-lg border border-[var(--w-line-alternative)] bg-[var(--w-bg-base)] p-3">
                        {loading ? (
                          <div className="text-[11.5px] text-[var(--w-fg-alternative)] py-3 text-center">댓글 불러오는 중…</div>
                        ) : err ? (
                          <div className="text-[11.5px] text-[var(--w-status-negative)] py-3 text-center leading-[1.55]">{err}</div>
                        ) : comments.length === 0 ? (
                          <div className="text-[11.5px] text-[var(--w-fg-alternative)] py-3 text-center">아직 댓글이 없어요.</div>
                        ) : (
                          <ul className="flex flex-col gap-2">
                            {mock && (
                              <li className="text-[10.5px] text-[var(--w-fg-alternative)] mb-1">
                                연결된 IG 계정이 없어 샘플 데이터를 보여줘요.
                              </li>
                            )}
                            {comments.map((c) => (
                              <li key={c.id} className="flex gap-2 items-start">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 text-[11.5px]">
                                    <span className="font-semibold text-[var(--w-fg-strong)]">@{c.username}</span>
                                    <span className="text-[var(--w-fg-alternative)]">{formatDate(c.timestamp)}</span>
                                    {c.likeCount > 0 && (
                                      <span className="text-[var(--w-fg-alternative)] inline-flex items-center gap-0.5">
                                        <Icon name="heart" size={10} />{c.likeCount}
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[12px] text-[var(--w-fg-strong)] leading-[1.45] mt-0.5 break-words">
                                    {c.text}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setPendingDelete({ mediaId: item.id, comment: c }); }}
                                  className="shrink-0 text-[11px] font-semibold text-[var(--w-status-negative)] hover:underline px-1.5 py-0.5"
                                  aria-label={`@${c.username} 댓글 삭제`}
                                >
                                  삭제
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            {selectedPostId && (() => {
              const post = recent.find((r) => r.id === selectedPostId);
              if (!post) return null;
              return (
                <div className="w-[300px] shrink-0 sticky top-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10.5px] font-semibold tracking-wide uppercase text-[var(--w-fg-alternative)]">미리보기</span>
                    <button
                      type="button"
                      onClick={() => setSelectedPostId(null)}
                      className="p-1 rounded hover:bg-[var(--w-bg-neutral)] text-[var(--w-fg-alternative)]"
                      aria-label="닫기"
                    >
                      <Icon name="x" size={14} />
                    </button>
                  </div>
                  <IgPostPreview
                    imageUrl={post.mediaUrl}
                    caption={post.caption}
                    handle={handle}
                    profilePicture={igPicture}
                    timestamp={formatDate(post.timestamp)}
                    likeCount={post.likeCount}
                  />
                  <div className="flex flex-col gap-2 mt-3">
                    {post.permalink && (
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--w-line-normal)] text-[12.5px] font-semibold text-[var(--w-fg-strong)] hover:bg-[var(--w-bg-neutral)] transition-colors"
                      >
                        <Icon name="link" size={13} />
                        Instagram에서 보기
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const hint = post.caption?.slice(0, 60).trim() ?? "";
                        const params = new URLSearchParams({ from: "channel-insights", outcome: "boost_post" });
                        if (hint) params.set("outcomeHint", hint);
                        router.push(`/create?${params.toString()}`);
                      }}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--w-primary-soft)] text-[var(--w-primary-normal)] text-[12.5px] font-semibold hover:bg-[rgba(0,102,255,0.15)] transition-colors"
                    >
                      <Icon name="sparkles" size={13} />
                      광고 만들기
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Card>

      {pendingDelete && (
        <ConfirmModal
          title="이 댓글을 삭제할까요?"
          desc={
            <div className="flex flex-col gap-1.5">
              <span>@{pendingDelete.comment.username} 의 댓글이 영구 삭제돼요. 되돌릴 수 없어요.</span>
              <span className="text-[12px] text-[var(--w-fg-alternative)] line-clamp-3">“{pendingDelete.comment.text}”</span>
            </div>
          }
          confirmLabel={deleting ? "삭제 중..." : "삭제"}
          tone="danger"
          onClose={() => { if (!deleting) setPendingDelete(null); }}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}


function formatDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}
