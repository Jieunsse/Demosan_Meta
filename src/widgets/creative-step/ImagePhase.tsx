"use client";

// ADR-040 — 소재 만들기 phase 2(이미지). 선택된 카피를 상단 요약(읽기전용)으로 접고,
// 이미지 컨셉·생성에 집중. "← 카피 수정"으로 phase 1 복귀. 최상위 Stepper(STEP 02=집행) 불변.

import Icon from "@shared/ui/Icon";
import { Badge } from "@shared/ui/primitives";
import { Button } from "@shared/ui/Button";
import { Card } from "@shared/ui/Card";
import { useCreativeDraft } from "@entities/creative/model";
import AiImageBlock from "./AiImageBlock";

export default function ImagePhase({
  productId,
  imageDataUrl,
  setImageDataUrl,
  onBackToCopy,
  onNext,
}: {
  productId: string | null;
  imageDataUrl: string | null;
  setImageDataUrl: (v: string | null) => void;
  onBackToCopy: () => void;
  onNext: () => void;
}) {
  const { state } = useCreativeDraft();

  return (
    <Card variant="lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="m-0 font-bold text-[17px] leading-[1.3] tracking-[-0.012em] text-[var(--w-fg-strong)]">이미지 만들기</h2>
          <p className="font-medium text-[13px] leading-[1.5] text-[var(--w-fg-neutral)] mt-1 mb-0">선택한 카피에 어울리는 이미지를 빚어 보세요.</p>
        </div>
        <Button variant="ghost" size="sm" type="button" onClick={onBackToCopy} className="border border-[var(--w-line-normal)]">
          <Icon name="arrow-left" size={14} /> 카피 수정
        </Button>
      </div>

      <div
        className="flex flex-col gap-2 px-4 py-[14px] rounded-xl bg-[var(--w-bg-alternative)]"
        style={{ margin: "16px 0 18px" }}
      >
        <div className="flex items-center gap-2">
          <Badge kind="neutral">선택한 카피</Badge>
        </div>
        <div className="font-[600] text-[14.5px] leading-[1.4] text-[var(--w-fg-strong)]">{state.headline}</div>
        {state.primaryText && (
          <div className="font-medium text-[13px] leading-[1.55] text-[var(--w-fg-normal)] whitespace-pre-wrap">{state.primaryText}</div>
        )}
      </div>

      <AiImageBlock productId={productId} imageDataUrl={imageDataUrl} setImageDataUrl={setImageDataUrl} />

      <div className="flex items-center justify-end gap-3" style={{ paddingTop: 16, borderTop: "1px solid var(--w-line-alternative)" }}>
        <Button variant="primary" type="button" onClick={onNext}>다음: 광고 집행 <Icon name="arrow-right" size={14} /></Button>
      </div>
    </Card>
  );
}
