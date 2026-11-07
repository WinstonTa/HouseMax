"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  Building2,
  CalendarClock,
  ClipboardList,
  DollarSign,
  FileText,
  Flame,
  Landmark,
  Radar,
  Repeat2,
  ShieldAlert,
  Waves,
  Wallet,
} from "lucide-react";
import { useProject } from "@/lib/store";
import { getChecklist, getCity } from "@/lib/data";
import { applyAllFlips, carryingCost, evaluate, reviewDays } from "@/lib/by-right-engine";
import { APPROVAL_MEDIANS, PIPELINE_SOURCE, PIPELINE_STAGES } from "@/lib/benchmarks";
import { usd } from "@/lib/format";
import { VerdictHero } from "@/components/VerdictBanner";
import { PipelineSteps } from "@/components/charts/Charts";
import { AnimatedNumber, Badge, Card, CardHeader, Disclaimer, Page, PageTitle, Stat, fadeUp, stagger, type Tone } from "@/components/ui/primitives";

const STEPS = [
  { href: "/intake", icon: ClipboardList, title: "Intake & Verdict", body: "Answer a few parcel questions — the engine returns a three-state verdict instantly." },
  { href: "/conflicts", icon: Radar, title: "Conflict Radar", body: "See which city requirements are stale citations versus unlawful overreach." },
  { href: "/flip", icon: Repeat2, title: "By-Right Flip", body: "Find the smallest design change that avoids hearings — and what it saves." },
  { href: "/package", icon: FileText, title: "Submittal Package", body: "Pre-flight the checklist and export the audit-ready permit PDF." },
];

const fmtUsd = (n: number) => usd(n, true);

