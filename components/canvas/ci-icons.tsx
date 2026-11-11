// Перенесено из team/webapp/components/itsm/ci-icons.tsx — единый набор 2.5D CI-иконок.
// Правки лучше вносить в обе копии (или вынести в общий пакет).
"use client";

import * as React from "react";

/**
 * CI icon system for ITSM / CMDB.
 *
 * One visual grammar for every object: a 2.5D oblique projection (the depth
 * axis goes up-right), light top / mid front / dark side faces, the same edge
 * stroke, a soft ground shadow, and one accent colour per object family.
 *
 * - Every icon is a 128×128 viewBox, no fixed size — scale freely.
 * - Colours are CSS variables with fallbacks, so the markup also works as a
 *   standalone .svg (light theme); `.dark .ci` in globals.css re-themes it.
 * - `status` adds a badge + tinted ground glow, `selected` a focus ring.
 * - Small sizes drop fine details automatically (`detail="auto"`).
 * - Renders an <svg>, so it can be nested inside a diagram <svg> with x / y.
 */

// ─── Projection & palette ───────────────────────────────────────────────────

const DX = 0.6;
const DY = -0.4;

const C = {
  top: "var(--ci-top, #f8fafc)",
  front: "var(--ci-front, #e2e8f0)",
  side: "var(--ci-side, #cbd5e1)",
  edge: "var(--ci-edge, #475569)",
  hole: "var(--ci-hole, #1e293b)",
  slot: "var(--ci-slot, #94a3b8)",
  screen: "var(--ci-screen, #0f172a)",
  shadow: "var(--ci-shadow, #0f172a)",
  paper: "var(--ci-paper, #ffffff)",
  ring: "var(--ci-badge-ring, #ffffff)",
  gold: "#f5b83d",
};

export type CiTone = "blue" | "violet" | "emerald" | "rose" | "amber" | "cyan" | "indigo" | "sky" | "teal" | "slate" | "orange";

export const CI_TONES: Record<CiTone, string> = {
  blue: "#3b82f6",
  violet: "#8b5cf6",
  emerald: "#10b981",
  rose: "#f43f5e",
  amber: "#f59e0b",
  cyan: "#06b6d4",
  indigo: "#6366f1",
  sky: "#0ea5e9",
  teal: "#14b8a6",
  slate: "#64748b",
  orange: "#f97316",
};

interface Ctx {
  /** accent colour */
  a: string;
  /** draw fine details (ports, vents, keys) */
  full: boolean;
  /** unique prefix for gradient ids */
  id: string;
}

// ─── Primitives ─────────────────────────────────────────────────────────────

/** Matrix mapping (u = along width, v = along depth) onto a box's top face */
const topT = (x: number, y: number) => `matrix(1 0 ${DX} ${DY} ${x} ${y})`;
/** Matrix mapping (u = along depth, v = down the height) onto a box's right face */
const sideT = (x: number, y: number, w: number) => `matrix(${DX} ${DY} 0 1 ${x + w} ${y})`;

interface BoxProps {
  x: number; y: number; w: number; h: number; d: number;
  top?: string; front?: string; side?: string;
  /** white / black veils over the faces (for accent-coloured boxes) */
  tint?: boolean;
  dashed?: boolean;
  edge?: string;
  opacity?: number;
}

function Box({ x, y, w, h, d, top = C.top, front = C.front, side = C.side, tint, dashed, edge = C.edge, opacity }: BoxProps) {
  const dx = d * DX;
  const dy = d * DY;
  const topD = `M${x} ${y}L${x + w} ${y}L${x + w + dx} ${y + dy}L${x + dx} ${y + dy}Z`;
  const sideD = `M${x + w} ${y}L${x + w + dx} ${y + dy}L${x + w + dx} ${y + h + dy}L${x + w} ${y + h}Z`;
  const dash = dashed ? "4 3" : undefined;
  return (
    <g opacity={opacity}>
      <path d={topD} fill={top} />
      {tint && <path d={topD} fill="#fff" opacity={0.28} />}
      <path d={sideD} fill={side} />
      {tint && <path d={sideD} fill="#000" opacity={0.22} />}
      <rect x={x} y={y} width={w} height={h} fill={front} />
      <path
        d={`M${x} ${y + h}L${x} ${y}L${x + dx} ${y + dy}L${x + w + dx} ${y + dy}L${x + w + dx} ${y + h + dy}L${x + w} ${y + h}Z`}
        fill="none" stroke={edge} strokeOpacity={0.55} strokeWidth={1.2} strokeLinejoin="round" strokeDasharray={dash}
      />
      <path d={`M${x} ${y}L${x + w} ${y}L${x + w + dx} ${y + dy}M${x + w} ${y}L${x + w} ${y + h}`} fill="none" stroke={edge} strokeOpacity={0.3} strokeWidth={1} strokeDasharray={dash} />
    </g>
  );
}

function Ground({ x, y, w, d, pad = 4 }: { x: number; y: number; w: number; d: number; pad?: number }) {
  const dx = d * DX;
  const dy = d * DY;
  return <ellipse cx={x + (w + dx) / 2} cy={y + dy / 2 + 1.5} rx={(w + dx) / 2 + pad} ry={-dy / 2 + pad + 1} fill={C.shadow} opacity={0.1} />;
}

function Led({ cx, cy, c, r = 1.4 }: { cx: number; cy: number; c: string; r?: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r * 2.2} fill={c} opacity={0.22} />
      <circle cx={cx} cy={cy} r={r} fill={c} />
    </g>
  );
}

function Lines({ x, y, w, n, gap, c = C.slot, sw = 1, vertical, len }: { x: number; y: number; w?: number; n: number; gap: number; c?: string; sw?: number; vertical?: boolean; len: number }) {
  return (
    <g stroke={c} strokeWidth={sw} strokeLinecap="round">
      {Array.from({ length: n }, (_, i) => vertical
        ? <line key={i} x1={x + i * gap} y1={y} x2={x + i * gap} y2={y + len} />
        : <line key={i} x1={x} y1={y + i * gap} x2={x + (w ?? len)} y2={y + i * gap} />)}
    </g>
  );
}

type UnitVariant = "server" | "switch" | "storage" | "firewall" | "ups" | "patch" | "blank";

/** Front panel of a rack unit (drawn on an axis-aligned front face) */
function UnitFront({ x, y, w, h, v, ctx, face = false }: { x: number; y: number; w: number; h: number; v: UnitVariant; ctx: Ctx; face?: boolean }) {
  const { a, full } = ctx;
  const ok = "#22c55e";
  const inner = { x: x + 3.5, y: y + 2, w: w - 7, h: h - 4 };
  return (
    <g>
      {face && <rect x={x} y={y} width={w} height={h} fill={C.front} stroke={C.edge} strokeOpacity={0.35} strokeWidth={0.8} />}
      {/* rack ears */}
      <rect x={x} y={y} width={2.4} height={h} fill={C.side} />
      <rect x={x + w - 2.4} y={y} width={2.4} height={h} fill={C.side} />
      {v === "server" && (() => {
        const bays = Math.max(2, Math.floor((inner.w - 22) / 9));
        const bh = inner.h - 1;
        return (
          <g>
            {Array.from({ length: full ? bays : 2 }, (_, i) => (
              <g key={i}>
                <rect x={inner.x + 1 + i * 9} y={inner.y + 0.5} width={7.4} height={bh} rx={1} fill={C.slot} opacity={0.55} />
                {full && <circle cx={inner.x + 3 + i * 9} cy={inner.y + bh - 1.2} r={0.8} fill={i % 3 === 1 ? a : ok} />}
              </g>
            ))}
            {full && <Lines x={inner.x + inner.w - 16} y={inner.y + 1.5} n={4} gap={2.2} len={bh - 2} vertical />}
            <Led cx={inner.x + inner.w - 3} cy={inner.y + 2.2} c={a} r={1.1} />
            <Led cx={inner.x + inner.w - 3} cy={inner.y + inner.h - 2.4} c={ok} r={1.1} />
          </g>
        );
      })()}
      {v === "switch" && (() => {
        const cols = Math.floor((inner.w - 16) / 4.4);
        const rows = inner.h > 9 ? 2 : 1;
        return (
          <g>
            {full ? Array.from({ length: rows }, (_, r) => Array.from({ length: cols }, (_, c) => (
              <rect key={`${r}-${c}`} x={inner.x + 2 + c * 4.4} y={inner.y + inner.h - 4.2 - r * 4.4} width={3.4} height={3} rx={0.4} fill={C.hole} />
            ))) : <rect x={inner.x + 2} y={inner.y + inner.h - 5} width={cols * 4.4} height={4} rx={0.6} fill={C.hole} opacity={0.7} />}
            {full && Array.from({ length: cols }, (_, c) => (
              <circle key={c} cx={inner.x + 3.7 + c * 4.4} cy={inner.y + 1.4} r={0.6} fill={c % 4 === 0 ? a : ok} />
            ))}
            <rect x={inner.x + inner.w - 10} y={inner.y + inner.h / 2 - 2.5} width={7} height={5} rx={1} fill={a} opacity={0.85} />
          </g>
        );
      })()}
      {v === "storage" && (() => {
        const n = Math.max(3, Math.floor((inner.w - 4) / 5.4));
        return (
          <g>
            {Array.from({ length: full ? n : 4 }, (_, i) => {
              const step = full ? 5.4 : (inner.w - 4) / 4;
              return (
                <g key={i}>
                  <rect x={inner.x + 1 + i * step} y={inner.y + 0.5} width={step - 1.4} height={inner.h - 1} rx={0.8} fill={C.slot} opacity={0.5} />
                  <circle cx={inner.x + 1 + i * step + (step - 1.4) / 2} cy={inner.y + 2.6} r={0.8} fill={i % 5 === 2 ? a : ok} />
                </g>
              );
            })}
          </g>
        );
      })()}
      {v === "firewall" && (
        <g>
          <path d={`M${inner.x + 7} ${inner.y + 1}l6 2.2v5.2c0 4.4-2.7 7.3-6 8.6-3.3-1.3-6-4.2-6-8.6V${inner.y + 3.2}z`} fill={a} transform={inner.h < 14 ? `translate(0 0) scale(1)` : undefined} />
          <path d={`M${inner.x + 4.6} ${inner.y + 8.6}l1.8 1.8 3.4-3.6`} fill="none" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
          {full && (
            <g opacity={0.9}>
              {Array.from({ length: Math.max(1, Math.floor((inner.h - 2) / 4)) }, (_, r) => (
                Array.from({ length: Math.floor((inner.w - 34) / 8) }, (_, c) => (
                  <rect key={`${r}-${c}`} x={inner.x + 18 + c * 8 + (r % 2 ? 4 : 0)} y={inner.y + 1 + r * 4} width={7} height={3.2} rx={0.4} fill={a} opacity={0.18 + ((r + c) % 3) * 0.08} />
                ))
              ))}
            </g>
          )}
          <rect x={inner.x + inner.w - 12} y={inner.y + 1.5} width={10} height={5} rx={1} fill={C.screen} />
          <rect x={inner.x + inner.w - 10.6} y={inner.y + 3.2} width={5} height={1.6} rx={0.5} fill={a} />
          {full && Array.from({ length: 2 }, (_, i) => <rect key={i} x={inner.x + inner.w - 12 + i * 5.4} y={inner.y + inner.h - 5} width={4.2} height={3.2} rx={0.4} fill={C.hole} />)}
        </g>
      )}
      {v === "ups" && (
        <g>
          <rect x={inner.x + 2} y={inner.y + 1} width={18} height={inner.h - 2} rx={1.2} fill={C.screen} />
          {Array.from({ length: 4 }, (_, i) => <rect key={i} x={inner.x + 4 + i * 3.6} y={inner.y + 3} width={2.6} height={inner.h - 6} rx={0.5} fill={i < 3 ? a : C.slot} opacity={i < 3 ? 1 : 0.5} />)}
          {full && <Lines x={inner.x + 26} y={inner.y + 2} n={Math.floor((inner.w - 36) / 3)} gap={3} len={inner.h - 4} vertical />}
          <Led cx={inner.x + inner.w - 4} cy={inner.y + inner.h / 2} c="#22c55e" r={1.2} />
        </g>
      )}
      {v === "patch" && (
        <g>
          {Array.from({ length: Math.floor((inner.w - 4) / 3.6) }, (_, c) => (
            <rect key={c} x={inner.x + 2 + c * 3.6} y={inner.y + inner.h / 2 - 1.4} width={2.6} height={2.8} rx={0.3} fill={C.hole} opacity={full ? 1 : 0.7} />
          ))}
        </g>
      )}
      {v === "blank" && full && <Lines x={inner.x + 4} y={inner.y + inner.h / 2} w={inner.w - 8} n={1} gap={0} len={inner.w - 8} c={C.slot} sw={0.8} />}
    </g>
  );
}

