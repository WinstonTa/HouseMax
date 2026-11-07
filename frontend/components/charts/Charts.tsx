"use client";

import { motion } from "motion/react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { useRef, useState, type MouseEvent, type ReactNode } from "react";
import { ChartTooltip, type TipState } from "./Tooltip";
import { cn } from "../ui/primitives";
import type { ChecklistItem } from "@/lib/types";

const EASE = [0.22, 1, 0.36, 1] as const;

function niceMax(v: number) {
  if (v <= 0) return 10;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / pow;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * pow;
}

function useTip() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<TipState | null>(null);
  const show = (e: MouseEvent, content: ReactNode) => {
    const box = ref.current?.getBoundingClientRect();
    if (!box) return;
    setTip({ x: e.clientX - box.left, y: e.clientY - box.top, content });
  };
  return { ref, tip, show, hide: () => setTip(null) };
}

function Axis({ max, ticks = 4, unit = "d" }: { max: number; ticks?: number; unit?: string }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const v = (max / ticks) * i;
        return (
          <div key={i} className="absolute inset-y-0" style={{ left: `${(v / max) * 100}%` }}>
            <span className="tabular absolute top-0 -translate-x-1/2 text-[10px] text-muted">
              {Math.round(v)}
              {unit}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string; value?: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5 text-xs text-ink-2">
          <span className="size-2.5 rounded-[3px]" style={{ background: i.color }} aria-hidden />
          {i.label}
          {i.value && <span className="tabular font-semibold text-ink">{i.value}</span>}
        </li>
      ))}
    </ul>
  );
}

/* ---------------- Timeline comparison (horizontal, stacked "your path") ---------------- */

export interface TimelineRow {
  label: string;
  sublabel?: string;
  segments: { label: string; days: number; color: string; pattern?: boolean }[];
  emphasis?: boolean;
}