export default function Overview() {
  const { project, evaluation, cost, docsChecked } = useProject();
  const city = getCity(project.cityId);
  const checklist = getChecklist(city, project.type);
  const conflicts = checklist?.items.filter((i) => i.conflict_type === "SUBSTANTIVE_CONFLICT").length ?? 0;
  const stale = checklist?.items.filter((i) => i.conflict_type === "STALE_CITATION").length ?? 0;
  const docs = checklist?.required_documents ?? [];
  const docsDone = docs.filter((d) => docsChecked[d]).length;

  // Days avoided: discretionary path vs. ministerial path (after flips if needed)
  const flipped = evaluate(applyAllFlips(project));
  const currentPenalty = reviewDays(evaluation.triggeredReviews);
  const avoidable =
    evaluation.verdict === "DISCRETIONARY_LIKELY"
      ? currentPenalty - reviewDays(flipped.triggeredReviews)
      : APPROVAL_MEDIANS.discretionary - APPROVAL_MEDIANS.ministerialHigh;
  const saved = carryingCost(avoidable, cost.capital, cost.monthlyRatePct);

  const badges: { label: string; tone: Tone; icon: typeof Flame }[] = [
    {
      label: project.coastal === null ? "Coastal: unconfirmed" : project.coastal ? "Coastal Commission" : "No Coastal review",
      tone: project.coastal === null ? "warning" : project.coastal ? "critical" : "good",
      icon: Waves,
    },
    {
      label: project.fireZone === null ? "CalFire: unconfirmed" : project.fireZone === "NONE" ? "No CalFire FHSZ" : `CalFire ${project.fireZone === "VERY_HIGH" ? "VHFHSZ" : "High FHSZ"}`,
      tone: project.fireZone === null ? "warning" : project.fireZone === "NONE" ? "good" : project.fireZone === "VERY_HIGH" ? "critical" : "serious",
      icon: Flame,
    },
    {
      label: evaluation.triggeredReviews.includes("EIR") ? "CEQA EIR likely" : evaluation.verdict === "BY_RIGHT_LIKELY" ? "CEQA exempt (ministerial)" : "CEQA: depends on pathway",
      tone: evaluation.triggeredReviews.includes("EIR") ? "critical" : evaluation.verdict === "BY_RIGHT_LIKELY" ? "good" : "warning",
      icon: Landmark,
    },
    { label: project.type === "MISSING_MIDDLE" ? "Funding cutoff (demo): Jun 30, 2027" : "No funding deadline", tone: project.type === "MISSING_MIDDLE" ? "serious" : "neutral", icon: Wallet },
  ];

  return (
    <Page>
      <PageTitle
        eyebrow="Project dashboard"
        title={project.title}
        description="Can this project be approved by-right under current written statutes? Here is the answer, the evidence, and what it's worth."
        right={
          <Link
            href="/intake"
            className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black/80"
          >
            Edit intake <ArrowRight className="size-4" />
          </Link>
        }
      />

      <motion.div variants={fadeUp}>
        <VerdictHero evaluation={evaluation} />
      </motion.div>

      <motion.div variants={stagger} className="mt-3 flex flex-wrap gap-2">
        {badges.map((b) => (
          <motion.span key={b.label} variants={fadeUp}>
            <Badge tone={b.tone} icon={b.icon} className="px-2.5 py-1 text-xs">
              {b.label}
            </Badge>
          </motion.span>
        ))}
      </motion.div>

      <motion.div variants={stagger} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Review days avoidable" icon={CalendarClock} hint={<span>vs. discretionary pipeline · LA baseline</span>}>
          <AnimatedNumber value={avoidable} />
          <span className="ml-1 text-base font-medium text-muted">days</span>
        </Stat>
        <Stat label="Carrying cost avoided" icon={DollarSign} hint="Illustrative · capital × rate × months">
          <AnimatedNumber value={saved} format={fmtUsd} />
        </Stat>
        <Stat label="Unlawful requirements" icon={ShieldAlert} hint={`${stale} stale citation${stale === 1 ? "" : "s"} flagged separately`}>
          <AnimatedNumber value={conflicts} />
          <span className="ml-1 text-base font-medium text-muted">found</span>
        </Stat>
        <Stat label="Submittal completeness" icon={Building2} hint={`${docsDone} of ${docs.length} documents ready`}>
          <AnimatedNumber value={docs.length ? (docsDone / docs.length) * 100 : 0} />
          <span className="text-base font-medium text-muted">%</span>
        </Stat>
      </motion.div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Where California permits stall" subtitle="Median cumulative days through the review pipeline" icon={CalendarClock} />
          <div className="px-6 pb-4">
            <PipelineSteps stages={PIPELINE_STAGES} />
            <Disclaimer>Source: {PIPELINE_SOURCE}. Excludes non-profit developer tracks.</Disclaimer>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="By-right is ~40% faster" subtitle="Median approval days, Los Angeles baseline" icon={Repeat2} />
          <div className="space-y-4 px-5 pb-5 pt-4">
            {[
              { label: "Ministerial", value: APPROVAL_MEDIANS.ministerialHigh, note: `${APPROVAL_MEDIANS.ministerialLow}–${APPROVAL_MEDIANS.ministerialHigh}`, color: "var(--color-s1)" },
              { label: "Discretionary", value: APPROVAL_MEDIANS.discretionary, note: `${APPROVAL_MEDIANS.discretionary}`, color: "#c3c2b7" },
            ].map((r, i) => (
              <div key={r.label}>
                <div className="mb-1 flex justify-between text-[13px]">
                  <span className="font-medium text-ink">{r.label}</span>
                  <span className="tabular text-ink-2">{r.note} days</span>
                </div>
                <div className="h-3 rounded-full bg-black/[0.04]">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: r.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${(r.value / 800) * 100}%` }}
                    transition={{ duration: 0.9, delay: 0.2 + i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            ))}
            <Disclaimer>Source: {APPROVAL_MEDIANS.source}. Los Angeles data; applied to Orange County as an illustrative assumption.</Disclaimer>
          </div>
        </Card>
      </div>

      <motion.h2 variants={fadeUp} className="mb-3 mt-8 text-sm font-semibold uppercase tracking-[0.12em] text-ink-2">
        Demo walkthrough
      </motion.h2>
      <motion.div variants={stagger} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((s, i) => (
          <motion.div key={s.href} variants={fadeUp} whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 400, damping: 25 }}>
            <Link
              href={s.href}
              className="group flex h-full flex-col rounded-2xl border border-black/[0.07] bg-surface p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:border-brand-500/30 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-600">
                  <s.icon className="size-4.5" aria-hidden />
                </div>
                <span className="text-xs font-semibold text-muted">0{i + 1}</span>
              </div>
              <p className="mt-4 font-semibold text-ink">{s.title}</p>
              <p className="mt-1 flex-1 text-[13px] leading-relaxed text-ink-2">{s.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600">
                Open <ArrowRight className="size-3.5 transition group-hover:translate-x-1" />
              </span>
            </Link>
          </motion.div>
        ))}
      </motion.div>

      <motion.p variants={fadeUp} className="mt-8 text-center text-[11px] text-muted">
        {city.name} · {city.county} · Housing Element: {city.hcd_housing_element_status} · Checklist {checklist?.checklist_id ?? "not yet registered"}
      </motion.p>
    </Page>
  );
}