function Glare({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#fff" stopOpacity={0.35} />
      <stop offset="0.45" stopColor="#fff" stopOpacity={0.06} />
      <stop offset="1" stopColor="#fff" stopOpacity={0} />
    </linearGradient>
  );
}

function ScreenGrad({ id, a }: { id: string; a: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stopColor={a} stopOpacity={0.55} />
      <stop offset="0.55" stopColor={C.screen} stopOpacity={1} />
      <stop offset="1" stopColor={C.screen} stopOpacity={1} />
    </linearGradient>
  );
}

// ─── Objects ────────────────────────────────────────────────────────────────

type Draw = (ctx: Ctx) => React.ReactNode;

const server: Draw = (ctx) => (
  <g>
    <Ground x={12} y={84} w={76} d={44} />
    <Box x={12} y={64} w={76} h={20} d={44} />
    <UnitFront x={12} y={64} w={76} h={20} v="server" ctx={ctx} />
    <Box x={12} y={42} w={76} h={20} d={44} />
    <UnitFront x={12} y={42} w={76} h={20} v="server" ctx={ctx} />
    {ctx.full && <g transform={topT(12, 42)}><Lines x={50} y={8} n={5} gap={5} len={30} vertical c={C.slot} /></g>}
  </g>
);

const storage: Draw = (ctx) => (
  <g>
    <Ground x={16} y={92} w={70} d={40} />
    <Box x={16} y={46} w={70} h={46} d={40} />
    <UnitFront x={16} y={48} w={70} h={20} v="storage" ctx={ctx} />
    <UnitFront x={16} y={70} w={70} h={20} v="storage" ctx={ctx} />
    <g transform={topT(16, 46)}><rect x={6} y={30} width={24} height={4} rx={1} fill={ctx.a} opacity={0.8} /></g>
    {ctx.full && <g transform={sideT(16, 46, 70)}><Lines x={6} y={6} n={6} gap={5} len={34} vertical /></g>}
  </g>
);

const disk: Draw = (ctx) => (
  <g>
    <Ground x={20} y={86} w={64} d={54} />
    <Box x={20} y={76} w={64} h={10} d={54} />
    <g transform={topT(20, 76)}>
      <rect x={3} y={3} width={58} height={48} rx={3} fill={C.front} opacity={0.6} />
      <circle cx={30} cy={27} r={19} fill={C.side} stroke={C.edge} strokeOpacity={0.35} />
      <circle cx={30} cy={27} r={12} fill="none" stroke="#fff" strokeOpacity={0.45} />
      <circle cx={30} cy={27} r={5} fill={ctx.a} />
      <circle cx={30} cy={27} r={1.8} fill="#fff" />
      <path d="M54 46 L37 30" stroke={C.hole} strokeWidth={3.2} strokeLinecap="round" />
      <circle cx={54} cy={46} r={3} fill={C.hole} />
      {ctx.full && [[6, 6], [58, 6], [6, 48], [58, 48]].map(([u, v]) => <circle key={`${u}${v}`} cx={u} cy={v} r={1.3} fill={C.slot} />)}
    </g>
    <rect x={26} y={79} width={14} height={4} rx={0.8} fill={C.hole} />
    <rect x={43} y={79} width={8} height={4} rx={0.8} fill={C.hole} />
  </g>
);

const memoryStick = (ctx: Ctx, x: number, y: number, key: string) => (
  <g key={key}>
    <Box x={x} y={y} w={88} h={26} d={5} top={ctx.a} front={ctx.a} side={ctx.a} tint />
    <rect x={x} y={y} width={88} height={20} fill={`url(#${ctx.id}-ram)`} />
    {ctx.full && <Lines x={x + 3} y={y + 2} n={21} gap={4} len={3} vertical c="#fff" sw={0.8} />}
    <rect x={x + 24} y={y + 8} width={40} height={8} rx={1.2} fill="#fff" opacity={0.9} />
    {ctx.full && <><rect x={x + 27} y={y + 10.5} width={18} height={1.2} rx={0.6} fill={C.hole} opacity={0.6} /><rect x={x + 27} y={y + 13} width={26} height={1} rx={0.5} fill={C.slot} /></>}
    <rect x={x} y={y + 20} width={88} height={6} fill="#14532d" opacity={0.9} />
    {Array.from({ length: ctx.full ? 20 : 8 }, (_, i) => {
      const n = ctx.full ? 20 : 8;
      const step = 84 / n;
      const px = x + 2 + i * step;
      if (Math.abs(px - (x + 36)) < step / 2) return null; // key notch
      return <rect key={i} x={px} y={y + 21.5} width={step * 0.62} height={4.5} rx={0.3} fill={C.gold} />;
    })}
  </g>
);