export function TimelineBars({ rows }: { rows: TimelineRow[] }) {
  const { ref, tip, show, hide } = useTip();
  const total = (r: TimelineRow) => r.segments.reduce((s, x) => s + x.days, 0);
  const max = niceMax(Math.max(...rows.map(total)) * 1.05);
  return (
    <div ref={ref} className="relative">
      <div className="space-y-4 pb-6">
        {rows.map((r, ri) => (
          <div key={r.label} className="grid grid-cols-[minmax(110px,30%)_1fr] items-center gap-3">
            <div className="min-w-0">
              <p className={cn("truncate text-[13px]", r.emphasis ? "font-semibold text-ink" : "text-ink-2")}>{r.label}</p>
              {r.sublabel && <p className="truncate text-[11px] text-muted">{r.sublabel}</p>}
            </div>
            <div className="relative h-7">
              <AxisGhost max={max} />
              <div className="relative flex h-full items-center gap-[2px]">
                {r.segments.map((s, si) => (
                  <motion.div
                    key={s.label}
                    className={cn("h-full first:rounded-l-[4px] last:rounded-r-[4px]", r.emphasis ? "h-7" : "h-5")}
                    style={{
                      background: s.pattern
                        ? `repeating-linear-gradient(135deg, ${s.color} 0 3px, transparent 3px 6px)`
                        : s.color,
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(s.days / max) * 100}%` }}
                    transition={{ duration: 0.8, delay: 0.1 + ri * 0.1 + si * 0.08, ease: EASE }}
                    onMouseMove={(e) =>
                      show(
                        e,
                        <span>
                          <span className="font-semibold">{s.label}</span> · <span className="tabular">{s.days} days</span>
                        </span>,
                      )
                    }
                    onMouseLeave={hide}
                  />
                ))}
                <motion.span
                  className={cn("tabular ml-1.5 shrink-0 text-xs", r.emphasis ? "font-semibold text-ink" : "text-ink-2")}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 + ri * 0.1 }}
                >
                  {total(r)}d
                </motion.span>
              </div>
            </div>
          </div>
        ))}
        <div className="grid grid-cols-[minmax(110px,30%)_1fr] gap-3">
          <span />
          <div className="relative h-0">
            <Axis max={max} />
          </div>
        </div>
      </div>
      <ChartTooltip tip={tip} />
    </div>
  );
}

function AxisGhost({ ticks = 4 }: { max?: number; ticks?: number }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: ticks + 1 }, (_, i) => (
        <div key={i} className={cn("absolute inset-y-[-8px] w-px", i === 0 ? "bg-axis" : "bg-hairline")} style={{ left: `${(i / ticks) * 100}%` }} />
      ))}
    </div>
  );
}

/* ---------------- City benchmark (vertical bars, one highlighted, reference line) ---------------- */

export function CityBars({
  data,
  highlightId,
  reference,
}: {
  data: { id: string; label: string; value: number }[];
  highlightId: string;
  reference?: { value: number; label: string };
}) {
  const { ref, tip, show, hide } = useTip();
  const max = niceMax(Math.max(...data.map((d) => d.value), reference?.value ?? 0) * 1.1);
  return (
    <div ref={ref} className="relative">
      <div className="relative flex h-48 items-end gap-3 border-b border-axis px-1">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <div key={f} className="pointer-events-none absolute inset-x-0 border-t border-hairline" style={{ bottom: `${f * 100}%` }}>
            <span className="tabular absolute -top-2 right-full mr-1 text-[10px] text-muted">{Math.round(max * f)}</span>
          </div>
        ))}
        {reference && (
          <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-ink" style={{ bottom: `${(reference.value / max) * 100}%` }}>
            <span className="absolute -top-5 right-0 rounded bg-ink px-1.5 py-0.5 text-[10px] font-semibold text-white">{reference.label}</span>
          </div>
        )}
        {data.map((d, i) => {
          const hl = d.id === highlightId;
          return (
            <div
              key={d.id}
              className="relative flex h-full flex-1 items-end justify-center"
              onMouseMove={(e) =>
                show(
                  e,
                  <span>
                    <span className="font-semibold">{d.label}</span> · <span className="tabular">{d.value} days</span>
                  </span>,
                )
              }
              onMouseLeave={hide}
            >
              <motion.div
                className="w-full max-w-10 rounded-t-[4px]"
                style={{ background: hl ? "var(--color-s1)" : "#d6d5cd" }}
                initial={{ height: 0 }}
                animate={{ height: `${(d.value / max) * 100}%` }}
                transition={{ duration: 0.7, delay: i * 0.06, ease: EASE }}
              />
              {hl && (
                <motion.span
                  className="tabular absolute text-xs font-semibold text-ink"
                  style={{ bottom: `calc(${(d.value / max) * 100}% + 4px)` }}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  {d.value}d
                </motion.span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex gap-3 px-1">
        {data.map((d) => (
          <p key={d.id} className={cn("flex-1 truncate text-center text-[11px]", d.id === highlightId ? "font-semibold text-ink" : "text-muted")}>
            {d.label}
          </p>
        ))}
      </div>
      <ChartTooltip tip={tip} />
    </div>
  );
}

/* ---------------- Clock ring ---------------- */

export function ClockRing({
  elapsed,
  limit,
  label,
  sublabel,
  size = 148,
}: {
  elapsed: number;
  limit: number;
  label: string;
  sublabel: string;
  size?: number;
}) {
  const ratio = limit > 0 ? Math.min(1, Math.max(0, elapsed) / limit) : 0;
  const over = elapsed > limit;
  const near = !over && ratio >= 0.75;
  const color = over ? "var(--color-critical)" : near ? "var(--color-warning)" : "var(--color-good)";
  const StatusIcon = over ? XCircle : near ? AlertTriangle : CheckCircle2;
  const statusText = over ? `${elapsed - limit}d overdue` : near ? `${limit - elapsed}d left` : `${Math.max(0, limit - elapsed)}d left`;
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
          <circle cx="50" cy="50" r={r} fill="none" stroke="var(--color-hairline)" strokeWidth="7" />
          <motion.circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={c}
            initial={{ strokeDashoffset: c }}
            animate={{ strokeDashoffset: c * (1 - ratio) }}
            transition={{ duration: 1.1, ease: EASE }}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <div>
            <p className="tabular text-3xl font-semibold leading-none tracking-tight text-ink">{Math.max(0, elapsed)}</p>
            <p className="mt-1 text-[11px] text-muted">of {limit} days</p>
          </div>
        </div>
      </div>
      <p className="mt-3 text-sm font-semibold text-ink">{label}</p>
      <p className="text-xs text-ink-2">{sublabel}</p>
      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-black/[0.04] px-2 py-0.5 text-[11px] font-semibold text-ink-2">
        <StatusIcon className="size-3" style={{ color }} aria-hidden />
        {statusText}
      </span>
    </div>
  );
}

/* ---------------- 100% stacked bar ---------------- */

export function StackedBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const { ref, tip, show, hide } = useTip();
  const total = parts.reduce((s, p) => s + p.value, 0) || 1;
  return (
    <div ref={ref} className="relative">
      <div className="flex h-9 gap-[2px] overflow-hidden rounded-[6px]">
        {parts.map((p, i) => (
          <motion.div
            key={p.label}
            className="flex h-full items-center justify-center overflow-hidden"
            style={{ background: p.color }}
            initial={{ width: 0 }}
            animate={{ width: `${(p.value / total) * 100}%` }}
            transition={{ duration: 0.8, delay: i * 0.1, ease: EASE }}
            onMouseMove={(e) =>
              show(
                e,
                <span>
                  <span className="font-semibold">{p.label}</span> · <span className="tabular">{p.value} days</span>
                </span>,
              )
            }
            onMouseLeave={hide}
          >
            {p.value / total > 0.12 && (
              <span className={cn("tabular text-xs font-semibold", p.color === "var(--color-s4)" ? "text-ink" : "text-white")}>
                {Math.round((p.value / total) * 100)}%
              </span>
            )}
          </motion.div>
        ))}
      </div>
      <div className="mt-3">
        <Legend items={parts.map((p) => ({ label: p.label, color: p.color, value: `${p.value}d` }))} />
      </div>
      <ChartTooltip tip={tip} />
    </div>
  );
}

/* ---------------- Pipeline (cumulative stages) ---------------- */

export function PipelineSteps({ stages }: { stages: { label: string; days: number }[] }) {
  const max = stages[stages.length - 1]?.days ?? 1;
  return (
    <div className="relative pt-8">
      <div className="relative h-2 rounded-full bg-hairline">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#2a78d6] to-[#eb6834]"
          initial={{ width: 0 }}
          whileInView={{ width: "100%" }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: EASE }}
        />
        {stages.map((s, i) => (
          <motion.div
            key={s.label}
            className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${(s.days / max) * 100}%` }}
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 + i * 0.35, type: "spring", stiffness: 400, damping: 18 }}
          >
            <div className="size-4 rounded-full border-[3px] border-white bg-ink shadow" />
            <div className={cn("absolute top-6 w-24 text-center", i === stages.length - 1 ? "right-0 text-right" : "-translate-x-1/2 left-1/2")}>
              <p className="tabular text-sm font-semibold text-ink">{s.days}d</p>
              <p className="text-[11px] text-ink-2">{s.label}</p>
            </div>
          </motion.div>
        ))}
      </div>
      <div className="h-14" />
    </div>
  );
}

