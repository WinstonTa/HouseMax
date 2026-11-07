"use client";

import { animate, motion, useInView, type HTMLMotionProps } from "motion/react";
import { AlertTriangle, CheckCircle2, CircleHelp, MinusCircle, XCircle, type LucideIcon } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import type { ConditionStatus } from "@/lib/types";

export function cn(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export function Card({ className, children, ...rest }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        "rounded-2xl border border-black/[0.07] bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_-12px_rgba(0,0,0,0.08)]",
        className,
      )}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({
  title,
  subtitle,
  icon: Icon,
  right,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-5 pt-5">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600">
            <Icon className="size-4" aria-hidden />
          </div>
        )}
        <div>
          <h3 className="text-[15px] font-semibold tracking-tight text-ink">{title}</h3>
          {subtitle && <p className="mt-0.5 text-[13px] leading-snug text-ink-2">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return (
    <motion.div variants={stagger} initial="hidden" animate="show" className="mx-auto w-full max-w-7xl px-5 py-6 md:px-8 md:py-8">
      {children}
    </motion.div>
  );
}

export function PageTitle({ eyebrow, title, description, right }: { eyebrow: string; title: string; description: string; right?: ReactNode }) {
  return (
    <motion.div variants={fadeUp} className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-600">{eyebrow}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink md:text-[28px]">{title}</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-2">{description}</p>
      </div>
      {right}
    </motion.div>
  );
}

const STATUS_META: Record<ConditionStatus, { label: string; icon: LucideIcon; cls: string }> = {
  PASS: { label: "Pass", icon: CheckCircle2, cls: "bg-[#0ca30c]/10 text-good-ink ring-[#0ca30c]/25" },
  FAIL: { label: "Fail", icon: XCircle, cls: "bg-critical/10 text-[#a32626] ring-critical/25" },
  UNKNOWN: { label: "Unknown", icon: CircleHelp, cls: "bg-warning/15 text-[#7a5200] ring-warning/40" },
  NA: { label: "N/A", icon: MinusCircle, cls: "bg-black/5 text-ink-2 ring-black/10" },
};

export function StatusPill({ status, className }: { status: ConditionStatus; className?: string }) {
  const m = STATUS_META[status];
  const Icon = m.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", m.cls, className)}>
      <Icon className="size-3" aria-hidden />
      {m.label}
    </span>
  );
}

export type Tone = "good" | "critical" | "warning" | "neutral" | "brand" | "serious";
const TONE: Record<Tone, string> = {
  good: "bg-[#0ca30c]/10 text-good-ink ring-[#0ca30c]/25",
  critical: "bg-critical/10 text-[#a32626] ring-critical/25",
  warning: "bg-warning/15 text-[#7a5200] ring-warning/40",
  serious: "bg-serious/15 text-[#8a3a17] ring-serious/35",
  neutral: "bg-black/[0.04] text-ink-2 ring-black/10",
  brand: "bg-brand-50 text-brand-700 ring-brand-500/20",
};

export function Badge({ tone = "neutral", icon: Icon, children, className }: { tone?: Tone; icon?: LucideIcon; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset", TONE[tone], className)}>
      {Icon && <Icon className="size-3" aria-hidden />}
      {children}
    </span>
  );
}

export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString("en-US"), className }: { value: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(0);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const node = ref.current;
    if (!node) return;
    const controls = animate(prev.current, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => {
        node.textContent = format(v);
      },
    });
    prev.current = value;
    return () => controls.stop();
  }, [value, inView, format]);

  return (
    <span ref={ref} className={cn("tabular", className)}>
      {format(value)}
    </span>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  id,
  size = "md",
}: {
  value: T;
  options: { label: string; value: T }[];
  onChange: (v: T) => void;
  id: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" className="inline-flex rounded-xl bg-black/[0.05] p-1">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              "relative rounded-lg font-medium transition-colors focus-visible:outline-2 focus-visible:outline-brand-500",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-[13px]",
              active ? "text-ink" : "text-ink-2 hover:text-ink",
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 rounded-lg bg-white shadow-sm ring-1 ring-black/5"
                transition={{ type: "spring", stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  marker,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
  marker?: { value: number; label: string };
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const markerPct = marker ? ((marker.value - min) / (max - min)) * 100 : null;
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[13px] font-medium text-ink-2">{label}</span>
        <span className="tabular text-sm font-semibold text-ink">
          {value.toLocaleString("en-US")}
          {unit && <span className="ml-0.5 text-xs font-normal text-muted">{unit}</span>}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          className="slider w-full"
          min={min}
          max={max}
          step={step}
          value={value}
          style={{ ["--fill" as string]: `${pct}%` }}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        {markerPct !== null && markerPct >= 0 && markerPct <= 100 && (
          <div className="pointer-events-none absolute -bottom-4 -translate-x-1/2 text-[10px] font-medium text-muted" style={{ left: `${markerPct}%` }}>
            ▲ {marker?.label}
          </div>
        )}
      </div>
    </label>
  );
}

export function NumberField({ label, value, onChange, unit, min = 0, step = 1 }: { label: string; value: number; onChange: (v: number) => void; unit?: string; min?: number; step?: number }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      <div className="flex items-center rounded-xl border border-hairline bg-white px-3 transition focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        <input
          type="number"
          inputMode="decimal"
          min={min}
          step={step}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => {
            const n = Number(e.target.value);
            onChange(Number.isFinite(n) ? Math.max(min, n) : min);
          }}
          className="tabular w-full bg-transparent py-2 text-sm text-ink outline-none"
        />
        {unit && <span className="text-xs text-muted">{unit}</span>}
      </div>
    </label>
  );
}

export function TextField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
      />
    </label>
  );
}

export function Disclaimer({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-[11px] leading-snug text-muted">
      <AlertTriangle className="mt-px size-3 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

export function Stat({ label, children, hint, icon: Icon }: { label: string; children: ReactNode; hint?: ReactNode; icon?: LucideIcon }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-ink-2">{label}</p>
        {Icon && <Icon className="size-4 text-muted" aria-hidden />}
      </div>
      <div className="mt-2 text-[28px] font-semibold leading-none tracking-tight text-ink">{children}</div>
      {hint && <div className="mt-2 text-xs text-ink-2">{hint}</div>}
    </Card>
  );
}