const memory: Draw = (ctx) => (
  <g>
    <defs>
      <linearGradient id={`${ctx.id}-ram`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity={0.25} />
        <stop offset="1" stopColor="#000" stopOpacity={0.12} />
      </linearGradient>
    </defs>
    <ellipse cx={66} cy={92} rx={54} ry={6} fill={C.shadow} opacity={0.1} />
    {memoryStick(ctx, 26, 42, "back")}
    {memoryStick(ctx, 16, 60, "front")}
  </g>
);

const laptop: Draw = (ctx) => {
  const bx = 14, by = 92, bw = 80, bd = 34;
  const lidX = bx + bd * DX;
  const lidY = by + bd * DY;
  const H = 48;
  const lean = 0.12;
  const lid = `matrix(1 0 ${lean} -1 ${lidX} ${lidY})`;
  return (
    <g>
      <defs><ScreenGrad id={`${ctx.id}-scr`} a={ctx.a} /><Glare id={`${ctx.id}-gl`} /></defs>
      <Ground x={bx} y={by + 4} w={bw} d={bd} />
      <g transform={lid}>
        <rect x={0} y={0} width={bw} height={H} rx={3} fill={C.side} stroke={C.edge} strokeOpacity={0.5} strokeWidth={1.2} />
        <rect x={3.5} y={3.5} width={bw - 7} height={H - 7} rx={1.5} fill={`url(#${ctx.id}-scr)`} />
        <g transform={`matrix(1 0 0 -1 0 ${H})`}>
          <rect x={7} y={8} width={12} height={H - 18} rx={1} fill="#fff" opacity={0.1} />
          <rect x={23} y={8} width={30} height={3} rx={1} fill="#fff" opacity={0.75} />
          {ctx.full && <rect x={23} y={14} width={44} height={2} rx={1} fill="#fff" opacity={0.3} />}
          <polyline points={`23,${H - 12} 33,${H - 18} 41,${H - 15} 51,${H - 24} 61,${H - 20} 69,${H - 27}`} fill="none" stroke={ctx.a} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        </g>
        <rect x={3.5} y={3.5} width={bw - 7} height={H - 7} rx={1.5} fill={`url(#${ctx.id}-gl)`} />
      </g>
      <Box x={bx} y={by} w={bw} h={4} d={bd} />
      <g transform={topT(bx, by)}>
        {ctx.full ? Array.from({ length: 4 }, (_, r) => Array.from({ length: 13 }, (_, c) => (
          <rect key={`${r}-${c}`} x={7 + c * 5.1} y={14 + r * 4} width={4.2} height={3.1} rx={0.6} fill={C.slot} opacity={0.75} />
        ))) : <rect x={7} y={14} width={66} height={16} rx={1.5} fill={C.slot} opacity={0.6} />}
        <rect x={30} y={3.5} width={20} height={8} rx={1.2} fill={C.side} />
      </g>
    </g>
  );
};

const pc: Draw = (ctx) => {
  const x = 34, y = 24, w = 32, h = 80, d = 46;
  return (
    <g>
      <defs><Glare id={`${ctx.id}-gl`} /></defs>
      <Ground x={x} y={y + h} w={w} d={d} />
      <Box x={x} y={y} w={w} h={h} d={d} />
      <g transform={sideT(x, y, w)}>
        <rect x={4} y={6} width={d - 8} height={h - 14} rx={2} fill={C.screen} opacity={0.92} />
        {[22, 50].map((cy) => (
          <g key={cy}>
            <circle cx={d / 2} cy={cy} r={11} fill="none" stroke={ctx.a} strokeWidth={2.2} />
            <circle cx={d / 2} cy={cy} r={11} fill={ctx.a} opacity={0.15} />
            {ctx.full && Array.from({ length: 6 }, (_, i) => {
              const t = (i * Math.PI) / 3;
              return <path key={i} d={`M${d / 2} ${cy} q${Math.cos(t) * 5 - Math.sin(t) * 3} ${Math.sin(t) * 5 + Math.cos(t) * 3} ${Math.cos(t) * 9} ${Math.sin(t) * 9}`} stroke={ctx.a} strokeOpacity={0.7} strokeWidth={1.2} fill="none" />;
            })}
            <circle cx={d / 2} cy={cy} r={2.4} fill={ctx.a} />
          </g>
        ))}
        <rect x={4} y={6} width={d - 8} height={h - 14} rx={2} fill={`url(#${ctx.id}-gl)`} />
      </g>
      <rect x={x + 5} y={y + 7} width={w - 10} height={3} rx={1} fill={C.slot} opacity={0.7} />
      <rect x={x + 5} y={y + 12} width={w - 10} height={3} rx={1} fill={C.slot} opacity={0.5} />
      <circle cx={x + w / 2} cy={y + 24} r={4} fill="none" stroke={ctx.a} strokeWidth={1.8} />
      <circle cx={x + w / 2} cy={y + 24} r={1.4} fill={ctx.a} />
      {ctx.full && <><rect x={x + 9} y={y + 32} width={5} height={2.4} rx={0.5} fill={C.hole} /><rect x={x + 18} y={y + 32} width={5} height={2.4} rx={0.5} fill={C.hole} /></>}
      {ctx.full && <Lines x={x + 6} y={y + h - 26} w={w - 12} n={7} gap={3.2} len={w - 12} />}
    </g>
  );
};

const monitor: Draw = (ctx) => (
  <g>
    <defs><ScreenGrad id={`${ctx.id}-scr`} a={ctx.a} /><Glare id={`${ctx.id}-gl`} /></defs>
    <Ground x={36} y={96} w={42} d={24} />
    <Box x={36} y={93} w={42} h={3} d={24} />
    <Box x={52} y={74} w={10} h={20} d={6} />
    <Box x={12} y={22} w={88} h={56} d={6} front={C.hole} />
    <rect x={15} y={25} width={82} height={48} rx={1} fill={`url(#${ctx.id}-scr)`} />
    <rect x={20} y={30} width={24} height={3} rx={1} fill="#fff" opacity={0.8} />
    {ctx.full && <rect x={20} y={36} width={34} height={2} rx={1} fill="#fff" opacity={0.3} />}
    {[0, 1, 2, 3].map((i) => <rect key={i} x={64 + i * 7} y={62 - [10, 18, 13, 22][i]} width={4.5} height={[10, 18, 13, 22][i]} rx={1} fill={ctx.a} opacity={0.5 + i * 0.12} />)}
    <polyline points="20,64 28,56 35,59 44,49 54,53" fill="none" stroke="#fff" strokeOpacity={0.85} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    <rect x={15} y={25} width={82} height={48} rx={1} fill={`url(#${ctx.id}-gl)`} />
    <circle cx={56} cy={76} r={0.9} fill={ctx.a} />
  </g>
);

const switchDev: Draw = (ctx) => (
  <g>
    <Ground x={10} y={76} w={86} d={48} />
    <Box x={10} y={58} w={86} h={18} d={48} />
    <UnitFront x={10} y={58} w={86} h={18} v="switch" ctx={ctx} />
    <g transform={topT(10, 58)}>
      <rect x={8} y={36} width={22} height={5} rx={1} fill={ctx.a} opacity={0.85} />
      {ctx.full && <Lines x={50} y={10} n={6} gap={5} len={28} vertical />}
    </g>
  </g>
);

const router: Draw = (ctx) => {
  const x = 16, y = 64, w = 74, h = 16, d = 40;
  const at = (u: number, v: number) => [x + u + v * DX, y + v * DY] as const;
  const antennas = [at(8, 32), at(32, 34), at(56, 32)];
  return (
    <g>
      <Ground x={x} y={y + h} w={w} d={d} />
      {antennas.slice(0, 2).map(([ax, ay], i) => (
        <g key={i}>
          <line x1={ax} y1={ay} x2={ax - 2 + i * 2} y2={ay - 34} stroke={C.edge} strokeWidth={3.6} strokeLinecap="round" />
          <circle cx={ax - 2 + i * 2} cy={ay - 34} r={2.4} fill={ctx.a} />
        </g>
      ))}
      <Box x={x} y={y} w={w} h={h} d={d} />
      {[antennas[2]].map(([ax, ay]) => (
        <g key="r">
          <line x1={ax} y1={ay} x2={ax + 3} y2={ay - 34} stroke={C.edge} strokeWidth={3.6} strokeLinecap="round" />
          <circle cx={ax + 3} cy={ay - 34} r={2.4} fill={ctx.a} />
        </g>
      ))}
      {[0, 1, 2, 3].map((i) => <Led key={i} cx={x + 8 + i * 6} cy={y + 8} c={i === 0 ? "#22c55e" : ctx.a} r={1.2} />)}
      {Array.from({ length: 4 }, (_, i) => <rect key={i} x={x + 40 + i * 7} y={y + 5} width={5.4} height={5} rx={0.6} fill={C.hole} />)}
      {ctx.full && (
        <g transform={`translate(${x + 30} ${y + 9})`} fill="none" stroke={ctx.a} strokeWidth={1.2} strokeLinecap="round">
          <path d="M-3 0a4 4 0 0 1 6 0" /><path d="M-5 -2a7 7 0 0 1 10 0" />
        </g>
      )}
    </g>
  );
};

const firewall: Draw = (ctx) => (
  <g>
    <Ground x={12} y={82} w={80} d={42} />
    <Box x={12} y={50} w={80} h={32} d={42} />
    <UnitFront x={12} y={51} w={80} h={30} v="firewall" ctx={ctx} />
    <g transform={topT(12, 50)}>
      <path d="M10 8 h28 v4 h-28z M16 16 h28 v4 h-28z M10 24 h28 v4 h-28z" fill={ctx.a} opacity={0.35} />
    </g>
    {/* big shield */}
    <g transform="translate(40 6)">
      <path d="M16 0 L32 6 V20 C32 32 24 40 16 44 C8 40 0 32 0 20 V6 Z" fill={ctx.a} />
      <path d="M16 0 L32 6 V20 C32 32 24 40 16 44 Z" fill="#000" opacity={0.15} />
      <path d="M9 21 l5 5 9 -10" fill="none" stroke="#fff" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </g>
);

const accessPoint: Draw = (ctx) => (
  <g>
    <ellipse cx={64} cy={92} rx={46} ry={10} fill={C.shadow} opacity={0.1} />
    <path d="M22 76 v8 a42 14 0 0 0 84 0 v-8 z" fill={C.side} />
    <ellipse cx={64} cy={76} rx={42} ry={14} fill={C.top} stroke={C.edge} strokeOpacity={0.45} strokeWidth={1.2} />
    <ellipse cx={64} cy={76} rx={14} ry={4.8} fill="none" stroke={ctx.a} strokeWidth={2.4} />
    <ellipse cx={64} cy={76} rx={14} ry={4.8} fill={ctx.a} opacity={0.18} />
    <circle cx={64} cy={76} r={1.8} fill={ctx.a} />
    <g fill="none" stroke={ctx.a} strokeLinecap="round">
      <path d="M50 52 a20 20 0 0 1 28 0" strokeWidth={4} opacity={0.95} />
      <path d="M41 42 a32 32 0 0 1 46 0" strokeWidth={4} opacity={0.6} />
      <path d="M32 32 a44 44 0 0 1 64 0" strokeWidth={4} opacity={0.3} />
    </g>
    <circle cx={64} cy={60} r={3.4} fill={ctx.a} />
  </g>
);

const os: Draw = (ctx) => (
  <g>
    <Ground x={14} y={96} w={78} d={28} />
    <Box x={34} y={24} w={72} h={50} d={4} front={C.side} opacity={0.9} />
    <g transform="translate(58 42)"><rect width={28} height={3} rx={1.5} fill={ctx.a} opacity={0.5} /><rect y={6} width={18} height={3} rx={1.5} fill={C.slot} /></g>
    <Box x={14} y={40} w={78} h={56} d={5} />
    <rect x={14} y={40} width={78} height={10} fill={C.hole} />
    {["#f43f5e", "#f59e0b", "#22c55e"].map((c, i) => <circle key={c} cx={20 + i * 5.5} cy={45} r={1.9} fill={c} />)}
    <rect x={17} y={53} width={72} height={40} rx={1.5} fill={C.screen} />
    <path d="M22 60 l5 4 -5 4" fill="none" stroke={ctx.a} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    <rect x={30} y={66} width={10} height={2.4} rx={1} fill={ctx.a} />
    {[0, 1, 2].map((i) => <rect key={i} x={22} y={73 + i * 5.5} width={[46, 34, 54][i]} height={2.2} rx={1.1} fill="#fff" opacity={0.28 - i * 0.05} />)}
  </g>
);

const vm: Draw = (ctx) => (
  <g>
    <Ground x={18} y={98} w={64} d={46} />
    <Box x={18} y={48} w={64} h={50} d={46} top={ctx.a} front={ctx.a} side={ctx.a} opacity={0.12} dashed edge={ctx.a} />
    <Box x={34} y={74} w={32} h={16} d={20} />
    <UnitFront x={34} y={74} w={32} h={16} v="server" ctx={{ ...ctx, full: false }} />
    <Box x={40} y={60} w={20} h={10} d={12} top={ctx.a} front={ctx.a} side={ctx.a} tint />
    <path d={`M18 98 L18 48 L${18 + 46 * DX} ${48 + 46 * DY} L${82 + 46 * DX} ${48 + 46 * DY} L${82 + 46 * DX} ${98 + 46 * DY} L82 98 Z M18 48 L82 48 L82 98`} fill="none" stroke={ctx.a} strokeWidth={1.8} strokeDasharray="5 3.5" strokeLinejoin="round" />
    <rect x={18} y={48} width={64} height={50} fill={ctx.a} opacity={0.06} />
  </g>
);

function hexPoints(cx: number, cy: number, r: number, squash: number) {
  return Array.from({ length: 6 }, (_, i) => {
    const t = (Math.PI / 3) * i;
    return [cx + r * Math.cos(t), cy + r * Math.sin(t) * squash] as const;
  });
}

function gearPath(r1: number, r2: number, teeth: number) {
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 ? r1 : r2;
    const t0 = (Math.PI / teeth) * i - Math.PI / teeth / 2.6;
    const t1 = (Math.PI / teeth) * i + Math.PI / teeth / 2.6;
    pts.push(`${(r * Math.cos(t0)).toFixed(2)} ${(r * Math.sin(t0)).toFixed(2)}`, `${(r * Math.cos(t1)).toFixed(2)} ${(r * Math.sin(t1)).toFixed(2)}`);
  }
  return `M${pts.join(" L")}Z`;
}

