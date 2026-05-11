"use client";

import { useRef } from "react";
import AgeRangeSlider from "./AgeRangeSlider";
import { fmtBudget } from "@/lib/launch-utils";
import { CTA_LABEL, IMAGE_ART } from "@/lib/creative-options";
import { COUNTRIES } from "@/lib/geo-options";
import { useCreative } from "./CreativeProvider";
import { useToast } from "./Toast";
import type { useAgeSlider } from "../_hooks/useAgeSlider";

type Period = { days: number; min: number; max: number };
type Gender = "all" | "male" | "female";

const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const GENDER_OPTS: { value: Gender; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "male", label: "남성" },
  { value: "female", label: "여성" },
];

type Props = {
  budget: string;
  setBudget: (v: string) => void;
  dateStart: string;
  setDateStart: (v: string) => void;
  dateEnd: string;
  setDateEnd: (v: string) => void;
  linkUrl: string;
  setLinkUrl: (v: string) => void;
  status: "ACTIVE" | "PAUSED";
  setStatus: (v: "ACTIVE" | "PAUSED") => void;
  imageDataUrl: string | null;
  setImageDataUrl: (v: string | null) => void;
  gender: Gender;
  setGender: (v: Gender) => void;
  countries: string[];
  setCountries: (v: string[]) => void;
  targetingPrefilled: boolean;
  notConnected: boolean;
  slider: ReturnType<typeof useAgeSlider>;
  period: Period;
  isPending: boolean;
  launchError: Error | null;
  onLaunch: () => void;
};

