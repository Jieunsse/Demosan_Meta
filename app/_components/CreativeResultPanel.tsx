"use client";

import { CTAS } from "@/lib/creative-options";
import { useCreative } from "./CreativeProvider";
import GeneratedImagesBlock from "./GeneratedImagesBlock";

type Props = {
  displayedHeadlines: [string, string, string];
  elapsedSec: number | null;
  copyPending: boolean;
  copySuccess: boolean;
  onNext: () => void;
};

export default function CreativeResultPanel({
  displayedHeadlines,
  elapsedSec,
  copyPending,
  copySuccess,
  onNext,
}: Props) {
  const { state, dispatch } = useCreative();

  return (
    <section className="card panel--result">
      <header className="panel-head">
        <div>
          <h2 className="panel-head__title">생성 결과</h2>
          <p className="panel-head__sub">
            마음에 드는 카피를 골라 광고 집행으로 넘기세요
          </p>
        </div>
        <span className="badge badge--ai">
          <span aria-hidden="true">✦</span> AI 생성
        </span>
      </header>

      <section className="result-section">
        <h3 className="subhead-ai">광고 카피</h3>

        {!copySuccess ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "var(--space-3)",
              padding: "var(--space-8) var(--space-4)",
              color: "var(--text-muted)",
              fontSize: "13px",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "24px" }} aria-hidden="true">
              {copyPending ? "" : "✨"}
            </span>
            {copyPending ? (
              <>
                <span
                  className="check-row__spinner"
                  style={{ width: 24, height: 24 }}
                  aria-hidden="true"
                />
                <span>AI가 카피를 생성하고 있어요…</span>
              </>
            ) : (
              <span>좌측 정보를 입력하고 생성 버튼을 눌러주세요</span>
            )}
          </div>
        ) : (
          <>
            <div
              className="radio-card-group"
              role="radiogroup"
              aria-label="헤드라인 선택"
            >
              {displayedHeadlines.map((text, i) => (
                <div
                  key={i}
                  className="radio-card"
                  role="radio"
                  tabIndex={0}
                  aria-checked={state.headline === text}
                  onClick={() =>
                    dispatch({ type: "SET_HEADLINE", headline: text })
                  }
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      dispatch({ type: "SET_HEADLINE", headline: text });
                    }
                  }}
                >
                  <span className="radio-card__bullet" aria-hidden="true" />
                  <span className="radio-card__text">{text}</span>
                  <span className="radio-card__index">Ver 0{i + 1}</span>
                </div>
              ))}
            </div>

            <textarea
              className="body-copy-edit"
              aria-label="바디 카피"
              value={state.bodyCopy}
              onChange={(e) =>
                dispatch({ type: "SET_BODY_COPY", bodyCopy: e.target.value })
              }
            />
            <p className="body-copy-meta">
              <span>{state.bodyCopy.length} / 200자</span>
            </p>

            <div className="cta-chip-row">
              <span className="cta-chip-row__label">CTA 문구 선택</span>
              <div
                className="chip-group"
                role="radiogroup"
                aria-label="CTA 문구"
              >
                {CTAS.map(({ id, label }) => (
                  <button
                    key={id}
                    className="chip chip--ghost"
                    type="button"
                    role="radio"
                    aria-checked={state.cta === id}
                    aria-pressed={state.cta === id}
                    onClick={() => dispatch({ type: "SET_CTA", cta: id })}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </section>

      <GeneratedImagesBlock />

      <hr className="divider" />

      <footer className="result-foot">
        <p className="result-stamp">
          <span
            className="result-stamp__dot"
            aria-hidden="true"
            style={{
              background: copySuccess ? undefined : "var(--text-muted)",
            }}
          />
          {copySuccess ? (
            <>
              <span>생성 완료 · </span>
              <span className="mono" style={{ marginLeft: "4px" }}>
                {elapsedSec}s
              </span>
            </>
          ) : (
            <span style={{ color: "var(--text-muted)" }}>
              아직 생성 전이에요
            </span>
          )}
        </p>
        <button
          className="btn btn--primary"
          type="button"
          disabled={!copySuccess}
          onClick={onNext}
        >
          선택 완료 — 광고 집행하기
          <span aria-hidden="true" style={{ marginLeft: "4px" }}>
            →
          </span>
        </button>
      </footer>
    </section>
  );
}