const service: Draw = (ctx) => {
  const top = hexPoints(64, 54, 40, 0.56);
  const H = 18;
  const faces = [[0, 1], [1, 2], [2, 3]];
  const shades = [C.side, C.front, C.front];
  return (
    <g>
      <ellipse cx={64} cy={80} rx={48} ry={16} fill={C.shadow} opacity={0.1} />
      {faces.map(([a, b], i) => (
        <path key={i} d={`M${top[a][0]} ${top[a][1]}L${top[b][0]} ${top[b][1]}L${top[b][0]} ${top[b][1] + H}L${top[a][0]} ${top[a][1] + H}Z`} fill={shades[i]} stroke={C.edge} strokeOpacity={0.45} strokeWidth={1.2} strokeLinejoin="round" />
      ))}
      <path d={`M${top.map(([x, y]) => `${x} ${y}`).join("L")}Z`} fill={C.top} stroke={C.edge} strokeOpacity={0.5} strokeWidth={1.2} strokeLinejoin="round" />
      <path d={`M${hexPoints(64, 54, 30, 0.56).map(([x, y]) => `${x} ${y}`).join("L")}Z`} fill={ctx.a} opacity={0.14} />
      <g transform="translate(64 54) scale(1 0.56)">
        <path d={gearPath(20, 15, 9)} fill={ctx.a} />
        <circle r={7} fill={C.top} />
        <circle r={3} fill={ctx.a} />
      </g>
      {ctx.full && [top[1], top[2]].map(([x, y], i) => <rect key={i} x={x - 3} y={y + 6} width={6} height={3} rx={1} fill={ctx.a} opacity={0.6} />)}
    </g>
  );
};

const rack: Draw = (ctx) => {
  const x = 34, y = 18, w = 50, h = 94, d = 34;
  const units: Array<[number, UnitVariant]> = [[5, "patch"], [6, "switch"], [4, "blank"], [8, "server"], [8, "server"], [12, "storage"], [4, "blank"], [8, "firewall"], [8, "server"], [12, "ups"]];
  let cursor = y + 5;
  return (
    <g>
      <Ground x={x} y={y + h} w={w} d={d} />
      <Box x={x} y={y} w={w} h={h} d={d} />
      <rect x={x + 3.5} y={y + 3.5} width={w - 7} height={h - 7} fill={C.hole} />
      {units.map(([uh, v], i) => {
        const uy = cursor;
        cursor += uh + 0.8;
        if (uy + uh > y + h - 4) return null;
        return <UnitFront key={i} x={x + 5} y={uy} w={w - 10} h={uh} v={v} ctx={{ ...ctx, full: ctx.full && uh >= 6 }} face />;
      })}
      <g transform={topT(x, y)}>{ctx.full && <Lines x={10} y={8} n={6} gap={5} len={18} vertical />}</g>
      <g transform={sideT(x, y, w)}>
        <line x1={d / 2} y1={4} x2={d / 2} y2={h - 4} stroke={C.edge} strokeOpacity={0.2} />
        {ctx.full && <Lines x={6} y={8} w={d - 12} n={4} gap={3} len={d - 12} />}
      </g>
      <rect x={x + 1} y={y + h - 3} width={4} height={3} fill={C.hole} />
      <rect x={x + w - 5} y={y + h - 3} width={4} height={3} fill={C.hole} />
    </g>
  );
};

const cabinet: Draw = (ctx) => {
  const x = 16, y = 36, w = 72, h = 58, d = 36;
  return (
    <g>
      <defs><Glare id={`${ctx.id}-gl`} /></defs>
      <Ground x={x} y={y + h} w={w} d={d} />
      <Box x={x} y={y} w={w} h={h} d={d} />
      <rect x={x + 5} y={y + 5} width={w - 14} height={h - 10} rx={1.5} fill={C.hole} />
      <UnitFront x={x + 7} y={y + 8} w={w - 18} h={7} v="patch" ctx={ctx} face />
      <UnitFront x={x + 7} y={y + 17} w={w - 18} h={9} v="switch" ctx={ctx} face />
      <UnitFront x={x + 7} y={y + 28} w={w - 18} h={9} v="server" ctx={ctx} face />
      {ctx.full && <path d={`M${x + 12} ${y + 16} q 6 8 14 1 M${x + 28} ${y + 16} q 8 10 18 1`} fill="none" stroke={ctx.a} strokeWidth={1.3} opacity={0.8} />}
      {/* glass door */}
      <rect x={x + 5} y={y + 5} width={w - 14} height={h - 10} rx={1.5} fill={ctx.a} opacity={0.1} />
      <path d={`M${x + 5} ${y + 5} h${(w - 14) * 0.55} L${x + 5} ${y + h - 5} Z`} fill={`url(#${ctx.id}-gl)`} />
      <rect x={x + 5} y={y + 5} width={w - 14} height={h - 10} rx={1.5} fill="none" stroke={C.edge} strokeOpacity={0.45} />
      <rect x={x + w - 7.5} y={y + h / 2 - 7} width={3} height={14} rx={1.5} fill={ctx.a} />
      <g transform={topT(x, y)}>
        {[18, 44].map((u) => <g key={u}><circle cx={u} cy={d / 2} r={8} fill={C.side} /><circle cx={u} cy={d / 2} r={2.2} fill={C.hole} /></g>)}
      </g>
    </g>
  );
};

const database: Draw = (ctx) => {
  const cx = 64, rx = 36, ry = 12, H = 20;
  const tops = [30, 52, 74];
  return (
    <g>
      <ellipse cx={cx} cy={98} rx={rx + 8} ry={ry} fill={C.shadow} opacity={0.1} />
      {[...tops].reverse().map((ty, i) => (
        <g key={ty}>
          <path d={`M${cx - rx} ${ty} v${H} a${rx} ${ry} 0 0 0 ${rx * 2} 0 v${-H}`} fill={i % 2 ? C.front : C.side} stroke={C.edge} strokeOpacity={0.45} strokeWidth={1.2} />
          <path d={`M${cx - rx} ${ty + H} a${rx} ${ry} 0 0 0 ${rx * 2} 0`} fill="none" stroke={ctx.a} strokeWidth={2.4} />
          {ctx.full && <Led cx={cx + rx - 9} cy={ty + H - 2} c={ctx.a} r={1.3} />}
        </g>
      ))}
      <ellipse cx={cx} cy={tops[0]} rx={rx} ry={ry} fill={C.top} stroke={C.edge} strokeOpacity={0.5} strokeWidth={1.2} />
      <ellipse cx={cx} cy={tops[0]} rx={rx * 0.55} ry={ry * 0.55} fill={ctx.a} opacity={0.2} />
    </g>
  );
};

