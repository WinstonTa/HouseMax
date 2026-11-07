"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { Home, Layers, ListChecks, MapPin, MessageCircleQuestion, Ruler, Sparkles, TrainFront } from "lucide-react";
import { useProject } from "@/lib/store";
import { CITIES, getRegulation } from "@/lib/data";
import type { DataSource, ExistingStructure, FireZone, FollowUpField, ProjectInput, ProjectType } from "@/lib/types";
import { VerdictHero } from "@/components/VerdictBanner";
import { Badge, Card, CardHeader, NumberField, Page, PageTitle, Segmented, Slider, StatusPill, TextField, cn, fadeUp } from "@/components/ui/primitives";

type Tri = "yes" | "no" | "unknown";
const toTri = (v: boolean | null): Tri => (v === null ? "unknown" : v ? "yes" : "no");
const fromTri = (t: Tri): boolean | null => (t === "unknown" ? null : t === "yes");
const TRI_OPTS: { label: string; value: Tri }[] = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
  { label: "Unknown", value: "unknown" },
];

function Row({ label, hint, children, highlight }: { label: string; hint?: string; children: ReactNode; highlight?: boolean }) {
  return (
    <motion.div
      layout
      className={cn(
        "flex flex-col gap-2 rounded-xl px-3 py-2.5 transition-colors sm:flex-row sm:items-center sm:justify-between",
        highlight ? "bg-warning/10 ring-1 ring-warning/40" : "",
      )}
    >
      <div>
        <p className="text-[13.5px] font-medium text-ink">{label}</p>
        {hint && <p className="text-xs text-ink-2">{hint}</p>}
      </div>
      {children}
    </motion.div>
  );
}

function applyAnswer(field: FollowUpField, value: string): Partial<ProjectInput> {
  switch (field) {
    case "transit":
      return { transit: value === "true" };
    case "coastal":
      return { coastal: value === "true" };
    case "fireZone":
      return { fireZone: value as FireZone };
    case "existing":
      return { existing: value as ExistingStructure };
  }
}

