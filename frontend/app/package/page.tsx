"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, FileCheck2, FileText, Loader2, Printer, Sparkles } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useProject } from "@/lib/store";
import { getChecklist, getCity } from "@/lib/data";
import { fetchPacket, fetchPacketPdf } from "@/lib/api-client";
import type { PacketModel } from "@/lib/backend/packet";
import { VERDICT_META } from "@/lib/by-right-engine";
import { AS_OF_DATE } from "@/lib/benchmarks";
import { prettyDate } from "@/lib/format";
import { ClockRing } from "@/components/charts/Charts";
import { Badge, Card, CardHeader, Disclaimer, Page, PageTitle, cn } from "@/components/ui/primitives";

function Paper({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 30, rotateX: 8 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: n * 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="print-page mx-auto min-h-[760px] w-full max-w-[640px] rounded-md border border-hairline bg-white p-8 text-[11px] leading-relaxed text-ink shadow-[0_10px_40px_-12px_rgba(0,0,0,0.25)]"
    >
      <div className="mb-4 flex items-center justify-between border-b-2 border-ink pb-2">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em]">
          [Page {n}] {title}
        </p>
        <p className="text-[9px] text-muted">Permit Fastrak · {prettyDate(AS_OF_DATE)}</p>
      </div>
      {children}
    </motion.section>
  );
}

