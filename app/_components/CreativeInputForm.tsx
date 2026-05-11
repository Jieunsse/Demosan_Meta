"use client";

import { TONES } from "@/lib/creative-options";
import { useCreative } from "./CreativeProvider";

type Props = {
  brand: string;
  setBrand: (v: string) => void;
  target: string;
  setTarget: (v: string) => void;
  goal: string;
  setGoal: (v: string) => void;
  isPending: boolean;
  onGenerate: () => void;
};

export default function CreativeInputForm({
  brand, setBrand, target, setTarget, goal, setGoal, isPending, onGenerate,
}: Props) {
  const { state, dispatch } = useCreative();

  return (
    <section className="card panel--input">
      <header className="panel-head">
        <div>
          <h1 className="panel-head__title">광고 카피 생성</h1>
          <p className="panel-head__sub">
            제품·타겟·목표를 입력하면 AI가 광고 카피를 만들어요
          </p>
        </div>
        <span className="badge badge--neutral mono">DRAFT · 01</span>
      </header>

      <div className="input-fields">
        <div className="field">
          <label className="field__label" htmlFor="f-brand">
            어떤 브랜드·제품을 홍보하나요?
          </label>
          <textarea
            id="f-brand"
            className="textarea"
            rows={4}
            placeholder={"예) 20대 여성을 위한 비건 스킨케어 브랜드 '그린루틴'.\n대표 제품은 수분크림으로 자극 없는 성분이 강점이에요."}
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="f-target">
            누구에게 보여줄 광고인가요?
          </label>
          <textarea
            id="f-target"
            className="textarea"
            rows={2}
            style={{ minHeight: "64px" }}
            placeholder="예) 20-35세 여성, 피부 트러블 고민, 환경에 관심 있는 소비자"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="f-goal">
            이 광고로 무엇을 얻고 싶나요?
          </label>
          <input
            id="f-goal"
            className="input"
            type="text"
            placeholder="예) 브랜드 인지도 높이기 / 웹사이트 방문 유도 / 구매 전환"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field__label">광고 느낌</label>
          <div className="chip-group" role="radiogroup" aria-label="광고 느낌">
            {TONES.map(({ id, label }) => (
              <button
                key={id}
                className="chip"
                type="button"
                role="radio"
                aria-checked={state.tone === id}
                aria-pressed={state.tone === id}
                onClick={() => dispatch({ type: "SET_TONE", tone: id })}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <footer className="cta-stack">
        <div className="cta-block">
          <button
            className="btn btn--primary"
            type="button"
            disabled={isPending}
            onClick={onGenerate}
          >
            {isPending ? (
              <>
                <span className="check-row__spinner" style={{ width: 16, height: 16 }} aria-hidden="true" />
                생성 중…
              </>
            ) : (
              <><span aria-hidden="true">✨</span>AI 카피 생성하기</>
            )}
          </button>
        </div>
        <p className="cta-caption">
          <span className="brand-nano">Gemini</span>가 광고 카피를 생성해요
        </p>
      </footer>
    </section>
  );
}
