"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Calculator, CheckCircle2, LayoutTemplate, PartyPopper, Repeat2, Wand2, XCircle } from "lucide-react";
import { useState } from "react";
import { useProject } from "@/lib/store";
import { PLANS, getCity } from "@/lib/data";
import { VERDICT_META, carryingCost, evaluate, findFlips, reviewDays } from "@/lib/by-right-engine";
import { APPROVAL_MEDIANS, REVIEW_PENALTIES } from "@/lib/benchmarks";
import { usd } from "@/lib/format";
import type { ProjectInput, Verdict } from "@/lib/types";
import { Legend, TimelineBars, type TimelineRow } from "@/components/charts/Charts";
import { AnimatedNumber, Badge, Card, CardHeader, Disclaimer, NumberField, Page, PageTitle, cn, fadeUp, stagger } from "@/components/ui/primitives";

const SEG_COLORS = {
  base: "var(--color-s1)",
  PLANNING_COMMISSION: "var(--color-s2)",
  SITE_PLAN_REVIEW: "var(--color-s3)",
  EIR: "var(--color-s4)",
  COASTAL: "#898781",
} as const;

const fmtUsd = (n: number) => usd(n);

function VerdictPill({ verdict, label }: { verdict: Verdict; label: string }) {
  const tone = VERDICT_META[verdict].tone;
  const Icon = tone === "good" ? CheckCircle2 : XCircle;
  return (
    <div className="flex-1 rounded-2xl border border-hairline bg-white p-4 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={verdict}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className={cn(
            "mt-1.5 inline-flex items-center gap-1.5 text-lg font-semibold",
            tone === "good" ? "text-good-ink" : tone === "critical" ? "text-[#a32626]" : "text-[#7a5200]",
          )}
        >
          <Icon className="size-5" aria-hidden />
          {VERDICT_META[verdict].label}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export default function FlipPage() {
  const { project, evaluation, update, cost, setCost } = useProject();
  const city = getCity(project.cityId);
  const flips = findFlips(project);
  const [enabled, setEnabled] = useState<Record<string, boolean>>({});

  // Only flips that still exist for the current project count as enabled
  const activeFlips = flips.filter((f) => enabled[f.id] ?? true);
  const scenario: ProjectInput = activeFlips.reduce<ProjectInput>((acc, f) => ({ ...acc, ...f.patch }), project);
  const after = evaluate(scenario);

  const baseDays = project.type === "ADU_DETACHED" ? city.apr_median_days_adu : Math.round((APPROVAL_MEDIANS.ministerialLow + APPROVAL_MEDIANS.ministerialHigh) / 2);
  const baseSource = project.type === "ADU_DETACHED" ? `HCD APR median · ${city.name}` : "Ministerial median · LA baseline";

  const isDisc = evaluation.verdict === "DISCRETIONARY_LIKELY";
  const currentPenalty = reviewDays(evaluation.triggeredReviews);
  const afterPenalty = reviewDays(after.triggeredReviews);
  // When already by-right, show the value preserved vs. a Planning Commission hearing.
  const daysSaved = isDisc ? currentPenalty - afterPenalty : REVIEW_PENALTIES.PLANNING_COMMISSION.days ?? 0;
  const saved = carryingCost(daysSaved, cost.capital, cost.monthlyRatePct);
  const perHome = saved / Math.max(1, project.units);

  const designedSegments = [
    { label: baseSource, days: baseDays, color: SEG_COLORS.base },
    ...(isDisc ? evaluation.triggeredReviews : (["PLANNING_COMMISSION"] as const))
      .filter((r) => (REVIEW_PENALTIES[r].days ?? 0) > 0)
      .map((r) => ({ label: `${REVIEW_PENALTIES[r].label} (+${REVIEW_PENALTIES[r].days}d)`, days: REVIEW_PENALTIES[r].days ?? 0, color: SEG_COLORS[r] })),
  ];
  const flippedSegments = [
    { label: baseSource, days: baseDays, color: SEG_COLORS.base },
    ...after.triggeredReviews
      .filter((r) => (REVIEW_PENALTIES[r].days ?? 0) > 0)
      .map((r) => ({ label: REVIEW_PENALTIES[r].label, days: REVIEW_PENALTIES[r].days ?? 0, color: SEG_COLORS[r] })),
  ];
  const rows: TimelineRow[] = [
    { label: isDisc ? "As designed" : "If it hit a hearing", sublabel: isDisc ? "Discretionary path" : "Hypothetical", segments: designedSegments },
    { label: isDisc ? "With By-Right Flip" : "As designed", sublabel: "Ministerial path", segments: flippedSegments, emphasis: true },
  ];
  const legendKeys = [...new Map([...designedSegments, ...flippedSegments].map((s) => [s.color, s])).values()];

  const cityPlans = PLANS.filter((pl) => pl.city_id === project.cityId);

  return (
    <Page>
      <PageTitle
        eyebrow="Step 2 · Optimize"
        title="By-Right Flip & Cost of Discretion"
        description="The smallest design changes that avoid discretionary review — and what every hearing day costs you."
        right={
          project.type === "ADU_DETACHED" && !isDisc ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={() => update({ height: 19.5, transit: project.transit ?? true })}
              className="inline-flex items-center gap-2 rounded-xl border border-hairline bg-white px-4 py-2.5 text-sm font-semibold text-ink shadow-sm hover:bg-plane"
            >
              <Wand2 className="size-4 text-brand-600" /> Try a 19.5 ft design
            </motion.button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_380px]">
        <div className="space-y-5">
          <Card>
            <CardHeader title="By-Right Flip" subtitle="Toggle changes to see the verdict move." icon={Repeat2} />
            <div className="p-5">
              <div className="flex items-stretch gap-3">
                <VerdictPill verdict={evaluation.verdict} label="As designed" />
                <motion.div className="grid place-items-center" animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
                  <ArrowRight className="size-5 text-brand-500" />
                </motion.div>
                <VerdictPill verdict={after.verdict} label="With flips" />
              </div>

              <AnimatePresence mode="popLayout">
                {flips.length === 0 ? (
                  <motion.div key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5 flex items-start gap-3 rounded-xl bg-[#0ca30c]/[0.07] p-4">
                    <PartyPopper className="mt-0.5 size-5 shrink-0 text-good-ink" />
                    <div>
                      <p className="text-sm font-semibold text-ink">
                        {evaluation.verdict === "BY_RIGHT_LIKELY" ? "No flips needed — this design is already by-right." : "No design flips available yet."}
                      </p>
                      <p className="mt-0.5 text-xs text-ink-2">
                        {evaluation.verdict === "CANT_TELL_YET"
                          ? "Answer the open questions on the intake screen first."
                          : "Preserve it: keep design changes within the caps shown on the intake sliders."}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.ul key="list" variants={stagger} initial="hidden" animate="show" className="mt-5 space-y-2.5">
                    {flips.map((f) => {
                      const on = enabled[f.id] ?? true;
                      return (
                        <motion.li key={f.id} variants={fadeUp} layout>
                          <button
                            type="button"
                            role="switch"
                            aria-checked={on}
                            onClick={() => setEnabled((e) => ({ ...e, [f.id]: !on }))}
                            className={cn(
                              "flex w-full items-center gap-4 rounded-xl border p-4 text-left transition",
                              on ? "border-brand-500/40 bg-brand-50/60" : "border-hairline bg-white hover:bg-plane",
                            )}
                          >
                            <span className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", on ? "bg-brand-500" : "bg-black/15")}>
                              <motion.span
                                className="absolute top-1 size-4 rounded-full bg-white shadow"
                                animate={{ left: on ? 20 : 4 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-sm font-semibold text-ink">{f.label}</span>
                              <span className="block font-mono text-xs text-ink-2">{f.change}</span>
                              <span className="mt-1 block text-[11px] text-muted">Resolves: {f.resolves.join(", ")}</span>
                            </span>
                            {f.daysSaved > 0 && (
                              <Badge tone="brand" className="text-xs">
                                −{f.daysSaved} days
                              </Badge>
                            )}
                          </button>
                        </motion.li>
                      );
                    })}
                  </motion.ul>
                )}
              </AnimatePresence>

              {flips.length > 0 && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    update(activeFlips.reduce<Partial<ProjectInput>>((acc, f) => ({ ...acc, ...f.patch }), {}));
                    setEnabled({});
                  }}
                  disabled={activeFlips.length === 0}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Apply {activeFlips.length} flip{activeFlips.length === 1 ? "" : "s"} to project <ArrowRight className="size-4" />
                </motion.button>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Time to approval" subtitle="Ministerial baseline plus each discretionary review it would trigger" icon={Calculator} />
            <div className="p-5">
              <div className="mb-4">
                <Legend items={legendKeys.map((s) => ({ label: s.label, color: s.color }))} />
              </div>
              <TimelineBars rows={rows} />
              <Disclaimer>
                Review penalties: {REVIEW_PENALTIES.PLANNING_COMMISSION.source} — {REVIEW_PENALTIES.PLANNING_COMMISSION.origin}. Coastal permits have no published median and are excluded. Illustrative
                assumption, not a timeline guarantee.
              </Disclaimer>
            </div>
          </Card>

          <Card>
            <CardHeader title="Pre-Approved Plan Matcher" subtitle={`Standard plans for ${city.name} that skip bespoke plan check.`} icon={LayoutTemplate} />
            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
              {cityPlans.length === 0 && <p className="text-sm text-ink-2">No pre-approved plan catalog registered for {city.name}.</p>}
              {project.type !== "ADU_DETACHED" && cityPlans.length > 0 && <p className="text-sm text-ink-2 sm:col-span-2">Pre-approved catalogs cover ADUs only.</p>}
              {project.type === "ADU_DETACHED" &&
                cityPlans.map((pl, i) => {
                  const checks = [
                    { ok: project.lotArea >= pl.min_lot_area_sqft, text: `Lot ≥ ${pl.min_lot_area_sqft.toLocaleString("en-US")} sq ft` },
                    { ok: project.slopePct <= pl.max_slope_pct, text: `Slope ≤ ${pl.max_slope_pct}%` },
                    { ok: pl.footprint_width_ft <= project.lotWidth - 2 * project.sideSetback, text: `Fits ${pl.footprint_width_ft} ft wide` },
                  ];
                  const fit = checks.every((c) => c.ok);
                  const selected = project.preapprovedPlanId === pl.id;
                  return (
                    <motion.div
                      key={pl.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className={cn("rounded-xl border p-4", selected ? "border-brand-500 bg-brand-50/60" : "border-hairline bg-white")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[13.5px] font-semibold text-ink">{pl.name}</p>
                        {fit ? <Badge tone="good" icon={CheckCircle2}>Fits</Badge> : <Badge tone="critical" icon={XCircle}>No fit</Badge>}
                      </div>
                      <p className="tabular mt-1 text-xs text-ink-2">
                        {pl.sqft} sq ft · {pl.height_feet} ft · {pl.bedrooms === 0 ? "Studio" : `${pl.bedrooms} bed`}
                      </p>
                      <ul className="mt-2 space-y-0.5">
                        {checks.map((c) => (
                          <li key={c.text} className="flex items-center gap-1.5 text-[11px] text-ink-2">
                            {c.ok ? <CheckCircle2 className="size-3 text-good" /> : <XCircle className="size-3 text-critical" />}
                            {c.text}
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        disabled={!fit}
                        onClick={() =>
                          update(selected ? { preapprovedPlanId: null } : { preapprovedPlanId: pl.id, sqft: pl.sqft, height: pl.height_feet })
                        }
                        className="mt-3 w-full rounded-lg border border-hairline py-1.5 text-xs font-semibold text-ink transition hover:bg-plane disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {selected ? "Selected — click to clear" : "Use this plan"}
                      </button>
                    </motion.div>
                  );
                })}
            </div>
          </Card>
        </div>

        {/* Cost of Discretion */}
        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-[#0e1424] to-[#1d2b52] p-5 text-white">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">Cost of Discretion</p>
              <p className="mt-2 text-[40px] font-semibold leading-none tracking-tight">
                <AnimatedNumber value={saved} format={fmtUsd} />
              </p>
              <p className="mt-2 text-[13px] text-white/75">
                {isDisc ? "carrying cost avoided by flipping to by-right" : "carrying cost a single Planning Commission hearing would add"}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-[11px] text-white/60">Days avoided</p>
                  <p className="text-xl font-semibold">
                    <AnimatedNumber value={daysSaved} />
                  </p>
                </div>
                <div className="rounded-xl bg-white/10 p-3">
                  <p className="text-[11px] text-white/60">Per home</p>
                  <p className="text-xl font-semibold">
                    <AnimatedNumber value={perHome} format={fmtUsd} />
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <NumberField label="Project capital cost" unit="USD" step={10000} value={cost.capital} onChange={(capital) => setCost({ capital })} />
              <NumberField label="Monthly cost of capital" unit="% / mo" step={0.05} value={cost.monthlyRatePct} onChange={(monthlyRatePct) => setCost({ monthlyRatePct })} />
              <div className="rounded-xl bg-plane p-3 font-mono text-[11.5px] leading-relaxed text-ink-2">
                Carrying cost = Delay (months) × Capital × Monthly rate
                <br />= {(daysSaved / 30.4).toFixed(1)} × {usd(cost.capital)} × {cost.monthlyRatePct}%
              </div>
              <Disclaimer>Illustrative mock calculation. Delay inputs use LABCI/UCLA Los Angeles study figures.</Disclaimer>
            </div>
          </Card>
        </div>
      </div>
    </Page>
  );
}