export default function IntakePage() {
  const { project: p, evaluation: ev, update } = useProject();
  const unknownFields = new Set(ev.followUps.map((f) => f.field));
  const isAdu = p.type === "ADU_DETACHED";

  return (
    <Page>
      <PageTitle
        eyebrow="Step 1 · Universal intake"
        title="Intake & By-Right Verdict"
        description="Every answer re-runs the rule checklist against state housing law. Unknowns are fine — the engine tells you which ones matter most."
      />

      <motion.div variants={fadeUp} className="mb-6">
        <VerdictHero evaluation={ev} />
      </motion.div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_400px]">
        {/* ---------- Form ---------- */}
        <div className="space-y-5">
          <Card>
            <CardHeader title="Project & jurisdiction" icon={MapPin} subtitle="Typology determines which statutes apply." />
            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Housing typology</span>
                <Segmented<ProjectType>
                  id="ptype"
                  value={p.type}
                  onChange={(type) =>
                    update(
                      type === "ADU_DETACHED"
                        ? { type, units: Math.min(p.units, 2), height: Math.min(p.height, 20), sqft: Math.min(p.sqft, 1400) }
                        : { type, units: Math.max(p.units, 4), height: Math.max(p.height, 24) },
                    )
                  }
                  options={[
                    { label: "Detached ADU", value: "ADU_DETACHED" },
                    { label: "Missing-middle (4–12)", value: "MISSING_MIDDLE" },
                  ]}
                />
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-ink-2">City</span>
                <select
                  value={p.cityId}
                  onChange={(e) => update({ cityId: e.target.value })}
                  className="w-full rounded-xl border border-hairline bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                >
                  {CITIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.county}
                    </option>
                  ))}
                </select>
              </label>
              <TextField label="APN" value={p.apn} onChange={(apn) => update({ apn })} />
              <div className="sm:col-span-2">
                <TextField label="Address" value={p.address} onChange={(address) => update({ address })} />
              </div>
              <NumberField label="Lot area" unit="sq ft" value={p.lotArea} onChange={(lotArea) => update({ lotArea })} />
              <div>
                <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Data source</span>
                <Segmented<DataSource>
                  id="dsrc"
                  size="sm"
                  value={p.dataSource}
                  onChange={(dataSource) => update({ dataSource })}
                  options={[
                    { label: "Verified", value: "VERIFIED" },
                    { label: "Uploaded PDF", value: "UPLOADED" },
                    { label: "Self-reported", value: "SELF_REPORTED" },
                  ]}
                />
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Parcel conditions" icon={TrainFront} subtitle="These facts unlock or block state-law overrides." />
            <div className="space-y-1 p-3">
              <Row label="Within ½ mile of major transit" hint="ADU: 18 ft guaranteed height (§ 66321(b)(4)(B)) and no parking standards (§ 66322(a)(1)). Multifamily: AB 2097." highlight={unknownFields.has("transit")}>
                <Segmented<Tri> id="transit" size="sm" value={toTri(p.transit)} onChange={(t) => update({ transit: fromTri(t) })} options={TRI_OPTS} />
              </Row>
              <Row label="In California Coastal Zone" hint="May require a Coastal Development Permit" highlight={unknownFields.has("coastal")}>
                <Segmented<Tri> id="coastal" size="sm" value={toTri(p.coastal)} onChange={(t) => update({ coastal: fromTri(t) })} options={TRI_OPTS} />
              </Row>
              <Row label="CalFire hazard severity zone" highlight={unknownFields.has("fireZone")}>
                <Segmented<FireZone | "UNKNOWN">
                  id="fire"
                  size="sm"
                  value={p.fireZone ?? "UNKNOWN"}
                  onChange={(v) => update({ fireZone: v === "UNKNOWN" ? null : v })}
                  options={[
                    { label: "None", value: "NONE" },
                    { label: "High", value: "HIGH" },
                    { label: "Very high", value: "VERY_HIGH" },
                    { label: "Unknown", value: "UNKNOWN" },
                  ]}
                />
              </Row>
              <Row label="Existing structures" highlight={unknownFields.has("existing")}>
                <Segmented<ExistingStructure | "UNKNOWN">
                  id="existing"
                  size="sm"
                  value={p.existing ?? "UNKNOWN"}
                  onChange={(v) => update({ existing: v === "UNKNOWN" ? null : v })}
                  options={[
                    { label: "SFR", value: "SINGLE_FAMILY_RESIDENCE" },
                    { label: "Multifamily", value: "MULTIFAMILY" },
                    { label: "Vacant", value: "VACANT" },
                    { label: "Unknown", value: "UNKNOWN" },
                  ]}
                />
              </Row>
            </div>
          </Card>

          <Card>
            <CardHeader title="Proposed design" icon={Ruler} subtitle="Drag to test — the verdict updates live." />
            <div className="grid grid-cols-1 gap-x-8 gap-y-7 p-5 pb-8 sm:grid-cols-2">
              <Slider
                label="Units"
                value={p.units}
                min={1}
                max={isAdu ? 4 : 16}
                onChange={(units) => update({ units })}
                marker={isAdu ? { value: 2, label: "ADU+JADU" } : { value: 10, label: "SB 684 cap" }}
              />
              <Slider
                label="Height"
                unit="ft"
                step={0.5}
                value={p.height}
                min={isAdu ? 10 : 20}
                max={isAdu ? 24 : 48}
                onChange={(height) => update({ height })}
                marker={isAdu ? { value: p.transit ? 18 : 16, label: p.transit ? "18 ft transit cap" : "16 ft cap" } : { value: 35, label: "35 ft zone cap" }}
              />
              <Slider
                label={isAdu ? "Floor area" : "Avg. unit size"}
                unit="sq ft"
                step={25}
                value={p.sqft}
                min={300}
                max={isAdu ? 1600 : 2000}
                onChange={(sqft) => update({ sqft })}
                marker={isAdu ? { value: 1200, label: "1,200 cap" } : undefined}
              />
              <Slider label="Parking spaces" value={p.parking} min={0} max={isAdu ? 3 : 20} onChange={(parking) => update({ parking })} />
              <Slider label="Rear setback" unit="ft" value={p.rearSetback} min={0} max={20} onChange={(rearSetback) => update({ rearSetback })} marker={isAdu ? { value: 4, label: "4 ft" } : undefined} />
              <Slider label="Side setback" unit="ft" value={p.sideSetback} min={0} max={20} onChange={(sideSetback) => update({ sideSetback })} marker={isAdu ? { value: 4, label: "4 ft" } : undefined} />
              {!isAdu && (
                <Slider label="Deed-restricted affordable" unit="%" value={p.affordablePct} min={0} max={100} step={5} onChange={(affordablePct) => update({ affordablePct })} marker={{ value: 10, label: "SB 423" }} />
              )}
            </div>
          </Card>
        </div>

        {/* ---------- Live results ---------- */}
        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <AnimatePresence initial={false}>
            {ev.followUps.length > 0 && (
              <motion.div
                key="followups"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <Card className="border-warning/40">
                  <CardHeader title="Answer these first" subtitle="Ranked by how many blocking conditions each unlocks." icon={MessageCircleQuestion} />
                  <div className="space-y-3 p-5">
                    <AnimatePresence mode="popLayout">
                      {ev.followUps.map((q, i) => (
                        <motion.div
                          key={q.field}
                          layout
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                          className="rounded-xl border border-hairline bg-white p-3.5"
                        >
                          <div className="flex items-start gap-2">
                            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-ink text-[10px] font-bold text-white">{i + 1}</span>
                            <div className="min-w-0">
                              <p className="text-[13.5px] font-semibold text-ink">{q.question}</p>
                              <p className="mt-0.5 text-xs text-ink-2">{q.why}</p>
                              {q.blocks > 0 && <Badge tone="warning" className="mt-1.5">Blocks {q.blocks} condition{q.blocks === 1 ? "" : "s"}</Badge>}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 pl-7">
                            {q.options.map((o) => (
                              <motion.button
                                key={o.value}
                                type="button"
                                whileTap={{ scale: 0.95 }}
                                onClick={() => update(applyAnswer(q.field, o.value))}
                                className="rounded-lg border border-hairline bg-plane px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
                              >
                                {o.label}
                              </motion.button>
                            ))}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Card>
            <CardHeader title="Rule checklist evaluation" subtitle={isAdu ? "Gov. Code §§ 66310–66342 · AB 2097" : "SB 684 · SB 35/423 · AB 2097"} icon={ListChecks} />
            <ul className="divide-y divide-hairline px-5 pb-3 pt-2">
              {ev.conditions.map((c) => (
                <motion.li key={c.id} layout className="flex items-start gap-3 py-3">
                  <div className="mt-0.5 w-[78px] shrink-0">
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.div key={c.status} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ duration: 0.18 }}>
                        <StatusPill status={c.status} />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-medium text-ink">
                      {c.label}
                      {!c.blocking && <span className="ml-1.5 text-[11px] font-normal text-muted">advisory</span>}
                    </p>
                    <p className="text-xs leading-relaxed text-ink-2">{c.detail}</p>
                    <p className="mt-0.5 font-mono text-[10.5px] text-muted">{c.statute}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </Card>

          <AnimatePresence>
            {ev.appliedOverrides.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}>
                <Card className="overflow-hidden">
                  <CardHeader title="State-law overrides applied" icon={Sparkles} subtitle="These statutes preempt stricter local rules." />
                  <div className="space-y-2 p-5">
                    {ev.appliedOverrides.map((id) => {
                      const r = getRegulation(id);
                      if (!r) return null;
                      return (
                        <motion.div key={id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl bg-brand-50 p-3 ring-1 ring-brand-500/15">
                          <p className="text-[13px] font-semibold text-brand-700">{r.title}</p>
                          <p className="font-mono text-[10.5px] text-brand-700/70">{r.modern_citation}</p>
                          <p className="mt-1 text-xs leading-relaxed text-ink-2">{r.audit_text}</p>
                        </motion.div>
                      );
                    })}
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="flex items-center gap-1.5 px-1 text-[11px] text-muted">
            <Home className="size-3" /> <Layers className="size-3" /> Rules engine v1.2 · Verdicts are “Likely”, never guaranteed.
          </p>
        </div>
      </div>
    </Page>
  );
}