const CLOUD = "M34 84 a16 16 0 0 1 1-32 a22 22 0 0 1 41-9 a17 17 0 0 1 28 12 a15 15 0 0 1-2 29z";

const cloud: Draw = (ctx) => (
  <g>
    <defs>
      <linearGradient id={`${ctx.id}-cl`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={C.top} />
        <stop offset="1" stopColor={C.front} />
      </linearGradient>
    </defs>
    <ellipse cx={66} cy={96} rx={44} ry={7} fill={C.shadow} opacity={0.1} />
    {[6, 4.5, 3, 1.5].map((o) => <path key={o} d={CLOUD} transform={`translate(${o} ${-o * 0.7})`} fill={C.side} />)}
    <path d={CLOUD} transform="translate(6 -4.2)" fill="none" stroke={C.edge} strokeOpacity={0.3} strokeWidth={1.2} />
    <path d={CLOUD} fill={`url(#${ctx.id}-cl)`} stroke={C.edge} strokeOpacity={0.5} strokeWidth={1.2} />
    <g stroke={ctx.a} strokeWidth={2} strokeLinecap="round">
      <line x1={46} y1={70} x2={62} y2={60} /><line x1={62} y1={60} x2={80} y2={70} />
    </g>
    {[[46, 70], [62, 60], [80, 70]].map(([cx, cy]) => <circle key={cx} cx={cx} cy={cy} r={4.2} fill={ctx.a} stroke={C.top} strokeWidth={2} />)}
  </g>
);

const backup: Draw = (ctx) => (
  <g>
    <Ground x={12} y={96} w={64} d={36} />
    <Box x={12} y={68} w={64} h={28} d={36} />
    <UnitFront x={12} y={70} w={64} h={11} v="storage" ctx={ctx} />
    <UnitFront x={12} y={83} w={64} h={11} v="storage" ctx={ctx} />
    <g transform="translate(80 46)">
      <circle r={21} fill={C.top} stroke={C.edge} strokeOpacity={0.3} />
      <path d="M-11 -6 A13 13 0 1 1 -12 6" fill="none" stroke={ctx.a} strokeWidth={4.4} strokeLinecap="round" />
      <path d="M-17 -12 L-11 -5 L-3 -9" fill="none" stroke={ctx.a} strokeWidth={4.4} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M0 -6 V1 L5 4" fill="none" stroke={C.hole} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </g>
  </g>
);

const printer: Draw = (ctx) => {
  const x = 14, y = 60, w = 80, h = 30, d = 44;
  const bx = x + 12 + 40 * DX;
  const by = y + 40 * DY;
  return (
    <g>
      <Ground x={x} y={y + h} w={w} d={d} />
      {/* paper in the input tray */}
      <g transform={`matrix(1 0 0.18 -1 ${bx} ${by})`}>
        <rect x={0} y={0} width={48} height={30} fill={C.paper} stroke={C.edge} strokeOpacity={0.35} />
        {ctx.full && [8, 13, 18].map((v) => <rect key={v} x={6} y={v} width={30} height={1.6} fill={C.slot} opacity={0.6} />)}
      </g>
      <Box x={x} y={y} w={w} h={h} d={d} />
      <g transform={topT(x, y)}><rect x={10} y={10} width={60} height={16} rx={2} fill={C.side} opacity={0.8} /></g>
      <rect x={x + 10} y={y + 17} width={46} height={3} rx={1} fill={C.hole} />
      <path d={`M${x + 14} ${y + 19} h38 l2 9 h-42 z`} fill={C.paper} stroke={C.edge} strokeOpacity={0.3} />
      <rect x={x + 60} y={y + 6} width={14} height={8} rx={1.2} fill={C.screen} />
      <rect x={x + 62} y={y + 8.5} width={7} height={3} rx={0.8} fill={ctx.a} />
      <Led cx={x + 67} cy={y + 20} c="#22c55e" r={1.2} />
    </g>
  );
};

const ups: Draw = (ctx) => {
  const x = 38, y = 32, w = 36, h = 70, d = 40;
  return (
    <g>
      <Ground x={x} y={y + h} w={w} d={d} />
      <Box x={x} y={y} w={w} h={h} d={d} />
      <rect x={x + 5} y={y + 7} width={w - 10} height={16} rx={2} fill={C.screen} />
      <rect x={x + 8} y={y + 11} width={w - 18} height={8} rx={1} fill="none" stroke={ctx.a} strokeWidth={1.2} />
      <rect x={x + w - 10} y={y + 13.5} width={2} height={3} rx={0.5} fill={ctx.a} />
      {[0, 1, 2].map((i) => <rect key={i} x={x + 9.5 + i * 5} y={y + 12.5} width={3.6} height={5} rx={0.5} fill={ctx.a} />)}
      <circle cx={x + 11} cy={y + 30} r={2.6} fill={C.side} stroke={C.edge} strokeOpacity={0.4} />
      <circle cx={x + 19} cy={y + 30} r={2.6} fill={C.side} stroke={C.edge} strokeOpacity={0.4} />
      <Led cx={x + 27} cy={y + 30} c="#22c55e" r={1.3} />
      {ctx.full && <Lines x={x + 6} y={y + h - 28} w={w - 12} n={8} gap={3} len={w - 12} />}
      <g transform={sideT(x, y, w)}>
        <path d="M24 12 L12 38 H21 L16 58 L32 28 H22 L28 12 Z" fill={ctx.a} />
      </g>
    </g>
  );
};

const segment: Draw = (ctx) => {
  const x = 8, y = 84, w = 82, d = 50;
  const nodes: Array<[number, number]> = [[12, 12], [40, 36], [68, 12], [58, 40], [26, 28]];
  const links = [[0, 4], [4, 1], [1, 3], [4, 2], [2, 3]];
  const p = (u: number, v: number) => [x + u + v * DX, y + v * DY] as const;
  return (
    <g>
      <Ground x={x} y={y + 5} w={w} d={d} />
      <Box x={x} y={y} w={w} h={5} d={d} />
      <g transform={topT(x, y)}>
        <rect x={3} y={3} width={w - 6} height={d - 6} rx={3} fill={ctx.a} opacity={0.08} stroke={ctx.a} strokeOpacity={0.35} strokeDasharray="3 3" />
        {links.map(([a, b], i) => <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} stroke={ctx.a} strokeWidth={2} opacity={0.75} />)}
      </g>
      {nodes.map(([u, v], i) => {
        const [nx, ny] = p(u, v);
        return (
          <g key={i}>
            <path d={`M${nx - 5} ${ny} v-6 a5 2 0 0 1 10 0 v6 a5 2 0 0 1 -10 0z`} fill={i === 1 ? ctx.a : C.front} stroke={C.edge} strokeOpacity={0.5} strokeWidth={1} />
            <ellipse cx={nx} cy={ny - 6} rx={5} ry={2} fill={i === 1 ? "#fff" : C.top} opacity={i === 1 ? 0.5 : 1} />
          </g>
        );
      })}
    </g>
  );
};

const cluster: Draw = (ctx) => {
  const px = 8, py = 96, pw = 84, pd = 46;
  const at = (u: number, v: number) => [px + u + v * DX, py + v * DY] as const;
  const srv = (u: number, v: number, key: string) => {
    const [sx, sy] = at(u, v);
    return (
      <g key={key}>
        <Box x={sx} y={sy - 22} w={34} h={10} d={20} />
        <UnitFront x={sx} y={sy - 22} w={34} h={10} v="server" ctx={{ ...ctx, full: false }} />
        <Box x={sx} y={sy - 11} w={34} h={10} d={20} />
        <UnitFront x={sx} y={sy - 11} w={34} h={10} v="server" ctx={{ ...ctx, full: false }} />
      </g>
    );
  };
  return (
    <g>
      <Ground x={px} y={py + 4} w={pw} d={pd} />
      <Box x={px} y={py} w={pw} h={4} d={pd} />
      <g transform={topT(px, py)}>
        <path d="M22 14 L62 14 M22 14 L42 32 M62 14 L42 32" stroke={ctx.a} strokeWidth={2.2} opacity={0.8} fill="none" strokeDasharray="4 3" />
      </g>
      {srv(2, 28, "a")}
      {srv(44, 28, "b")}
      {srv(24, 4, "c")}
    </g>
  );
};

const container: Draw = (ctx) => {
  const x = 12, y = 52, w = 80, h = 38, d = 40;
  return (
    <g>
      <Ground x={x} y={y + h} w={w} d={d} />
      <Box x={x} y={y} w={w} h={h} d={d} top={ctx.a} front={ctx.a} side={ctx.a} tint />
      <Lines x={x + 4} y={y + 3} n={Math.floor((w - 8) / 5)} gap={5} len={h - 6} vertical c="#000" sw={1.4} />
      <rect x={x} y={y} width={w} height={h} fill="#000" opacity={0.06} />
      <g transform={sideT(x, y, w)}>
        <Lines x={4} y={3} n={7} gap={5} len={h - 6} vertical c="#000" sw={1.2} />
      </g>
      {[x + 52, x + 60].map((lx) => <rect key={lx} x={lx} y={y + 6} width={2.2} height={h - 12} rx={1} fill="#fff" opacity={0.75} />)}
      {[[x, y], [x + w - 4, y], [x, y + h - 4], [x + w - 4, y + h - 4]].map(([cx, cy]) => <rect key={`${cx}${cy}`} x={cx} y={cy} width={4} height={4} fill="#000" opacity={0.3} />)}
      <g transform={topT(x, y)}><rect x={8} y={12} width={26} height={12} rx={2} fill="#fff" opacity={0.7} /></g>
    </g>
  );
};

