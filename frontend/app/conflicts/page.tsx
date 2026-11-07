"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, CheckCircle2, ExternalLink, FileWarning, Gavel, Inbox, Radar, ScanSearch, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useProject } from "@/lib/store";
import { getChecklist, getCity } from "@/lib/data";
import type { ConflictType, DiscretionTrigger } from "@/lib/types";
import { RadarSweep } from "@/components/charts/Charts";
import { AnimatedNumber, Badge, Card, CardHeader, Page, PageTitle, Segmented, cn, fadeUp, stagger } from "@/components/ui/primitives";

const TYPE_META: Record<ConflictType, { label: string; tone: "critical" | "warning" | "good"; icon: typeof ShieldAlert; desc: string }> = {
  SUBSTANTIVE_CONFLICT: { label: "Substantive conflict", tone: "critical", icon: ShieldAlert, desc: "Local rule imposes a condition barred by state law — preempted." },
  STALE_CITATION: { label: "Stale citation", tone: "warning", icon: FileWarning, desc: "Renumbered code with identical legal effect — harmless, update citation." },
  NONE: { label: "Compliant", tone: "good", icon: ShieldCheck, desc: "Matches state law." },
};

const TRIGGERS: { key: DiscretionTrigger; label: string }[] = [
  { key: "HOA_SIGNOFF", label: "Mandatory HOA sign-off" },
  { key: "SITE_DEVELOPMENT_PERMIT", label: "Discretionary Site Development Permit" },
  { key: "AESTHETIC_GUIDELINE", label: "Unquantified design / aesthetic review" },
  { key: "TRAFFIC_STUDY", label: "Ad-hoc traffic study" },
  { key: "PUBLIC_HEARING", label: "Public hearing requirement" },
  { key: "OWNER_OCCUPANCY", label: "Owner-occupancy mandate" },
];

type Filter = "ALL" | ConflictType;

