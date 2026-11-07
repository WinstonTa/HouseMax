"use client";

import { AnimatePresence, motion } from "motion/react";
import { CircleHelp, ShieldCheck, ShieldAlert } from "lucide-react";
import { VERDICT_META } from "@/lib/by-right-engine";
import { useProject } from "@/lib/store";
import type { Confidence, Evaluation, Verdict } from "@/lib/types";
import { cn } from "./ui/primitives";

const ICONS = { BY_RIGHT_LIKELY: ShieldCheck, DISCRETIONARY_LIKELY: ShieldAlert, CANT_TELL_YET: CircleHelp } as const;

const THEME: Record<Verdict, { chip: string; hero: string; glow: string; dot: string }> = {
  BY_RIGHT_LIKELY: {
    chip: "bg-[#0ca30c]/10 text-good-ink ring-[#0ca30c]/30",
    hero: "from-[#063d1f] via-[#0a5a32] to-[#0e7a44]",
    glow: "bg-[#2fe08a]",
    dot: "bg-good",
  },
  DISCRETIONARY_LIKELY: {
    chip: "bg-critical/10 text-[#a32626] ring-critical/30",
    hero: "from-[#3d0b0b] via-[#5e1414] to-[#8a2222]",
    glow: "bg-[#ff6b6b]",
    dot: "bg-critical",
  },
  CANT_TELL_YET: {
    chip: "bg-warning/15 text-[#7a5200] ring-warning/50",
    hero: "from-[#3a2a05] via-[#5a410a] to-[#7d5a0e]",
    glow: "bg-[#ffd25e]",
    dot: "bg-warning",
  },
};

const CONF_LEVEL: Record<Confidence, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };

export function VerdictChip({ verdict, confidence }: { verdict: Verdict; confidence: Confidence }) {
  const Icon = ICONS[verdict];
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.div
        key={verdict + confidence}
        initial={{ opacity: 0, scale: 0.85, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: 4 }}
        transition={{ type: "spring", stiffness: 420, damping: 28 }}
        className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset", THEME[verdict].chip)}
        aria-live="polite"
      >
        <Icon className="size-3.5" aria-hidden />
        <span>{VERDICT_META[verdict].label}</span>
        <span className="hidden font-medium opacity-70 sm:inline">· {confidence.toLowerCase()} confidence</span>
      </motion.div>
    </AnimatePresence>
  );
}

export function ConfidenceMeter({ confidence, dark = false }: { confidence: Confidence; dark?: boolean }) {
  const level = CONF_LEVEL[confidence];
  return (
    <div className="flex items-center gap-2" aria-label={`Evidence confidence ${confidence.toLowerCase()}`}>
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <motion.span
            key={i}
            className={cn("h-1.5 w-6 rounded-full", dark ? "bg-white/20" : "bg-black/10")}
            animate={{ backgroundColor: i <= level ? (dark ? "#ffffff" : "#2a78d6") : dark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.1)" }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
          />
        ))}
      </div>
      <span className={cn("text-xs font-semibold", dark ? "text-white" : "text-ink")}>{confidence}</span>
    </div>
  );
}

export function VerdictHero({ evaluation }: { evaluation: Evaluation }) {
  const { verdict, confidence, conditions } = evaluation;
  const Icon = ICONS[verdict];
  const t = THEME[verdict];
  const pass = conditions.filter((c) => c.status === "PASS").length;
  const fail = conditions.filter((c) => c.status === "FAIL" && c.blocking).length;
  const unknown = conditions.filter((c) => c.status === "UNKNOWN").length;

  const headline =
    verdict === "BY_RIGHT_LIKELY"
      ? "Likely eligible for ministerial review under the rules checked here: no hearing, no CEQA."
      : verdict === "DISCRETIONARY_LIKELY"
        ? `${fail} condition${fail === 1 ? "" : "s"} push this into discretionary review.`
        : `${evaluation.followUps.length} answer${evaluation.followUps.length === 1 ? "" : "s"} away from a verdict.`;

  return (
    <motion.div
      layout
      className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-xl md:p-7", t.hero)}
      animate={{ opacity: 1 }}
      transition={{ layout: { duration: 0.4 } }}
    >
      <motion.div
        key={verdict}
        className={cn("pointer-events-none absolute -right-16 -top-16 size-64 rounded-full opacity-30 blur-3xl", t.glow)}
        initial={{ scale: 0.4, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.35 }}
        transition={{ duration: 0.9 }}
      />
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
      <div className="relative flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={verdict}
              initial={{ scale: 0, rotate: -90 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 90 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur"
            >
              <Icon className="size-7" aria-hidden />
            </motion.div>
          </AnimatePresence>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">By-Right Pathway Verdict</p>
            <AnimatePresence mode="wait" initial={false}>
              <motion.h2
                key={verdict}
                initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: 0.3 }}
                className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl"
                aria-live="polite"
              >
                {VERDICT_META[verdict].label}
              </motion.h2>
            </AnimatePresence>
            <p className="mt-1.5 max-w-md text-sm text-white/80">{headline}</p>
            <EvaluationProvenance />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-2xl bg-black/15 px-5 py-4 ring-1 ring-white/10">
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-white/60">Evidence confidence</p>
            <ConfidenceMeter confidence={confidence} dark />
          </div>
          <div className="h-10 w-px bg-white/15" />
          <Tally label="Pass" value={pass} />
          <Tally label="Fail" value={fail} />
          <Tally label="Unknown" value={unknown} />
        </div>
      </div>
    </motion.div>
  );
}

/** Shows whether the verdict came from the backend (POST /api/evaluate) and how many of its sources are verified. */
function EvaluationProvenance() {
  const { evaluationSource, evaluationMeta } = useProject();
  const sources = evaluationMeta?.sources ?? [];
  const unverified = sources.filter((s) => s.status !== "VERIFIED").length;
  const origin =
    evaluationSource === "server"
      ? `Computed by backend · engine ${evaluationMeta?.engine_version ?? "?"}`
      : evaluationSource === "local-fallback"
        ? "Backend unreachable · computed in browser"
        : "Computing…";
  return (
    <p className="mt-2 text-[11px] text-white/60" data-testid="evaluation-provenance">
      {origin}
      {sources.length > 0 && ` · ${unverified} of ${sources.length} cited statutes not yet verified`}
    </p>
  );
}

function Tally({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.p
          key={value}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -12, opacity: 0 }}
          className="tabular text-2xl font-semibold leading-none"
        >
          {value}
        </motion.p>
      </AnimatePresence>
      <p className="mt-1 text-[11px] text-white/60">{label}</p>
    </div>
  );
}