/* ---------------- Conflict Radar sweep ---------------- */

const RADAR_COLOR = {
  SUBSTANTIVE_CONFLICT: "var(--color-critical)",
  STALE_CITATION: "var(--color-warning)",
  NONE: "var(--color-good)",
} as const;
const RADAR_RING = { SUBSTANTIVE_CONFLICT: 0.3, STALE_CITATION: 0.6, NONE: 0.88 } as const;

export function RadarSweep({
  items,
  selectedId,
  onSelect,
}: {
  items: ChecklistItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { ref, tip, show, hide } = useTip();
  const R = 140;
  return (
    <div ref={ref} className="relative mx-auto aspect-square w-full max-w-[320px]">
      <svg viewBox={`${-R - 10} ${-R - 10} ${2 * R + 20} ${2 * R + 20}`} className="size-full" role="img" aria-label="Conflict radar: checklist items plotted by conflict severity">
        <defs>
          <radialGradient id="radar-bg">
            <stop offset="0%" stopColor="#13203d" />
            <stop offset="100%" stopColor="#0b1326" />
          </radialGradient>
          <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#3b6cf6" stopOpacity="0" />
            <stop offset="100%" stopColor="#3b6cf6" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <circle r={R} fill="url(#radar-bg)" />
        {[0.3, 0.6, 0.88].map((f) => (
          <circle key={f} r={R * f} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1" />
        ))}
        <line x1={-R} x2={R} y1={0} y2={0} stroke="rgba(255,255,255,0.08)" />
        <line y1={-R} y2={R} x1={0} x2={0} stroke="rgba(255,255,255,0.08)" />
        <motion.g animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }} style={{ originX: "0px", originY: "0px" }}>
          <path d={`M0 0 L${R} 0 A${R} ${R} 0 0 0 ${R * Math.cos(-Math.PI / 4)} ${R * Math.sin(-Math.PI / 4)} Z`} fill="url(#sweep)" />
        </motion.g>
        {items.map((it, i) => {
          const angle = (i / Math.max(1, items.length)) * Math.PI * 2 - Math.PI / 2 + 0.3;
          const rr = R * RADAR_RING[it.conflict_type];
          const x = Math.cos(angle) * rr;
          const y = Math.sin(angle) * rr;
          const color = RADAR_COLOR[it.conflict_type];
          const sel = selectedId === it.item_id;
          return (
            <g
              key={it.item_id}
              transform={`translate(${x} ${y})`}
              className="cursor-pointer"
              onClick={() => onSelect(it.item_id)}
              onMouseMove={(e) => show(e, <span className="font-semibold">{it.item_id} · {it.category}</span>)}
              onMouseLeave={hide}
              role="button"
              tabIndex={0}
              aria-label={`${it.item_id}: ${it.requirement_text}`}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(it.item_id);
              }}
            >
              {it.conflict_type === "SUBSTANTIVE_CONFLICT" && (
                <motion.circle
                  r={7}
                  fill="none"
                  stroke={color}
                  strokeWidth={2}
                  initial={{ scale: 1, opacity: 0.8 }}
                  animate={{ scale: 2.6, opacity: 0 }}
                  transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.25 }}
                />
              )}
              <circle r={14} fill="transparent" />
              <motion.circle
                r={sel ? 8 : 6}
                fill={color}
                stroke={sel ? "#fff" : "#0b1326"}
                strokeWidth={2}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 + i * 0.08, type: "spring", stiffness: 400, damping: 14 }}
              />
            </g>
          );
        })}
      </svg>
      <ChartTooltip tip={tip} />
    </div>
  );
}