const loadBalancer: Draw = (ctx) => {
  const x = 12, y = 60, w = 80, h = 20, d = 46;
  return (
    <g>
      <Ground x={x} y={y + h} w={w} d={d} />
      <Box x={x} y={y} w={w} h={h} d={d} />
      <g transform={topT(x, y)}>
        <rect x={4} y={4} width={w - 8} height={d - 8} rx={3} fill={ctx.a} opacity={0.08} />
        <g fill="none" stroke={ctx.a} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" opacity={0.45}>
          <path d="M8 23 H30" />
          <path d="M30 23 C42 23 44 9 56 9 H66" />
          <path d="M30 23 H66" />
          <path d="M30 23 C42 23 44 37 56 37 H66" />
          <path d="M61 4.5 L66 9 L61 13.5 M61 18.5 L66 23 L61 27.5 M61 32.5 L66 37 L61 41.5" />
        </g>
        <circle cx={30} cy={23} r={4.4} fill={ctx.a} stroke={C.top} strokeWidth={1.6} />
      </g>
      <rect x={x + 6} y={y + 5} width={16} height={10} rx={1.5} fill={C.screen} />
      {[0, 1, 2].map((i) => <rect key={i} x={x + 8.5 + i * 4.3} y={y + 12 - [3, 5, 4][i]} width={2.8} height={[3, 5, 4][i]} rx={0.6} fill={ctx.a} />)}
      {Array.from({ length: ctx.full ? 6 : 3 }, (_, i) => <rect key={i} x={x + 30 + i * (ctx.full ? 6.4 : 12)} y={y + 7} width={4.8} height={4.4} rx={0.6} fill={C.hole} />)}
      {ctx.full && Array.from({ length: 6 }, (_, i) => <circle key={i} cx={x + 32.4 + i * 6.4} cy={y + 14.5} r={0.8} fill={i % 2 ? ctx.a : "#22c55e"} />)}
      <Led cx={x + w - 7} cy={y + 10} c="#22c55e" r={1.3} />
      {/* emblem: one flow split into three */}
      <g transform="translate(40 8)">
        <rect width={36} height={36} rx={10} fill="#000" opacity={0.12} transform="translate(0 2)" />
        <rect width={36} height={34} rx={10} fill={ctx.a} />
        <g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 17 H14 M14 17 C19 17 19 9 25 9 H28 M14 17 H28 M14 17 C19 17 19 25 25 25 H28" strokeWidth={3} />
          <path d="M25.5 6.5 L28 9 L25.5 11.5 M25.5 14.5 L28 17 L25.5 19.5 M25.5 22.5 L28 25 L25.5 27.5" strokeWidth={2.4} />
        </g>
        <circle cx={14} cy={17} r={2.6} fill="#fff" />
      </g>
    </g>
  );
};

const chip: Draw = (ctx) => {
  const x = 22, y = 78, w = 66, h = 6, d = 56;
  const ihs = { x: x + 14 + 12 * DX, y: y + 12 * DY, w: 38, d: 32 };
  return (
    <g>
      <Ground x={x} y={y + h} w={w} d={d} />
      <Box x={x} y={y} w={w} h={h} d={d} top="#166534" front="#14532d" side="#052e16" />
      <g transform={topT(x, y)}>
        {ctx.full && Array.from({ length: 12 }, (_, i) => (
          <g key={i} fill={C.gold}>
            <rect x={6 + i * 4.8} y={2} width={2.2} height={4} rx={0.4} />
            <rect x={6 + i * 4.8} y={d - 6} width={2.2} height={4} rx={0.4} />
          </g>
        ))}
        {ctx.full && [10, 16, 22, 28, 34, 40, 46].map((v) => <rect key={v} x={3} y={v} width={4} height={2} rx={0.4} fill={C.gold} />)}
        <path d="M10 44 h8 l4 -6 h6 M56 10 h-8 l-4 6 h-6" fill="none" stroke="#4ade80" strokeWidth={0.9} opacity={0.6} />
      </g>
      <Box x={ihs.x} y={ihs.y} w={ihs.w} h={5} d={ihs.d} top="#e2e8f0" front="#94a3b8" side="#64748b" />
      <g transform={topT(ihs.x, ihs.y)}>
        <rect x={4} y={4} width={ihs.w - 8} height={ihs.d - 8} rx={2} fill="#fff" opacity={0.35} />
        <rect x={8} y={ihs.d / 2 - 2} width={16} height={2.4} rx={1} fill={C.slot} />
        <rect x={8} y={ihs.d / 2 + 3} width={10} height={2} rx={1} fill={C.slot} opacity={0.7} />
        <circle cx={ihs.w - 8} cy={7} r={2.4} fill={ctx.a} />
      </g>
    </g>
  );
};

const phone: Draw = (ctx) => (
  <g>
    <defs><ScreenGrad id={`${ctx.id}-scr`} a={ctx.a} /><Glare id={`${ctx.id}-gl`} /></defs>
    <Ground x={42} y={106} w={36} d={8} />
    <Box x={42} y={22} w={36} h={84} d={6} front={C.hole} />
    <rect x={44.5} y={27} width={31} height={72} rx={2.5} fill={`url(#${ctx.id}-scr)`} />
    {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={48.5 + (i % 3) * 8.5} y={50 + Math.floor(i / 3) * 9} width={6} height={6} rx={1.6} fill={i === 0 ? ctx.a : "#fff"} opacity={i === 0 ? 1 : 0.3} />)}
    <rect x={48} y={34} width={18} height={3} rx={1} fill="#fff" opacity={0.8} />
    <rect x={52} y={24} width={16} height={1.6} rx={0.8} fill={C.slot} />
    <rect x={44.5} y={27} width={31} height={72} rx={2.5} fill={`url(#${ctx.id}-gl)`} />
  </g>
);

// Additional branch equipment uses the same projection, palette and detail levels.
const ipCamera: Draw = (ctx) => (
  <g>
    <Ground x={28} y={104} w={65} d={22} />
    <Box x={75} y={65} w={13} h={39} d={9} />
    <path d="M79 84 H58 V66" fill="none" stroke={C.edge} strokeWidth={7} strokeLinejoin="round" />
    <Box x={23} y={43} w={57} h={30} d={32} />
    <Box x={20} y={39} w={63} h={5} d={35} front={ctx.a} top={ctx.a} side={ctx.a} tint />
    <ellipse cx={40} cy={58} rx={14} ry={12} fill={C.hole} />
    <ellipse cx={40} cy={58} rx={8} ry={8} fill={ctx.a} />
    <circle cx={40} cy={58} r={4.5} fill={C.screen} />
    <circle cx={38} cy={56} r={1.8} fill="#fff" opacity={0.8} />
    {ctx.full && <Led cx={69} cy={59} c="#22c55e" r={1.5} />}
  </g>
);

const nvr: Draw = (ctx) => (
  <g>
    <Ground x={15} y={92} w={80} d={31} />
    <Box x={15} y={65} w={80} h={27} d={31} />
    <rect x={21} y={71} width={41} height={14} rx={2} fill={C.hole} />
    <circle cx={30} cy={78} r={3.5} fill={ctx.a} />
    <path d="M39 75 H48 V81 H39 Z M48 77 L53 74 V82 L48 79" fill={ctx.a} />
    <Led cx={86} cy={77} c={ctx.a} r={2} />
    {ctx.full && <><rect x={68} y={77} width={9} height={4} rx={1} fill={C.hole} /><Lines x={32} y={59} n={3} gap={3} len={36} /></>}
  </g>
);

function AccessTerminal({ ctx, face }: { ctx: Ctx; face: boolean }) {
  return (
    <g>
      <Ground x={39} y={108} w={43} d={10} />
      <Box x={39} y={24} w={43} h={84} d={10} />
      <rect x={43} y={29} width={35} height={face ? 53 : 65} rx={3} fill={C.screen} />
      {face ? <>
        <circle cx={60.5} cy={35} r={2} fill={ctx.a} />
        <g fill="none" stroke={ctx.a} strokeWidth={2} strokeLinecap="round">
          <path d="M49 48 V44 H54 M67 44 H72 V48 M49 68 V73 H54 M67 73 H72 V68" />
          <ellipse cx={60.5} cy={55} rx={6} ry={7} /><path d="M52 69 Q60 60 69 69" />
        </g>
        <rect x={49} y={88} width={23} height={13} rx={2} fill={ctx.a} />
        {ctx.full && <path d="M53 92 H66 M53 96 H61" stroke="#fff" strokeWidth={1.2} />}
      </> : <>
        <rect x={49} y={47} width={23} height={31} rx={3} fill={ctx.a} />
        <path d="M50 54 H71" stroke={C.paper} strokeWidth={4} />
        {ctx.full && <path d="M54 64 H65 M54 69 H60" stroke={C.paper} strokeWidth={1.5} />}
        <Led cx={60.5} cy={36} c="#22c55e" r={2} />
      </>}
      <rect x={50} y={103} width={21} height={2} rx={1} fill={ctx.a} />
    </g>
  );
}
const accessFace: Draw = (ctx) => <AccessTerminal ctx={ctx} face />;
const accessCard: Draw = (ctx) => <AccessTerminal ctx={ctx} face={false} />;

