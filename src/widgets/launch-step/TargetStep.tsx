"use client";

import { useLaunchDraft } from "@entities/campaign/model";
import { useCreativeDraft } from "@entities/creative/model";
import { COUNTRIES } from "@shared/lib/geo-options";
import { type Gender } from "@shared/lib/meta/targeting";
import AgeRange from "@shared/ui/AgeRange";
import SubHead from "./SubHead";
import Icon from "@shared/ui/Icon";
import { Button } from "@shared/ui/Button";
import { cn } from "@shared/lib/cn";

const chipBase = "inline-flex items-center gap-1.5 px-[14px] py-2 rounded-full border border-[var(--w-line-normal)] bg-[var(--w-bg-elevated)] font-medium text-[13px] leading-none text-[var(--w-fg-strong)] cursor-pointer transition-[background,border-color,color] duration-[120ms]";
const chipOn = "bg-[var(--w-fg-strong)] text-[var(--w-bg-elevated)] border-[var(--w-fg-strong)]";
const chipAccent = "border-[var(--w-primary-normal)] text-[var(--w-primary-press)] bg-[var(--w-primary-soft)]";
const GENDER_OPTS: [Gender, string][] = [["all", "전체"], ["male", "남성"], ["female", "여성"]];

interface Props { onBack: () => void; onNext: () => void }

export default function TargetStep({ onBack, onNext }: Props) {
  const { state, dispatch } = useLaunchDraft();
  const creative = useCreativeDraft();
  const targeting = creative.state.targeting;

  const toggleCountry = (code: string) => {
    const next = state.countries.includes(code)
      ? state.countries.filter((c) => c !== code)
      : [...state.countries, code];
    dispatch({ type: "SET_COUNTRIES", value: next });
  };

  return (
    <>
      <SubHead
        title="타겟"
        subtitle={
          state.mode === "simple"
            ? "광고를 노출할 국가만 선택하세요. 연령·성별은 Meta 어드밴티지+가 자동으로 최적화해요."
            : "AI가 채워둔 값이에요. 그대로 두거나 조정해도 돼요."
        }
      />
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {state.mode === "simple" && (
          <div className="font-medium text-[12px] leading-[1.5] tracking-[0.008em] text-[var(--w-fg-neutral)] flex items-center gap-1.5" style={{ color: "var(--w-primary-press)" }}>
            <Icon name="sparkles" size={12} />
            어드밴티지+ 타겟 · 노출 위치 — 연령·성별·게재 위치를 Meta가 자동으로 최적화해요.
          </div>
        )}
        {state.mode === "detailed" && (
          <>
            <div>
              <label className="font-semibold text-[15px] leading-[1.3] tracking-[-0.008em] text-[var(--w-fg-strong)] flex items-center gap-1.5" style={{ marginBottom: 10 }}>연령</label>
              {targeting && (
                <div className="font-medium text-[12px] leading-[1.5] tracking-[0.008em] text-[var(--w-fg-neutral)]" style={{ color: "var(--w-primary-press)", marginBottom: 8 }}>
                  ✦ &lsquo;누구에게 보여줄 광고인가요&rsquo; 입력 내용에서 자동으로 채웠어요 · 수정 가능
                </div>
              )}
              <AgeRange
                value={[state.ageMin, state.ageMax]}
                onChange={(v) => dispatch({ type: "SET_AGE_RANGE", min: v[0], max: v[1] })}
              />
            </div>
            <div>
              <label className="font-semibold text-[15px] leading-[1.3] tracking-[-0.008em] text-[var(--w-fg-strong)] flex items-center gap-1.5" style={{ marginBottom: 8 }}>성별</label>
              <div className="flex gap-2 flex-wrap">
                {GENDER_OPTS.map(([k, l]) => (
                  <button
                    key={k}
                    type="button"
                    className={cn(chipBase, state.gender === k && chipOn)}
                    onClick={() => dispatch({ type: "SET_GENDER", value: k })}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
        <div>
          <label className="font-semibold text-[15px] leading-[1.3] tracking-[-0.008em] text-[var(--w-fg-strong)] flex items-center gap-1.5" style={{ marginBottom: 8 }}>지역 (국가, 복수 선택)</label>
          <div className="flex gap-2 flex-wrap">
            {COUNTRIES.map((c) => {
              const on = state.countries.includes(c.code);
              return (
                <button
                  key={c.code}
                  type="button"
                  className={cn(chipBase, on && chipAccent)}
                  onClick={() => toggleCountry(c.code)}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          {state.countries.length === 0 && (
            <div className="font-medium text-[12px] leading-[1.5] tracking-[0.008em] text-[var(--w-status-cautionary)]" style={{ marginTop: 8 }}>
              최소 1개 국가를 선택해주세요.
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between gap-3" style={{ marginTop: 24 }}>
        <Button variant="secondary" type="button" onClick={onBack}>
          <Icon name="arrow-left" size={14} /> 이전
        </Button>
        <Button variant="primary" type="button" onClick={onNext}>
          다음 <Icon name="arrow-right" size={14} />
        </Button>
      </div>
    </>
  );
}