function KV({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-hairline py-1.5">
      <span className="text-muted">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}

export default function PackagePage() {
  const { project: p, evaluation: ev, docsChecked, toggleDoc } = useProject();
  const city = getCity(p.cityId);
  const checklist = getChecklist(city, p.type);
  const docs = checklist?.required_documents ?? [];
  const done = docs.filter((d) => docsChecked[d]).length;
  const complete = docs.length > 0 && done === docs.length;
  const [stage, setStage] = useState<"idle" | "building" | "ready">("idle");
  const [packet, setPacket] = useState<PacketModel | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isByRight = ev.verdict === "BY_RIGHT_LIKELY";

  async function generate() {
    setStage("building");
    setError(null);
    try {
      setPacket(await fetchPacket(p, docsChecked));
      setStage("ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Packet build failed");
      setStage("idle");
    }
  }

  async function openPdf() {
    setPdfBusy(true);
    setError(null);
    try {
      const blob = await fetchPacketPdf(p, docsChecked);
      window.open(URL.createObjectURL(blob), "_blank", "noopener");
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF render failed");
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <Page>
      <PageTitle
        eyebrow="Step 3 · Submit"
        title="Submittal Package"
        description="Pre-flight every city checklist item, then generate the audit-ready application with the statutory preemption addendum."
      />

      <div className="no-print grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader title="Pre-flight completeness check" subtitle={`${city.name} · ${checklist?.checklist_id ?? "no checklist"}`} icon={FileCheck2} />
          <ul className="space-y-1.5 p-4">
            {docs.length === 0 && <li className="p-3 text-sm text-ink-2">No document checklist registered for this city and typology.</li>}
            {docs.map((d, i) => {
              const on = !!docsChecked[d];
              return (
                <motion.li key={d} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => toggleDoc(d)}
                    className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition", on ? "bg-[#0ca30c]/[0.06]" : "hover:bg-black/[0.03]")}
                  >
                    <motion.span
                      className={cn("grid size-5 shrink-0 place-items-center rounded-md border-2", on ? "border-good bg-good text-white" : "border-axis bg-white")}
                      animate={{ scale: on ? [1, 1.25, 1] : 1 }}
                      transition={{ duration: 0.25 }}
                    >
                      {on && <Check className="size-3.5" strokeWidth={3} />}
                    </motion.span>
                    <span className={cn("text-[13.5px]", on ? "text-ink-2 line-through decoration-black/20" : "text-ink")}>{d}</span>
                  </button>
                </motion.li>
              );
            })}
          </ul>
          {docs.length > 0 && !complete && (
            <div className="border-t border-hairline px-5 py-3">
              <button
                type="button"
                onClick={() => docs.forEach((d) => !docsChecked[d] && toggleDoc(d))}
                className="text-xs font-semibold text-brand-600 hover:underline"
              >
                Mark all as ready (demo)
              </button>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <ClockRing elapsed={done} limit={Math.max(1, docs.length)} label="Documents ready" sublabel={complete ? "Package complete" : `${docs.length - done} missing`} size={130} />
          </Card>
          <Card className="p-5">
            <p className="text-[13px] font-medium text-ink-2">Verdict on cover sheet</p>
            <p className={cn("mt-1 text-lg font-semibold", isByRight ? "text-good-ink" : "text-[#a32626]")}>{VERDICT_META[ev.verdict].label}</p>
            {!isByRight && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-ink-2">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-[#c58a00]" />
                The applicant&apos;s statement is only included for By-Right Likely projects. Every page is watermarked DRAFT.
              </p>
            )}
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={generate}
              disabled={stage === "building"}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3 text-sm font-semibold text-white transition hover:bg-black/80 disabled:opacity-60"
            >
              {stage === "building" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
              {stage === "building" ? "Assembling package…" : stage === "ready" ? "Regenerate package" : "Generate draft packet"}
            </motion.button>
            {stage === "ready" && (
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={openPdf}
                disabled={pdfBusy}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
              >
                {pdfBusy ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} Open server-rendered PDF
              </motion.button>
            )}
            {error && <p className="mt-2 text-xs text-critical">{error}</p>}
            {stage === "ready" && (
              <motion.button
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => window.print()}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-hairline bg-white px-4 py-2.5 text-sm font-semibold text-ink hover:bg-plane"
              >
                <Printer className="size-4" /> Print / Save as PDF
              </motion.button>
            )}
          </Card>
        </div>
      </div>

      <AnimatePresence>
        {stage === "ready" && (
          <motion.div key="pdf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-8">
            <div className="no-print mb-4 flex items-center gap-2">
              <FileText className="size-4 text-brand-600" />
              <p className="text-sm font-semibold text-ink">Package preview · 4 pages</p>
              {!complete && <Badge tone="warning">{docs.length - done} documents still missing</Badge>}
            </div>
            <div className="print-area relative space-y-6 rounded-3xl bg-[#e9e8e3] p-4 [perspective:1200px] md:p-8">
              {/* Always a draft: this prototype never produces a filing-ready document. */}
              <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center overflow-hidden">
                <p className="-rotate-30 text-[120px] font-black tracking-widest text-critical/10">DRAFT</p>
              </div>

              <Paper n={1} title="Master Housing Permit Submittal Cover Sheet">
                <p className="text-[9px] uppercase tracking-wider text-muted">City of {city.name} · Planning & Building</p>
                <h2 className="mt-1 text-xl font-bold">{p.title}</h2>
                <div className="mt-4 grid grid-cols-2 gap-x-6">
                  <div>
                    <p className="mb-1 font-bold">Parcel</p>
                    <KV k="Address" v={p.address} />
                    <KV k="APN" v={p.apn} />
                    <KV k="Lot area" v={`${p.lotArea.toLocaleString("en-US")} sq ft`} />
                    <KV k="Transit ≤ ½ mi" v={p.transit === null ? "Unconfirmed" : p.transit ? "Yes" : "No"} />
                    <KV k="Coastal zone" v={p.coastal === null ? "Unconfirmed" : p.coastal ? "Yes" : "No"} />
                  </div>
                  <div>
                    <p className="mb-1 font-bold">Design team</p>
                    <KV k="Applicant" v={p.applicant.name} />
                    <KV k="Firm" v={p.applicant.firm} />
                    <KV k="Email" v={p.applicant.email} />
                    <KV k="Phone" v={p.applicant.phone} />
                  </div>
                </div>
                <div className="mt-6 rounded border-2 border-ink p-3">
                  <p className="font-bold">Pathway determination: {VERDICT_META[ev.verdict].label.toUpperCase()}</p>
                  <p className="text-muted">Evidence confidence: {ev.confidence} · Evaluated {prettyDate(AS_OF_DATE)}</p>
                </div>
              </Paper>

              <Paper n={2} title="Project Tabular Specification Matrix">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b-2 border-ink text-left">
                      <th className="py-1.5">Standard</th>
                      <th>Proposed</th>
                      <th>Statute</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ev.conditions.map((c) => (
                      <tr key={c.id} className="border-b border-hairline align-top">
                        <td className="py-1.5 pr-2 font-medium">{c.label}</td>
                        <td className="pr-2">{c.detail}</td>
                        <td className="pr-2 font-mono text-[9px]">{c.statute}</td>
                        <td className="font-bold">{c.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mt-4 grid grid-cols-4 gap-2 text-center">
                  {[
                    ["Units", p.units],
                    ["Height", `${p.height} ft`],
                    ["Area", `${p.sqft} sf`],
                    ["Parking", p.parking],
                  ].map(([k, v]) => (
                    <div key={String(k)} className="rounded border border-hairline p-2">
                      <p className="text-muted">{k}</p>
                      <p className="text-base font-bold">{v}</p>
                    </div>
                  ))}
                </div>
              </Paper>

              <Paper n={3} title="Statutory Basis & Applicant's Statement">
                {packet?.addendum.included ? (
                  <div className="rounded border-2 border-ink p-4">
                    <p className="text-center text-sm font-bold">{packet.addendum.heading}</p>
                    <p className="mt-3">
                      <b>TO:</b> {packet.addendum.to}
                    </p>
                    <p>
                      <b>JURISDICTION:</b> {packet.addendum.jurisdiction}
                    </p>
                    <p>
                      <b>PROJECT:</b> {packet.addendum.project}
                    </p>
                    {packet.addendum.body.map((para, i) => (
                      <p key={i} className="mt-2">
                        {para}
                      </p>
                    ))}
                  </div>
                ) : (
                  <div className="rounded border-2 border-ink p-4">
                    <p className="font-bold">Applicant&apos;s statement not included</p>
                    <p className="mt-1">{packet?.addendum.omitted_reason}</p>
                  </div>
                )}
                <p className="mb-1 mt-4 font-bold">Rules relied on</p>
                {(packet?.addendum.statutes ?? []).length === 0 && <p className="text-muted">None.</p>}
                {(packet?.addendum.statutes ?? []).map((st) => (
                  <div key={st.cite} className="border-b border-hairline py-1.5">
                    <p className="font-medium">
                      {st.cite} — {st.title}
                    </p>
                    <p className="text-[9px] text-muted">{st.status === "VERIFIED" ? `Read on leginfo ${st.checked}` : "UNVERIFIED"}</p>
                  </div>
                ))}
                <p className="mb-1 mt-4 font-bold">Local requirements flagged for review</p>
                <p className="mb-1 text-[9px] text-muted">{packet?.addendum.flagged_note}</p>
                {(packet?.addendum.flagged_local_requirements ?? []).map((f) => (
                  <p key={f.item_id} className="border-b border-hairline py-1">
                    <span className="font-mono text-[9px]">{f.item_id}</span> — {f.text} <span className="text-muted">({f.statute} · {f.note})</span>
                  </p>
                ))}
              </Paper>

              <Paper n={4} title="Pre-Flight Submittal Completeness Attestation">
                <p className="mb-2">City checklist item reconciliation — {checklist?.checklist_id ?? "N/A"}</p>
                {docs.map((d) => (
                  <div key={d} className="flex items-center gap-2 border-b border-hairline py-1.5">
                    <span className={cn("grid size-3.5 place-items-center rounded-sm border", docsChecked[d] ? "border-ink bg-ink text-white" : "border-axis")}>
                      {docsChecked[d] && <Check className="size-2.5" strokeWidth={4} />}
                    </span>
                    <span>{d}</span>
                    <span className="ml-auto font-bold">{docsChecked[d] ? "INCLUDED" : "MISSING"}</span>
                  </div>
                ))}
                <div className="mt-8 grid grid-cols-2 gap-8">
                  <div>
                    <div className="h-8 border-b border-ink" />
                    <p className="mt-1 text-muted">Applicant signature / date</p>
                  </div>
                  <div>
                    <div className="h-8 border-b border-ink" />
                    <p className="mt-1 text-muted">Permit technician sign-off · {checklist?.verified_by ?? "Not verified (illustrative checklist)"}</p>
                  </div>
                </div>
                <p className="mt-6 text-[9px] text-muted">
                  Verdicts are “Likely” determinations only. Final statutory determination rests with municipal staff. Not legal advice.
                </p>
              </Paper>
            </div>
            <div className="no-print mt-3">
              <Disclaimer>Preview of the draft packet. &quot;Open server-rendered PDF&quot; renders the same content with @react-pdf/renderer on the backend (POST /api/packet/pdf). Draft for applicant review; nothing is filed.</Disclaimer>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Page>
  );
}
