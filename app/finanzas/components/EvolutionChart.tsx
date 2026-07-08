"use client";

import { useRef, useState } from "react";
import { formatCLP, formatDateShort, type Snapshot } from "../lib/model";

// Gráfico de evolución (serie única). Especificación dataviz:
// línea 2px, área al 10% de opacidad, punto final ≥8px con anillo de superficie,
// grillas hairline recesivas, crosshair + tooltip al pasar el dedo/cursor.

const W = 336;
const H = 150;
const PAD_X = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;
const SERIES = "#3987e5"; // validado ≥3:1 sobre #12151b
const SURFACE = "#12151b";
const GRID = "#1f242b";
const MUTED = "#6b727c";

function fmtAxis(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    const m = value / 1_000_000;
    return `${(Math.round(m * 10) / 10).toString().replace(".", ",")}M`;
  }
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(Math.round(value));
}

export default function EvolutionChart({ points }: { points: Snapshot[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  if (points.length < 2) {
    return (
      <p className="py-6 text-center text-sm text-[#6b727c]">
        Aún no hay suficiente historia para graficar
      </p>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || max * 0.05 || 1;
  const lo = min - span * 0.12;
  const hi = max + span * 0.12;

  const t0 = Date.parse(points[0].date);
  const t1 = Date.parse(points[points.length - 1].date);
  const tSpan = t1 - t0 || 1;

  const x = (p: Snapshot) =>
    PAD_X + ((Date.parse(p.date) - t0) / tSpan) * (W - PAD_X * 2);
  const y = (v: number) =>
    PAD_TOP + (1 - (v - lo) / (hi - lo)) * (H - PAD_TOP - PAD_BOTTOM);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${x(p).toFixed(1)},${y(p.value).toFixed(1)}`)
    .join(" ");
  const areaPath = `${linePath} L${x(points[points.length - 1]).toFixed(1)},${H - PAD_BOTTOM} L${x(points[0]).toFixed(1)},${H - PAD_BOTTOM} Z`;

  const gridValues = [lo + (hi - lo) * 0.25, lo + (hi - lo) * 0.6, hi - (hi - lo) * 0.05];
  const last = points[points.length - 1];

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = 0;
    let bestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(x(p) - px);
      if (d < bestDist) {
        bestDist = d;
        nearest = i;
      }
    });
    setHover(nearest);
  }

  const hovered = hover !== null ? points[hover] : null;

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full touch-none select-none"
        role="img"
        aria-label={`Evolución del valor, de ${formatCLP(points[0].value)} a ${formatCLP(last.value)}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {gridValues.map((v) => (
          <g key={v}>
            <line
              x1={PAD_X}
              x2={W - PAD_X}
              y1={y(v)}
              y2={y(v)}
              stroke={GRID}
              strokeWidth={1}
            />
            <text
              x={W - PAD_X}
              y={y(v) - 3}
              textAnchor="end"
              fontSize={9}
              fill={MUTED}
            >
              {fmtAxis(v)}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={SERIES} opacity={0.1} />
        <path
          d={linePath}
          fill="none"
          stroke={SERIES}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {hovered ? (
          <line
            x1={x(hovered)}
            x2={x(hovered)}
            y1={PAD_TOP}
            y2={H - PAD_BOTTOM}
            stroke={MUTED}
            strokeWidth={1}
          />
        ) : null}

        {/* Punto final con anillo de superficie */}
        <circle cx={x(last)} cy={y(last.value)} r={4} fill={SERIES} stroke={SURFACE} strokeWidth={2} />

        {hovered && hovered !== last ? (
          <circle
            cx={x(hovered)}
            cy={y(hovered.value)}
            r={4}
            fill={SERIES}
            stroke={SURFACE}
            strokeWidth={2}
          />
        ) : null}

        <text x={PAD_X} y={H - 6} fontSize={9} fill={MUTED}>
          {formatDateShort(points[0].date)}
        </text>
        <text x={W - PAD_X} y={H - 6} textAnchor="end" fontSize={9} fill={MUTED}>
          {formatDateShort(last.date)}
        </text>
      </svg>

      {hovered ? (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-lg border border-[#23272f] bg-[#0f1218] px-2.5 py-1.5 text-center"
          style={{
            left: `${Math.min(Math.max((x(hovered) / W) * 100, 18), 82)}%`,
          }}
        >
          <p className="text-[10px] text-[#8b929c]">{formatDateShort(hovered.date)}</p>
          <p className="text-xs font-bold tabular-nums text-[#e9ebee]">
            {formatCLP(hovered.value)}
          </p>
        </div>
      ) : null}
    </div>
  );
}