export default function ConflictsPage() {
  const { project } = useProject();
  const city = getCity(project.cityId);
  const checklist = getChecklist(city, project.type);
  const items = checklist?.items ?? [];
  const [filter, setFilter] = useState<Filter>("ALL");
  const [selected, setSelected] = useState<string | null>(null);

  const visible = items.filter((i) => filter === "ALL" || i.conflict_type === filter);
  const active = items.find((i) => i.item_id === selected) ?? items.find((i) => i.conflict_type === "SUBSTANTIVE_CONFLICT") ?? items[0] ?? null;
  const count = (t: ConflictType) => items.filter((i) => i.conflict_type === t).length;

  if (!checklist) {
    return (
      <Page>
        <PageTitle eyebrow="Step 2 · Audit" title="Conflict Radar" description="Cross-references every city checklist clause against California statutes and HCD enforcement." />
        <Card className="grid place-items-center p-12 text-center">
          <Inbox className="size-10 text-muted" />
          <p className="mt-3 font-semibold text-ink">No {project.type === "ADU_DETACHED" ? "ADU" : "missing-middle"} checklist registered for {city.name} yet</p>
          <p className="mt-1 max-w-md text-sm text-ink-2">Switch the city on the intake screen, or contribute this checklist to the Open Requirements Registry.</p>
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <PageTitle
        eyebrow="Step 2 · Audit"
        title="Conflict Radar"
        description={`Every clause of ${city.name}'s ${checklist.checklist_id} checklist, tested against state law and HCD enforcement letters.`}
        right={
          <Segmented<Filter>
            id="cfilter"
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { label: `All ${items.length}`, value: "ALL" },
              { label: `Conflicts ${count("SUBSTANTIVE_CONFLICT")}`, value: "SUBSTANTIVE_CONFLICT" },
              { label: `Stale ${count("STALE_CITATION")}`, value: "STALE_CITATION" },
              { label: `OK ${count("NONE")}`, value: "NONE" },
            ]}
          />
        }
      />

      {checklist.status !== "VERIFIED" && (
        <div role="note" className="rounded-xl bg-warning/15 px-4 py-3 text-[13px] font-medium text-[#7a5200] ring-1 ring-inset ring-warning/50">
          ILLUSTRATIVE CHECKLIST · {checklist.status_note}
        </div>
      )}

      <motion.div variants={stagger} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {(["SUBSTANTIVE_CONFLICT", "STALE_CITATION", "NONE"] as ConflictType[]).map((t) => {
          const m = TYPE_META[t];
          return (
            <Card key={t} className="flex items-center gap-4 p-5">
              <div
                className={cn(
                  "grid size-11 place-items-center rounded-xl",
                  t === "SUBSTANTIVE_CONFLICT" ? "bg-critical/10 text-critical" : t === "STALE_CITATION" ? "bg-warning/15 text-[#a06c00]" : "bg-[#0ca30c]/10 text-good-ink",
                )}
              >
                <m.icon className="size-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-[28px] font-semibold leading-none text-ink">
                  <AnimatedNumber value={count(t)} />
                </p>
                <p className="mt-1 text-[13px] font-medium text-ink">{m.label}</p>
                <p className="text-[11px] leading-snug text-ink-2">{m.desc}</p>
              </div>
            </Card>
          );
        })}
      </motion.div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[360px_1fr]">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Radar className="size-4 text-brand-600" />
            <p className="text-[15px] font-semibold text-ink">Live scan</p>
          </div>
          <RadarSweep items={items} selectedId={active?.item_id ?? null} onSelect={setSelected} />
          <ul className="mt-4 space-y-1.5 text-xs text-ink-2">
            <li className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-critical" /> Inner ring — substantive conflict</li>
            <li className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-warning" /> Middle ring — stale citation</li>
            <li className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-good" /> Outer ring — compliant</li>
          </ul>
        </Card>

        <div className="space-y-5">
          <AnimatePresence mode="wait">
            {active && (
              <motion.div key={active.item_id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}>
                <Card className="overflow-hidden">
                  <div
                    className={cn(
                      "h-1.5",
                      active.conflict_type === "SUBSTANTIVE_CONFLICT" ? "bg-critical" : active.conflict_type === "STALE_CITATION" ? "bg-warning" : "bg-good",
                    )}
                  />
                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={TYPE_META[active.conflict_type].tone} icon={TYPE_META[active.conflict_type].icon}>
                        {TYPE_META[active.conflict_type].label}
                      </Badge>
                      <Badge>{active.category}</Badge>
                      <span className="font-mono text-[11px] text-muted">{active.item_id}</span>
                    </div>
                    <p className="mt-3 text-lg font-semibold leading-snug text-ink">“{active.requirement_text}”</p>
                    <p className="mt-1 text-xs text-ink-2">
                      {checklist.status === "VERIFIED"
                        ? `— ${city.name} checklist, verified ${checklist.last_verified} by ${checklist.verified_by}`
                        : `— ILLUSTRATIVE example, not taken from ${city.name}'s actual checklist`}
                    </p>

                    <div className="mt-5 grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
                      <div className="rounded-xl bg-plane p-3 ring-1 ring-hairline">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Cited by city</p>
                        <p className={cn("mt-1 font-mono text-[12.5px]", active.legacy_citation !== "None" && active.legacy_citation !== active.governing_state_statute ? "text-ink-2 line-through decoration-critical/60" : "text-ink")}>
                          {active.legacy_citation === "None" ? "No citation" : active.legacy_citation}
                        </p>
                      </div>
                      <motion.div initial={{ x: -6, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2, repeat: 1, repeatType: "reverse", duration: 0.5 }} className="hidden justify-center sm:flex">
                        <ArrowRight className="size-5 text-brand-500" />
                      </motion.div>
                      <div className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-500/20">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-700/70">Governing state law</p>
                        <p className="mt-1 font-mono text-[12.5px] font-semibold text-brand-700">{active.governing_state_statute}</p>
                      </div>
                    </div>

                    <div
                      className={cn(
                        "mt-4 flex gap-3 rounded-xl p-4",
                        active.conflict_type === "SUBSTANTIVE_CONFLICT" ? "bg-critical/[0.07]" : active.conflict_type === "STALE_CITATION" ? "bg-warning/10" : "bg-[#0ca30c]/[0.07]",
                      )}
                    >
                      <Gavel className="mt-0.5 size-4 shrink-0 text-ink-2" />
                      <p className="text-[13.5px] leading-relaxed text-ink">{active.statutory_note}</p>
                    </div>

                    {active.precedent && (
                      <a
                        href="https://www.hcd.ca.gov/"
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-600 hover:underline"
                      >
                        Enforcement precedent: {active.precedent} <ExternalLink className="size-3.5" />
                      </a>
                    )}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Card>
            <CardHeader title="All checklist clauses" subtitle="Click a row or a radar blip to inspect it." />
            <motion.ul layout className="divide-y divide-hairline px-2 pb-2 pt-3">
              <AnimatePresence initial={false}>
                {visible.map((it) => {
                  const m = TYPE_META[it.conflict_type];
                  const isActive = active?.item_id === it.item_id;
                  return (
                    <motion.li key={it.item_id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <button
                        type="button"
                        onClick={() => setSelected(it.item_id)}
                        className={cn("flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition", isActive ? "bg-brand-50" : "hover:bg-black/[0.025]")}
                      >
                        <m.icon
                          className={cn("mt-0.5 size-4 shrink-0", it.conflict_type === "SUBSTANTIVE_CONFLICT" ? "text-critical" : it.conflict_type === "STALE_CITATION" ? "text-[#c58a00]" : "text-good")}
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13.5px] text-ink">{it.requirement_text}</span>
                          <span className="mt-0.5 block text-[11px] text-muted">
                            {m.label} · {it.category}
                          </span>
                        </span>
                      </button>
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </motion.ul>
          </Card>
        </div>
      </div>

      {/* Discretion Detector */}
      <Card className="mt-5">
        <CardHeader title="Discretion Detector" subtitle="Subjective procedural traps that illegally turn a ministerial project discretionary." icon={ScanSearch} />
        <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          {TRIGGERS.map((t) => {
            const hit = items.find((i) => i.discretion_trigger === t.key);
            const lawful = hit?.conflict_type === "NONE";
            return (
              <motion.div
                key={t.key}
                variants={fadeUp}
                className={cn("rounded-xl border p-4", hit && !lawful ? "border-critical/30 bg-critical/[0.04]" : "border-hairline bg-white")}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13.5px] font-semibold text-ink">{t.label}</p>
                  {hit && !lawful ? (
                    <Badge tone="critical" icon={ShieldAlert}>Detected</Badge>
                  ) : (
                    <Badge tone="good" icon={CheckCircle2}>Clear</Badge>
                  )}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-2">
                  {hit && !lawful ? `${hit.item_id}: ${hit.requirement_text}` : "Not found in this checklist."}
                </p>
              </motion.div>
            );
          })}
        </motion.div>
        {city.active_hcd_letters.length > 0 && (
          <div className="border-t border-hairline px-5 py-4">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Active HCD letters · {city.name}</p>
            {city.active_hcd_letters.map((l) => (
              <a key={l.reference_url} href={l.reference_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[13px] text-brand-600 hover:underline">
                <ExternalLink className="size-3.5" /> {l.issue_date} — {l.topic}
              </a>
            ))}
          </div>
        )}
      </Card>
    </Page>
  );
}
