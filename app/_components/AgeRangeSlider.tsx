"use client";

import type { useAgeSlider } from "../_hooks/useAgeSlider";

type Props = ReturnType<typeof useAgeSlider>;

export default function AgeRangeSlider({
  ageMin,
  ageMax,
  ageMinPct,
  ageMaxPct,
  trackRef,
  dragThumb,
}: Props) {
  return (
    <div className="slider-row" role="group" aria-label="나이 범위 슬라이더">
      <div className="slider-meta">
        <span>연령대</span>
        <output className="slider-meta__value mono">
          {ageMin} – {ageMax}세
        </output>
      </div>

      <div className="slider-track">
        <div className="range-track" ref={trackRef}>
          <div
            className="range-track__fill"
            style={{ left: `${ageMinPct}%`, right: `${100 - ageMaxPct}%` }}
          />
          {(["min", "max"] as const).map((which) => (
            <div
              key={which}
              className="range-thumb"
              role="slider"
              tabIndex={0}
              aria-label={which === "min" ? "최솟값" : "최댓값"}
              aria-valuemin={18}
              aria-valuemax={65}
              aria-valuenow={which === "min" ? ageMin : ageMax}
              style={{ left: `${which === "min" ? ageMinPct : ageMaxPct}%` }}
              onPointerDown={(e) => {
                e.preventDefault();
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={dragThumb(which)}
            />
          ))}
        </div>
      </div>

      <div className="slider-meta" aria-hidden="true">
        <span className="mono">18세</span>
        <span className="mono">65세+</span>
      </div>
    </div>
  );
}
