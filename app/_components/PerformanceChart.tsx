"use client";

import { useState } from "react";

export type ChartPoint = { date: string; clicks: number; ctr: number };

const CW = 720,
  CH = 300;
const PAD = { l: 50, r: 50, t: 24, b: 36 };
const INNER_W = CW - PAD.l - PAD.r;
const INNER_H = CH - PAD.t - PAD.b;
const TICKS = [0, 1, 2, 3, 4];
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 1 / 2 / 5 × 10^n 으로 올림 — y축 최댓값을 보기 좋은 수로
function niceMax(v: number): number {
  if (!Number.isFinite(v) || v <= 0) return 1;
  const mag = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * mag;
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : `${d.getMonth() + 1}.${d.getDate()}`;
}
function weekday(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "" : WEEKDAYS[d.getDay()];
}

export default function PerformanceChart({ data }: { data: ChartPoint[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  if (data.length === 0) return null;

  const clickMax = niceMax(Math.max(...data.map((d) => d.clicks)));
  const ctrMax = Math.max(niceMax(Math.max(...data.map((d) => d.ctr))), 0.1);

  const xFor = (i: number) => PAD.l + (INNER_W / data.length) * (i + 0.5);
  const yCtr = (v: number) => PAD.t + INNER_H - (v / ctrMax) * INNER_H;
  const yClicks = (v: number) => PAD.t + INNER_H - (v / clickMax) * INNER_H;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yCtr(d.ctr)}`).join(" ");
  const areaPath = `${linePath} L${xFor(data.length - 1)},${PAD.t + INNER_H} L${xFor(0)},${PAD.t + INNER_H} Z`;
  const barW = Math.min((INNER_W / data.length) * 0.42, 40);

  return (
    <figure className="chart-card">
      <header className="chart-head">
        <h2 className="chart-head__title">일별 추이</h2>
        <ul className="legend" aria-label="범례">
          <li className="legend-item">
            <span className="legend-dot legend-dot--bar" aria-hidden="true" />
            클릭수
          </li>
          <li className="legend-item">
            <span className="legend-dot legend-dot--line" aria-hidden="true" />
            CTR
          </li>
        </ul>
      </header>

      <div className="chart-wrap" style={{ position: "relative", width: "100%" }}>
        <svg
          className="chart-svg"
          viewBox={`0 0 ${CW} ${CH}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="일별 클릭수 및 CTR 추이 차트"
          style={{ width: "100%", height: "300px", display: "block", overflow: "visible" }}
        >
          <defs>
            <linearGradient id="lineGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#A78BFA" stopOpacity={0.6} />
              <stop offset="100%" stopColor="#A78BFA" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4F7EFF" stopOpacity={0.85} />
              <stop offset="100%" stopColor="#4F7EFF" stopOpacity={0.25} />
            </linearGradient>
          </defs>

          {TICKS.map((i) => {
            const y = PAD.t + (INNER_H / 4) * i;
            const clickVal = Math.round(clickMax - (clickMax / 4) * i);
            const ctrVal = (ctrMax - (ctrMax / 4) * i).toFixed(1);
            return (
              <g key={i}>
                <line
                  className="chart-grid-line"
                  x1={PAD.l}
                  x2={CW - PAD.r}
                  y1={y}
                  y2={y}
                  stroke="var(--border)"
                  strokeDasharray="3 4"
                  strokeWidth={1}
                />
                <text x={PAD.l - 10} y={y + 3} textAnchor="end" fill="rgba(79,126,255,0.7)" fontFamily="var(--font-mono)" fontSize={11}>
                  {clickVal}
                </text>
                <text x={CW - PAD.r + 10} y={y + 3} textAnchor="start" fill="rgba(167,139,250,0.7)" fontFamily="var(--font-mono)" fontSize={11}>
                  {ctrVal}%
                </text>
              </g>
            );
          })}

          {data.map((d, i) => (
            <text
              key={`x-${d.date}`}
              x={xFor(i)}
              y={CH - PAD.b + 20}
              textAnchor="middle"
              fill="var(--text-muted)"
              fontFamily="var(--font-mono)"
              fontSize={11}
            >
              {fmtDate(d.date)}
            </text>
          ))}

          {data.map((d, i) => {
            const x = xFor(i) - barW / 2;
            const y = yClicks(d.clicks);
            return (
              <rect
                key={`bar-${d.date}`}
                className={`chart-bar${hoveredIdx === i ? " is-hover" : ""}`}
                x={x}
                y={y}
                width={barW}
                height={Math.max(0, PAD.t + INNER_H - y)}
                rx={3}
                fill="url(#barGradient)"
              />
            );
          })}

          <path className="chart-line-area" d={areaPath} fill="url(#lineGradient)" opacity={0.18} />
          <path
            className="chart-line"
            d={linePath}
            fill="none"
            stroke="var(--ai-purple)"
            strokeWidth={2.5}
            style={{ filter: "drop-shadow(0 0 6px rgba(167,139,250,0.7))" }}
          />

          {data.map((d, i) => (
            <circle
              key={`dot-${d.date}`}
              className={`chart-dot${hoveredIdx === i ? " is-hover" : ""}`}
              cx={xFor(i)}
              cy={yCtr(d.ctr)}
              r={hoveredIdx === i ? 6 : 4}
              fill="var(--ai-purple)"
              stroke="var(--bg-surface)"
              strokeWidth={2}
              style={{ filter: "drop-shadow(0 0 6px rgba(167,139,250,0.9))", cursor: "pointer" }}
            />
          ))}

          {data.map((d, i) => (
            <rect
              key={`hit-${d.date}`}
              x={PAD.l + (INNER_W / data.length) * i}
              y={PAD.t}
              width={INNER_W / data.length}
              height={INNER_H}
              fill="transparent"
              style={{ cursor: "pointer" }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
        </svg>

        {hoveredIdx !== null &&
          (() => {
            const d = data[hoveredIdx];
            return (
              <div
                className="chart-tooltip is-visible"
                role="tooltip"
                style={{
                  position: "absolute",
                  left: `${(xFor(hoveredIdx) / CW) * 100}%`,
                  top: `${yCtr(d.ctr)}px`,
                  pointerEvents: "none",
                  background: "var(--bg-base)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 14px",
                  boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
                  transform: "translate(-50%, -120%)",
                  minWidth: "130px",
                  opacity: 1,
                }}
              >
                <time className="chart-tooltip__date">
                  {fmtDate(d.date)} {weekday(d.date) && `(${weekday(d.date)})`}
                </time>
                <p className="chart-tooltip__row">
                  <span className="legend-dot legend-dot--bar" aria-hidden="true" style={{ width: 8, height: 8 }} />
                  클릭수
                  <span className="chart-tooltip__val">{d.clicks.toLocaleString("ko-KR")}</span>
                </p>
                <p className="chart-tooltip__row">
                  <span className="legend-dot legend-dot--line" aria-hidden="true" style={{ width: 8, height: 8 }} />
                  CTR
                  <span className="chart-tooltip__val">{d.ctr.toFixed(2)}%</span>
                </p>
              </div>
            );
          })()}
      </div>
    </figure>
  );
}
