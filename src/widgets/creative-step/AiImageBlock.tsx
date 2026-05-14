"use client";

// AI 이미지 생성 블록 — "자유 프롬프트" vs "디자이너 외주 스타일 기획안" 두 모드.
// useCreativeDraft 로 소재 상태 직접 구독(legacy useCreative shim 대신).

import { useEffect, useState } from "react";
import Icon from "@shared/ui/Icon";
import { Badge } from "@shared/ui/primitives";
import { useApiMutation } from "@shared/lib/api/useApiMutation";
import type { GenerateImageParams, GenerateImageResult, ReferenceImage } from "@/lib/gemini-image";
import type { SuggestImagePromptParams, SuggestImagePromptResult } from "@/lib/gemini-creative";
import { useCreativeDraft } from "@entities/creative/model";
import { useToast } from "@shared/ui/Toast";
import { buildBriefPrompt } from "@features/generate-image/brief-prompt";
import BriefForm, { type AspectId } from "./BriefForm";

const MAX_REF_MB = 3;

type AiImageMode = "free" | "brief";

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("파일을 읽지 못했어요."));
    r.readAsDataURL(file);
  });
}

function splitDataUrl(dataUrl: string): ReferenceImage | null {
  const m = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  return m ? { mimeType: m[1], dataBase64: m[2] } : null;
}