function BankingTerminal({ ctx, cards }: { ctx: Ctx; cards: boolean }) {
  return (
    <g>
      <Ground x={30} y={112} w={53} d={22} />
      <Box x={30} y={25} w={53} h={87} d={22} />
      <rect x={34} y={29} width={45} height={9} rx={1.5} fill={ctx.a} />
      <rect x={37} y={44} width={38} height={28} rx={2} fill={C.screen} />
      <rect x={41} y={48} width={30} height={20} rx={1} fill={ctx.a} opacity={0.5} />
      {ctx.full && <path d="M45 54 H65 M45 60 H58" stroke="#fff" strokeWidth={2} strokeLinecap="round" />}
      <rect x={37} y={77} width={17} height={9} rx={1} fill={C.slot} />
      {ctx.full && [0,1,2,3,4,5].map((i) => <rect key={i} x={39+(i%3)*5} y={79+Math.floor(i/3)*3} width={3} height={1.5} fill={C.hole} />)}
      <rect x={60} y={78} width={15} height={4} rx={1} fill={C.hole} />
      <rect x={37} y={91} width={38} height={7} rx={2} fill={C.hole} />
      {cards ? <g>
        <rect x={44} y={93} width={24} height={15} rx={2} fill={ctx.a} stroke={C.edge} strokeWidth={0.8} />
        <path d="M45 98 H67" stroke={C.paper} strokeWidth={3} />
        {ctx.full && <rect x={48} y={102} width={5} height={3} rx={0.5} fill={C.gold} />}
      </g> : <g>
        <path d="M42 94 H70 L66 107 H38 Z" fill="#86efac" stroke={C.edge} strokeWidth={0.8} />
        <ellipse cx={54} cy={100} rx={5} ry={3} fill="#16a34a" />
        {ctx.full && <path d="M41 104 H65" stroke="#16a34a" strokeWidth={1} />}
      </g>}
    </g>
  );
}
const cardDispenser: Draw = (ctx) => <BankingTerminal ctx={ctx} cards />;
const atm: Draw = (ctx) => <BankingTerminal ctx={ctx} cards={false} />;

const posTerminal: Draw = (ctx) => (
  <g>
    <Ground x={38} y={108} w={43} d={17} />
    <Box x={38} y={39} w={43} h={69} d={17} />
    <path d="M46 37 V16 H74 V37" fill={C.paper} stroke={C.edge} strokeWidth={1.2} />
    {ctx.full && <path d="M51 23 H68 M51 28 H64" stroke={C.slot} strokeWidth={2} />}
    <rect x={43} y={45} width={33} height={25} rx={2} fill={C.screen} />
    <path d="M52 57 L58 63 L69 51" fill="none" stroke={ctx.a} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    {[0,1,2,3,4,5,6,7,8].map((i) => <rect key={i} x={44+(i%3)*11} y={76+Math.floor(i/3)*8} width={8} height={5} rx={1.4} fill={i===8 ? ctx.a : C.slot} />)}
    <rect x={48} y={102} width={23} height={3} rx={1} fill={C.hole} />
  </g>
);

const lteRouter: Draw = (ctx) => (
  <g>
    <Ground x={24} y={103} w={66} d={22} />
    <path d="M35 71 V28 M86 60 V20" stroke={C.edge} strokeWidth={6} strokeLinecap="round" />
    <Box x={24} y={68} w={66} h={35} d={22} />
    <g fill={ctx.a}>
      <rect x={36} y={86} width={6} height={8} rx={1} /><rect x={46} y={80} width={6} height={14} rx={1} />
      <rect x={56} y={74} width={6} height={20} rx={1} />
    </g>
    <rect x={70} y={77} width={12} height={17} rx={2} fill={C.hole} />
    <path d="M73 81 H78 L80 84 V90 H73 Z" fill={C.gold} />
    {ctx.full && <><Led cx={32} cy={99} c="#22c55e" r={1.3} /><path d="M49 26 Q60 16 71 26 M54 31 Q60 26 66 31" fill="none" stroke={ctx.a} strokeWidth={2.5} strokeLinecap="round" /></>}
  </g>
);

// ─── Registry ───────────────────────────────────────────────────────────────

export type CiKind =
  | "server" | "storage" | "disk" | "memory" | "chip" | "laptop" | "pc" | "monitor" | "phone" | "printer"
  | "switch" | "router" | "firewall" | "loadBalancer" | "accessPoint" | "segment"
  | "os" | "vm" | "container" | "service" | "database" | "cloud" | "cluster" | "backup"
  | "rack" | "cabinet" | "ups"
  | "ipCamera" | "nvr" | "accessFace" | "accessCard" | "cardDispenser" | "atm" | "posTerminal" | "lteRouter";

export type CiGroup = "compute" | "endpoint" | "network" | "platform" | "facility" | "security" | "banking";

export const CI_GROUPS: Record<CiGroup, string> = {
  compute: "Вычисления и хранение",
  endpoint: "Рабочие места",
  network: "Сеть и безопасность",
  platform: "Платформа и сервисы",
  facility: "Размещение и питание",
  security: "Видеонаблюдение и СКУД",
  banking: "Банковское оборудование",
};

export const CI_KINDS: Array<{ kind: CiKind; label: string; group: CiGroup; tone: CiTone; draw: Draw }> = [
  { kind: "server", label: "Сервер", group: "compute", tone: "blue", draw: server },
  { kind: "storage", label: "СХД", group: "compute", tone: "violet", draw: storage },
  { kind: "disk", label: "Диск", group: "compute", tone: "violet", draw: disk },
  { kind: "memory", label: "Память", group: "compute", tone: "emerald", draw: memory },
  { kind: "chip", label: "Процессор / плата", group: "compute", tone: "emerald", draw: chip },
  { kind: "cluster", label: "Кластер", group: "compute", tone: "blue", draw: cluster },
  { kind: "laptop", label: "Ноутбук", group: "endpoint", tone: "indigo", draw: laptop },
  { kind: "pc", label: "ПК", group: "endpoint", tone: "indigo", draw: pc },
  { kind: "monitor", label: "Монитор", group: "endpoint", tone: "indigo", draw: monitor },
  { kind: "phone", label: "Смартфон", group: "endpoint", tone: "indigo", draw: phone },
  { kind: "printer", label: "Принтер", group: "endpoint", tone: "slate", draw: printer },
  { kind: "switch", label: "Коммутатор", group: "network", tone: "emerald", draw: switchDev },
  { kind: "lteRouter", label: "LTE-роутер", group: "network", tone: "emerald", draw: lteRouter },
  { kind: "router", label: "Маршрутизатор", group: "network", tone: "emerald", draw: router },
  { kind: "firewall", label: "Межсетевой экран", group: "network", tone: "rose", draw: firewall },
  { kind: "loadBalancer", label: "Балансировщик", group: "network", tone: "teal", draw: loadBalancer },
  { kind: "accessPoint", label: "Точка доступа Wi‑Fi", group: "network", tone: "emerald", draw: accessPoint },
  { kind: "segment", label: "Сегмент сети", group: "network", tone: "teal", draw: segment },
  { kind: "os", label: "ОС", group: "platform", tone: "cyan", draw: os },
  { kind: "vm", label: "Виртуальная машина", group: "platform", tone: "cyan", draw: vm },
  { kind: "container", label: "Контейнер", group: "platform", tone: "sky", draw: container },
  { kind: "service", label: "Сервис", group: "platform", tone: "teal", draw: service },
  { kind: "database", label: "База данных", group: "platform", tone: "violet", draw: database },
  { kind: "cloud", label: "Облако", group: "platform", tone: "sky", draw: cloud },
  { kind: "backup", label: "Резервная копия", group: "platform", tone: "orange", draw: backup },
  { kind: "rack", label: "Стойка", group: "facility", tone: "blue", draw: rack },
  { kind: "cabinet", label: "Шкаф", group: "facility", tone: "emerald", draw: cabinet },
  { kind: "ipCamera", label: "IP-камера", group: "security", tone: "sky", draw: ipCamera },
  { kind: "nvr", label: "NVR / видеорегистратор", group: "security", tone: "sky", draw: nvr },
  { kind: "accessFace", label: "СКУД Face ID", group: "security", tone: "teal", draw: accessFace },
  { kind: "accessCard", label: "Карточный СКУД", group: "security", tone: "teal", draw: accessCard },
  { kind: "cardDispenser", label: "Картомат", group: "banking", tone: "indigo", draw: cardDispenser },
  { kind: "atm", label: "Банкомат", group: "banking", tone: "emerald", draw: atm },
  { kind: "posTerminal", label: "POS-терминал", group: "banking", tone: "blue", draw: posTerminal },
  { kind: "ups", label: "ИБП", group: "facility", tone: "amber", draw: ups },
];

const BY_KIND = new Map(CI_KINDS.map((k) => [k.kind, k]));