export default function LaunchSettingsForm({
  budget, setBudget,
  dateStart, setDateStart, dateEnd, setDateEnd,
  linkUrl, setLinkUrl, status, setStatus, imageDataUrl, setImageDataUrl,
  gender, setGender, countries, setCountries, targetingPrefilled, notConnected,
  slider, period, isPending, launchError, onLaunch,
}: Props) {
  const { state } = useCreative();
  const showToast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleCountry = (code: string) => {
    setCountries(
      countries.includes(code) ? countries.filter((c) => c !== code) : [...countries, code],
    );
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // 같은 파일 다시 선택 허용
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showToast("이미지 파일만 올릴 수 있어요");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      showToast("이미지 용량은 3MB 이하여야 해요");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setImageDataUrl(reader.result);
    };
    reader.onerror = () => showToast("이미지를 읽지 못했어요");
    reader.readAsDataURL(file);
  };

  return (
    <section className="card panel--settings">
      <header className="panel-head">
        <div>
          <h1 className="panel-head__title">광고 집행 설정</h1>
          <p className="panel-head__sub">
            필수 정보만 입력하면 Meta에 자동으로 광고가 올라가요
          </p>
        </div>
        <span className="badge badge--neutral mono">DRAFT · 02</span>
      </header>

      {/* Creative */}
      <section className="sec">
        <h2 className="sec__head">광고 소재</h2>
        <div className="creative-mini">
          <div className="creative-mini__thumb">
            {imageDataUrl ? (
              <img src={imageDataUrl} alt="광고 이미지" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div className={`image-tile__art ${IMAGE_ART[state.image]} art-grain`} style={{ position: "absolute", inset: 0 }} />
            )}
          </div>
          <div className="creative-mini__body">
            <p className="creative-mini__headline">{state.headline}</p>
            <p className="creative-mini__meta">
              <span>CTA · {CTA_LABEL[state.cta]}</span>
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
          <button className="btn btn--ghost" type="button" style={{ fontSize: "13px", padding: "6px 12px" }} onClick={() => fileRef.current?.click()}>
            {imageDataUrl ? "이미지 변경" : "이미지 업로드 (선택)"}
          </button>
          {imageDataUrl && (
            <button className="btn btn--ghost" type="button" style={{ fontSize: "13px", padding: "6px 12px" }} onClick={() => setImageDataUrl(null)}>
              제거
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
        </div>
        <p className="sec__hint">
          이미지를 올리지 않으면 랜딩페이지의 대표 이미지(og:image)가 사용돼요 · 3MB 이하 · JPEG 권장
        </p>
      </section>

      {/* Landing URL */}
      <section className="sec">
        <h2 className="sec__head">랜딩 페이지 URL</h2>
        <input
          className="input"
          type="url"
          inputMode="url"
          placeholder="https://example.com/promo"
          aria-label="랜딩 페이지 URL"
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
        />
        <p className="sec__hint">광고를 클릭하면 이동할 페이지예요 · https:// 로 시작해야 해요</p>
      </section>

      {/* Budget */}
      <section className="sec">
        <h2 className="sec__head">일일 예산</h2>
        <div className="money-input">
          <span className="money-input__prefix" aria-hidden="true">₩</span>
          <input
            className="input"
            type="text"
            inputMode="numeric"
            placeholder="30,000"
            aria-label="일일 예산 금액"
            value={budget}
            onChange={(e) => setBudget(fmtBudget(e.target.value))}
          />
        </div>
        <p className="sec__hint">하루에 사용할 예산 · 최소 <span className="mono">₩10,000</span></p>
      </section>

      {/* Period */}
      <section className="sec">
        <h2 className="sec__head">집행 기간</h2>
        <div className="date-row">
          <input className="input" type="date" aria-label="시작일" value={dateStart} onChange={(e) => setDateStart(e.target.value)} />
          <span className="date-row__sep" aria-hidden="true">~</span>
          <input className="input" type="date" aria-label="종료일" value={dateEnd} onChange={(e) => setDateEnd(e.target.value)} />
        </div>
        <p className="sec__hint">
          총 <span className="mono">{period.days}</span>일 집행 예정 · 예상 노출{" "}
          <span className="mono">{period.min}K – {period.max}K</span>
        </p>
      </section>

      {/* Target */}
      <section className="sec">
        <h2 className="sec__head">타겟 (간단 설정)</h2>
        {targetingPrefilled && (
          <p className="sec__hint" style={{ color: "var(--accent)", fontSize: "12px" }}>
            ✦ &lsquo;누구에게 보여줄 광고인가요&rsquo; 에 입력한 내용에서 자동으로 채웠어요 · 수정 가능
          </p>
        )}
        <AgeRangeSlider {...slider} />
        <div className="field" style={{ marginTop: "4px" }}>
          <span className="sec__hint" style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
            성별
          </span>
          <div className="chip-group" role="radiogroup" aria-label="성별">
            {GENDER_OPTS.map(({ value, label }) => (
              <button
                key={value}
                className="chip chip--ghost"
                type="button"
                role="radio"
                aria-checked={gender === value}
                aria-pressed={gender === value}
                onClick={() => setGender(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="field" style={{ marginTop: "4px" }}>
          <span className="sec__hint" style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
            지역 (국가 · 복수 선택 가능)
          </span>
          <div className="chip-group" role="group" aria-label="타겟 국가">
            {COUNTRIES.map(({ code, label }) => (
              <button
                key={code}
                className="chip chip--ghost"
                type="button"
                aria-pressed={countries.includes(code)}
                onClick={() => toggleCountry(code)}
              >
                {label}
              </button>
            ))}
          </div>
          {countries.length === 0 && (
            <p className="sec__hint" style={{ color: "var(--warning)", fontSize: "12px" }}>
              ⚠ 타겟 국가를 최소 한 곳 선택해주세요
            </p>
          )}
        </div>
        <div className="field">
          <span className="sec__hint" style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>
            게재 위치
          </span>
          <div className="locked-field">
            <svg className="locked-field__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span className="locked-field__text">Meta Advantage+ 자동 최적화</span>
            <span className="locked-field__badge">LOCKED</span>
          </div>
        </div>
      </section>

      {/* Launch status */}
      <section className="sec">
        <h2 className="sec__head">게재 상태</h2>
        <div className="segmented" role="radiogroup" aria-label="게재 상태">
          {[{ value: "PAUSED", label: "일시중지로 생성" }, { value: "ACTIVE", label: "지금 바로 게재" }].map(({ value, label }) => (
            <button
              key={value}
              className="segmented__opt"
              type="button"
              role="radio"
              aria-checked={status === value}
              onClick={() => setStatus(value as "ACTIVE" | "PAUSED")}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="sec__hint" style={status === "ACTIVE" ? { color: "var(--warning)" } : undefined}>
          {status === "ACTIVE"
            ? "⚠ Meta 광고 심사 통과 후 실제로 광고가 게재되고 광고비가 발생해요"
            : "캠페인·광고 세트·광고가 일시중지 상태로 만들어져요 · Meta 광고 관리자에서 직접 켤 수 있어요"}
        </p>
      </section>

      <footer className="launch-cta">
        <button
          className="btn btn--primary"
          type="button"
          disabled={isPending || notConnected || !linkUrl.trim() || countries.length === 0}
          onClick={onLaunch}
        >
          {isPending ? (
            <><span className="check-row__spinner" style={{ width: 16, height: 16 }} aria-hidden="true" />Meta에 전송 중…</>
          ) : (
            <><span aria-hidden="true">📢</span>{status === "ACTIVE" ? "Meta에 광고 게재하기" : "Meta에 광고 등록하기 (일시중지)"}</>
          )}
        </button>
        {notConnected && (
          <p style={{ fontSize: "12px", color: "var(--text-secondary)", textAlign: "center", margin: 0 }}>
            광고 계정·페이스북 페이지를 먼저 연결해야 광고를 집행할 수 있어요 (헤더의 &lsquo;광고 계정 연결&rsquo;)
          </p>
        )}
        {launchError && (
          <p role="alert" style={{ fontSize: "12px", color: "var(--warning)", textAlign: "center", margin: 0 }}>
            ⚠ {launchError.message}
          </p>
        )}
        <p className="launch-cta__caption">집행 전 Meta 광고 정책 검토가 자동으로 진행됩니다</p>
      </footer>
    </section>
  );
}