export default function AiImageBlock({
  imageDataUrl,
  setImageDataUrl,
}: {
  imageDataUrl: string | null;
  setImageDataUrl: (v: string | null) => void;
}) {
  const { state, dispatch } = useCreativeDraft();
  const showToast = useToast();
  const [mode, setMode] = useState<AiImageMode>("free");
  const [zoomedSrc, setZoomedSrc] = useState<string | null>(null);
  const gen = useApiMutation<GenerateImageParams, GenerateImageResult>('/api/generate-image');
  const suggest = useApiMutation<SuggestImagePromptParams, SuggestImagePromptResult>('/api/suggest-image-prompt');
  // free 모드
  const [prompt, setPrompt] = useState("");
  const [refs, setRefs] = useState<string[]>([]);
  // brief 모드
  const [scenes, setScenes] = useState<string[]>([]);
  const [logo, setLogo] = useState<string | null>(null);
  const [aspect, setAspect] = useState<AspectId>("1:1");
  const [briefNotes, setBriefNotes] = useState("");

  useEffect(() => {
    if (!zoomedSrc) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setZoomedSrc(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomedSrc]);

  const generated = (state.generatedImages ?? []).filter(Boolean);
  const selectedIdx = imageDataUrl ? generated.indexOf(imageDataUrl) : -1;

  const handleSuggest = () => {
    suggest.mutate(
      { headline: state.headline, primaryText: state.primaryText, tone: state.tone },
      {
        onSuccess: (data) => setPrompt(data.prompt),
        onError: () => showToast("프롬프트 제안에 실패했어요, 다시 시도해주세요"),
      },
    );
  };

  const handleAddRefs = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) { showToast("이미지 파일만 첨부할 수 있어요"); continue; }
      if (file.size > MAX_REF_MB * 1024 * 1024) { showToast(`레퍼런스 이미지는 장당 ${MAX_REF_MB}MB 이하예요`); continue; }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        setRefs((prev) => [...prev, dataUrl]);
      } catch { showToast("이미지를 읽지 못했어요"); }
    }
  };

  const handleGenerate = () => {
    const p = prompt.trim();
    if (!p) { showToast("이미지 프롬프트를 입력해주세요"); return; }
    const referenceImages = refs.map(splitDataUrl).filter((r): r is ReferenceImage => !!r);
    setImageDataUrl(null);
    gen.mutate(
      { prompt: p, referenceImages: referenceImages.length ? referenceImages : undefined, count: 3 },
      {
        onSuccess: (data) => {
          const [a, b, c] = data.images;
          dispatch({ type: "SET_GENERATED_IMAGES", images: [a ?? "", b ?? "", c ?? ""] });
          if (data.images.length < 3) showToast(`이미지 ${data.images.length}장만 생성됐어요`);
        },
        onError: (err) => {
          console.error("[generate-image]", err);
          showToast("이미지 생성에 실패했어요, 다시 시도해주세요");
        },
      },
    );
  };

  const handleAddScenes = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) { showToast("이미지 파일만 첨부할 수 있어요"); continue; }
      if (file.size > MAX_REF_MB * 1024 * 1024) { showToast(`연출컷은 장당 ${MAX_REF_MB}MB 이하예요`); continue; }
      try {
        const dataUrl = await readFileAsDataUrl(file);
        setScenes((prev) => [...prev, dataUrl]);
      } catch { showToast("이미지를 읽지 못했어요"); }
    }
  };

  const handleSetLogo = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showToast("이미지 파일만 첨부할 수 있어요"); return; }
    if (file.size > MAX_REF_MB * 1024 * 1024) { showToast(`로고는 ${MAX_REF_MB}MB 이하예요`); return; }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setLogo(dataUrl);
    } catch { showToast("이미지를 읽지 못했어요"); }
  };

  const handleGenerateFromBrief = () => {
    if (!state.headline?.trim()) { showToast("STEP 01에서 헤드라인을 먼저 만들어 주세요"); return; }
    if (scenes.length === 0 && !logo) { showToast("연출컷이나 로고를 최소 1장 올려주세요"); return; }
    const combined = [...scenes, ...(logo ? [logo] : [])];
    const referenceImages = combined.map(splitDataUrl).filter((r): r is ReferenceImage => !!r);
    const p = buildBriefPrompt({
      headline: state.headline,
      primaryText: state.primaryText,
      tone: state.tone,
      outcomeChip: state.outcomeChip,
      scenesCount: scenes.length,
      hasLogo: !!logo,
      aspect,
      notes: briefNotes,
    });
    setImageDataUrl(null);
    gen.mutate(
      { prompt: p, referenceImages: referenceImages.length ? referenceImages : undefined, count: 3 },
      {
        onSuccess: (data) => {
          const [a, b, c] = data.images;
          dispatch({ type: "SET_GENERATED_IMAGES", images: [a ?? "", b ?? "", c ?? ""] });
          if (data.images.length < 3) showToast(`이미지 ${data.images.length}장만 생성됐어요`);
        },
        onError: (err) => {
          console.error("[generate-image-brief]", err);
          showToast("이미지 생성에 실패했어요, 다시 시도해주세요");
        },
      },
    );
  };

  return (
    <div className="field" style={{ marginBottom: 18, paddingTop: 4 }}>
      <label className="field__label" style={{ alignItems: "center" }}>
        AI 이미지 생성 <Badge kind="neutral">실험</Badge>
      </label>

      <div className="seg" role="tablist" aria-label="AI 이미지 생성 방식" style={{ marginBottom: 10 }}>
        <button type="button" className={mode === "free" ? "on" : ""} onClick={() => setMode("free")} role="tab" aria-selected={mode === "free"}>
          <Icon name="sparkles" size={13} /> AI 프롬프트 제안받기
        </button>
        <button type="button" className={mode === "brief" ? "on" : ""} onClick={() => setMode("brief")} role="tab" aria-selected={mode === "brief"}>
          <Icon name="doc" size={13} /> 기획안·자료로 생성하기
        </button>
      </div>

      {mode === "free" ? (
        <>
          <textarea
            className="textarea"
            aria-label="이미지 프롬프트"
            placeholder="예) 미니멀한 욕실 선반에 놓인 비건 수분크림, 아침 햇살, 파스텔 톤"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
            <button type="button" className="btn btn--ghost btn--sm" disabled={suggest.isPending || !state.primaryText} onClick={handleSuggest}>
              {suggest.isPending ? "제안 중…" : <><Icon name="sparkles" size={13} /> 카피로 프롬프트 제안받기</>}
            </button>
            <label className="btn btn--ghost btn--sm" style={{ cursor: "pointer" }}>
              <Icon name="upload" size={13} /> 레퍼런스 첨부{refs.length > 0 ? ` (${refs.length})` : ""}
              <input type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => handleAddRefs(e.target.files)} />
            </label>
            {refs.length > 0 && (
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => setRefs([])}>비우기</button>
            )}
            <button type="button" className="btn btn--secondary btn--sm" disabled={gen.isPending} onClick={handleGenerate} style={{ marginLeft: "auto" }}>
              {gen.isPending ? "생성 중…" : "이미지 3장 생성"}
            </button>
          </div>
          {refs.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
              {refs.map((src, i) => (
                <div key={i} style={{ position: "relative", width: 48, height: 48 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`레퍼런스 ${i + 1}`} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6, border: "1px solid var(--w-line-normal)", display: "block" }} />
                  <button
                    type="button"
                    aria-label={`레퍼런스 ${i + 1} 삭제`}
                    title="삭제"
                    onClick={() => setRefs((prev) => prev.filter((_, idx) => idx !== i))}
                    style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", border: "1px solid var(--w-line-normal)", background: "var(--w-bg-normal)", color: "var(--w-fg-neutral)", display: "grid", placeItems: "center", cursor: "pointer", padding: 0, boxShadow: "0 1px 2px rgba(0,0,0,0.08)" }}
                  >
                    <Icon name="x" size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <BriefForm
          state={state}
          scenes={scenes}
          logo={logo}
          aspect={aspect}
          briefNotes={briefNotes}
          generating={gen.isPending}
          onAddScenes={handleAddScenes}
          onRemoveScene={(i) => setScenes((prev) => prev.filter((_, idx) => idx !== i))}
          onClearScenes={() => setScenes([])}
          onSetLogo={handleSetLogo}
          onRemoveLogo={() => setLogo(null)}
          onAspectChange={setAspect}
          onNotesChange={setBriefNotes}
          onGenerate={handleGenerateFromBrief}
        />
      )}

      {gen.isPending ? (
        <p style={{ font: "500 12px/1.5 var(--w-font-sans)", color: "var(--w-fg-neutral)", marginTop: 10 }}>
          AI가 이미지를 만들고 있어요… (10~30초 정도 걸려요)
        </p>
      ) : generated.length > 0 ? (
        <>
          <p style={{ font: "500 12px/1.5 var(--w-font-sans)", color: "var(--w-fg-neutral)", margin: "10px 0 8px" }}>
            마음에 드는 1장을 골라주세요 (최종 광고 이미지)
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
            {generated.map((src, i) => (
              <div key={i} style={{ position: "relative" }}>
                <button
                  type="button"
                  aria-pressed={selectedIdx === i}
                  onClick={() => setImageDataUrl(src)}
                  style={{ padding: 0, border: selectedIdx === i ? "2px solid var(--w-primary-normal)" : "1px solid var(--w-line-normal)", borderRadius: 8, overflow: "hidden", cursor: "pointer", background: "none", lineHeight: 0, width: "100%", display: "block" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={src} alt={`생성 이미지 ${i + 1}`} style={{ width: "100%", display: "block", aspectRatio: "1 / 1", objectFit: "cover" }} />
                </button>
                <button
                  type="button"
                  aria-label={`생성 이미지 ${i + 1} 크게 보기`}
                  title="크게 보기"
                  onClick={() => setZoomedSrc(src)}
                  style={{ position: "absolute", top: 6, right: 6, width: 28, height: 28, borderRadius: 6, border: "1px solid var(--w-line-normal)", background: "rgba(255,255,255,0.94)", color: "var(--w-fg-normal)", display: "grid", placeItems: "center", cursor: "zoom-in", padding: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.18)" }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m21 21-4.3-4.3" />
                    <path d="M11 8v6M8 11h6" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
          <p style={{ font: "500 11px/1.5 var(--w-font-sans)", color: "var(--w-fg-alternative)", marginTop: 8 }}>
            AI가 만든 이미지예요. 광고 정책·저작권·초상권은 직접 확인해주세요.
          </p>
        </>
      ) : (
        <p style={{ font: "500 11.5px/1.5 var(--w-font-sans)", color: "var(--w-fg-alternative)", marginTop: 8 }}>
          카피를 만들면 AI가 이미지 프롬프트를 자동으로 제안해 드려요 (선택사항).
        </p>
      )}

      {zoomedSrc && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="이미지 크게 보기"
          onClick={() => setZoomedSrc(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)", display: "grid", placeItems: "center", zIndex: 1000, padding: 24, cursor: "zoom-out" }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomedSrc}
            alt="확대 이미지"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "min(92vw, 1200px)", maxHeight: "92vh", objectFit: "contain", borderRadius: 8, cursor: "default", boxShadow: "0 8px 32px rgba(0,0,0,0.4)", display: "block" }}
          />
          <button
            type="button"
            aria-label="닫기"
            onClick={() => setZoomedSrc(null)}
            style={{ position: "fixed", top: 16, right: 16, width: 36, height: 36, borderRadius: 999, border: "none", background: "rgba(255,255,255,0.94)", color: "#111", display: "grid", placeItems: "center", cursor: "pointer", padding: 0, boxShadow: "0 2px 8px rgba(0,0,0,0.25)" }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