/** Guess the kind of a CI from a type value or name ("server", "ВМ", "Коммутатор"…) */
export function ciKindFor(text?: string | null): CiKind | null {
  const t = String(text ?? "").toLowerCase();
  if (!t) return null;
  // Canonical registry values must round-trip before fuzzy name matching.
  const exact = CI_KINDS.find((item) => item.kind.toLowerCase() === t.trim());
  if (exact) return exact.kind;
  const rules: Array<[RegExp, CiKind]> = [
    [/ip[\s-]*camera|ip[\s-]*камер|камера|видеокамер|cctv/, "ipCamera"],
    [/\bnvr\b|видеорегистратор|network video recorder/, "nvr"],
    [/face[\s-]*id|access[\s-]*face|распознаван.*лиц|биометр/, "accessFace"],
    [/access[\s-]*card|card[\s-]*reader|карточн.*скуд|скуд|считывател.*карт/, "accessCard"],
    [/card[\s-]*dispenser|картомат/, "cardDispenser"],
    [/\batm\b|банкомат/, "atm"],
    [/\bpos\b|pos[\s-]*terminal|плат[её]жн.*терминал/, "posTerminal"],
    [/\blte\b|\b[45]g\b|сотов.*роутер|мобильн.*роутер/, "lteRouter"],
    [/virtual|\bvm\b|вирт|вм\b/, "vm"],
    [/firewall|межсет|фаерв|файерв|\butm\b|\bngfw\b/, "firewall"],
    [/balanc|балансир|\blb\b|haproxy|nginx|\bf5\b|ingress/, "loadBalancer"],
    [/switch|коммутат|свитч/, "switch"],
    [/router|маршрутиз|роутер|gateway|шлюз/, "router"],
    [/wi-?fi|access ?point|точк.* доступ|\bap\b/, "accessPoint"],
    [/cpu|процессор|gpu|видеокарт|raid|контроллер|\bnic\b|сетев.*карт|chip|чип|плата|board/, "chip"],
    [/network|сеть|сетев|vlan|segment|сегмент/, "segment"],
    [/storage|схд|\bnas\b|\bsan\b|массив/, "storage"],
    [/disk|диск|hdd|ssd|nvme/, "disk"],
    [/memory|память|\bram\b|озу|dimm/, "memory"],
    [/cluster|кластер/, "cluster"],
    [/laptop|notebook|ноутбук/, "laptop"],
    [/workstation|desktop|\bpc\b|пк\b|компьютер|рабоч.* станц/, "pc"],
    [/monitor|монитор|display|дисплей/, "monitor"],
    [/phone|смартфон|телефон|mobile|планшет|tablet/, "phone"],
    [/print|принтер|мфу|скан/, "printer"],
    [/\bos\b|операц|windows|linux|ubuntu|debian|macos|\bос\b/, "os"],
    [/container|контейнер|docker|kubernetes|k8s|pod\b/, "container"],
    [/database|\bdb\b|база данных|\bбд\b|postgres|mysql|oracle|mssql|mongo/, "database"],
    [/cloud|облак|aws|azure|gcp|yandex/, "cloud"],
    [/backup|резерв|бэкап|бекап/, "backup"],
    [/rack|стойк/, "rack"],
    [/cabinet|шкаф/, "cabinet"],
    [/ups|ибп|power|питан/, "ups"],
    [/service|сервис|приложен|application|app\b|систем/, "service"],
    [/server|сервер|хост|host/, "server"],
  ];
  return rules.find(([re]) => re.test(t))?.[1] ?? null;
}

// ─── Status ─────────────────────────────────────────────────────────────────

export type CiStatus = "normal" | "warning" | "critical" | "disabled" | "unknown" | "maintenance";

export const CI_STATUSES: Record<CiStatus, { label: string; color: string; glyph: string; fill?: boolean }> = {
  normal: { label: "Работает", color: "#10b981", glyph: "M7 12.5l3.2 3.2L17 9" },
  warning: { label: "Предупреждение", color: "#f59e0b", glyph: "M12 7v6.2M12 16.6v.4" },
  critical: { label: "Авария", color: "#ef4444", glyph: "M8.5 8.5l7 7M15.5 8.5l-7 7" },
  disabled: { label: "Выключен", color: "#94a3b8", glyph: "M8 12h8" },
  unknown: { label: "Неизвестно", color: "#64748b", glyph: "M9.6 9.6a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1.1.9-1.1 1.6v.4M12 16.6v.4" },
  maintenance: { label: "Обслуживание", color: "#3b82f6", glyph: "M14.7 7.6a3.4 3.4 0 0 0-4.5 4.3l-3.1 3.1 1.9 1.9 3.1-3.1a3.4 3.4 0 0 0 4.3-4.5l-2 2-1.6-.3-.3-1.6z", fill: true },
};

/** Map a record's status text onto a CI status */
export function ciStatusFor(text?: string | null): CiStatus | undefined {
  const t = String(text ?? "").toLowerCase();
  if (!t) return undefined;
  if (/crit|down|fail|авари|крит|недоступ|сбой|offline/.test(t)) return "critical";
  if (/warn|degrad|предупр|деград|rotation/.test(t)) return "warning";
  if (/maint|обслуж|ремонт|repair/.test(t)) return "maintenance";
  if (/retired|disabled|deprecated|выключ|списан|вывед|отключ/.test(t)) return "disabled";
  if (/active|used|in use|ok|online|production|работ|активн|в эксплуат|использ|установлен|в строю/.test(t)) return "normal";
  if (/planned|unknown|план|неизв/.test(t)) return "unknown";
  return undefined;
}

// ─── Component ──────────────────────────────────────────────────────────────

export interface CiIconProps extends Omit<React.SVGProps<SVGSVGElement>, "children"> {
  kind: CiKind;
  status?: CiStatus;
  selected?: boolean;
  /** px; also sets width/height unless given */
  size?: number;
  tone?: CiTone | string;
  /** "auto" drops fine details below 40px */
  detail?: "auto" | "full" | "compact";
  title?: string;
  /** pulse the badge for critical / warning */
  animated?: boolean;
}

export function CiIcon({ kind, status, selected, size = 64, tone, detail = "auto", title, animated, width, height, className, style, ...rest }: CiIconProps) {
  const uid = `ci${React.useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const def = BY_KIND.get(kind) ?? BY_KIND.get("server")!;
  const accent = tone ? (CI_TONES[tone as CiTone] ?? tone) : CI_TONES[def.tone];
  const full = detail === "full" || (detail === "auto" && size >= 40);
  const st = status ? CI_STATUSES[status] : undefined;
  const dim = status === "disabled";

  return (
    <svg
      viewBox="0 0 128 128"
      width={width ?? size}
      height={height ?? size}
      role="img"
      aria-label={title ?? def.label}
      className={["ci", className].filter(Boolean).join(" ")}
      style={style}
      {...rest}
    >
      <title>{title ?? `${def.label}${st ? ` · ${st.label}` : ""}`}</title>
      {selected && <ellipse cx={64} cy={100} rx={58} ry={18} fill="var(--ci-select, #3b82f6)" opacity={0.12} stroke="var(--ci-select, #3b82f6)" strokeWidth={2.5} strokeDasharray="6 4" />}
      {st && !dim && status !== "normal" && <ellipse cx={64} cy={100} rx={54} ry={15} fill={st.color} opacity={0.16} />}
      <g opacity={dim ? 0.5 : 1} style={dim ? { filter: "grayscale(1)" } : undefined}>
        {def.draw({ a: accent, full, id: uid })}
      </g>
      {st && (
        <g transform="translate(100 12)">
          {animated && (status === "critical" || status === "warning") && (
            <circle cx={12} cy={12} r={12} fill={st.color} opacity={0.35}>
              <animate attributeName="r" values="12;18;12" dur="1.6s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.35;0;0.35" dur="1.6s" repeatCount="indefinite" />
            </circle>
          )}
          <circle cx={12} cy={12} r={11.5} fill={st.color} stroke={C.ring} strokeWidth={2.5} />
          <path d={st.glyph} fill={st.fill ? "#fff" : "none"} stroke={st.fill ? "none" : "#fff"} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </g>
      )}
    </svg>
  );
}

// ─── Records → CI ───────────────────────────────────────────────────────────

interface FieldLike { name: string; label: string; type: string; options?: string[]; status_options?: Array<{ value: string }> }

const TYPE_FIELD = /type|kind|class|тип|вид|класс|категор/i;
const STATUS_FIELD = /status|state|статус|состояние/i;

/**
 * Which fields of a collection describe a configuration item: a "type" field
 * whose values map to CI kinds, and a status field. Falls back to the
 * collection name ("Серверы" → server) when there is no type field.
 */
export function ciFieldsFor(fields: FieldLike[], collectionName?: string) {
  const candidates = fields.filter((f) => ["dropdown", "status", "input"].includes(f.type) && TYPE_FIELD.test(`${f.name} ${f.label}`));
  const typeField = candidates.find((f) => {
    const opts = f.type === "status" ? (f.status_options ?? []).map((o) => o.value) : f.options ?? [];
    return opts.length ? opts.some((o) => ciKindFor(o)) : f.type === "input";
  });
  const statusField = fields.find((f) => ["dropdown", "status"].includes(f.type) && STATUS_FIELD.test(`${f.name} ${f.label}`));
  // Process collections ("Запрос на IT-сервис", "Резервное копирование…") are not CIs themselves
  const processLike = /запрос|заявк|request|управлен|создан|сброс|установк|оформлен|согласован|предоставлен|выдач|закупк|миграц|копирован|восстановл|деактивац|передач/i.test(collectionName ?? "");
  const fallbackKind = typeField || processLike ? null : ciKindFor(collectionName);
  if (!typeField && !fallbackKind) return null;
  return { typeField, statusField, fallbackKind };
}

export type CiFields = NonNullable<ReturnType<typeof ciFieldsFor>>;

export function ciForRecord(record: Record<string, unknown>, ci: CiFields | null): { kind: CiKind; status?: CiStatus } | null {
  if (!ci) return null;
  const kind = (ci.typeField ? ciKindFor(String(record[ci.typeField.name] ?? "")) : null) ?? ci.fallbackKind;
  if (!kind) return null;
  return { kind, status: ci.statusField ? ciStatusFor(String(record[ci.statusField.name] ?? "")) : undefined };
}
