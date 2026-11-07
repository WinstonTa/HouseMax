"use client";

import { AnimatePresence, motion } from "motion/react";
import { BarChart3, Check, Copy, Gavel, Lock, Scale, Timer } from "lucide-react";
import { useState } from "react";
import { useProject } from "@/lib/store";
import { CITIES, getCity } from "@/lib/data";
import { AS_OF_DATE } from "@/lib/benchmarks";
import { statutoryClocks } from "@/lib/clocks";
import { addDays, clamp, daysBetween, prettyDate } from "@/lib/format";
import { CityBars, ClockRing, StackedBar } from "@/components/charts/Charts";
import { Badge, Card, CardHeader, Disclaimer, Page, PageTitle, cn } from "@/components/ui/primitives";

export default function ClocksPage() {
  const { project, submittedDate, setSubmittedDate } = useProject();
  const city = getCity(project.cityId);
  const isAdu = project.type === "ADU_DETACHED";
  const elapsed = clamp(daysBetween(submittedDate, AS_OF_DATE), 0, 999);
  const clocks = statutoryClocks(project.type, submittedDate);
  // Multifamily decision period is not verified: 90 days is an ASSUMPTION placeholder.
  const decisionIsAssumption = clocks.decisionDays === null;
  const decisionLimit = clocks.decisionDays ?? 90;
  const historical = isAdu ? city.apr_median_days_adu : city.apr_median_days_multifamily;
  const overdue = elapsed > decisionLimit;
  const [showDraft, setShowDraft] = useState(false);
  const [copied, setCopied] = useState(false);

  const external = Math.min(6, elapsed);
  const applicant = Math.min(9, elapsed - external);
  const cityLag = Math.max(0, elapsed - external - applicant);

  const benchmark = CITIES.map((c) => ({ id: c.id, label: c.name, value: isAdu ? c.apr_median_days_adu : c.apr_median_days_multifamily }));

  const letter = `NOTICE OF EXCEEDED STATUTORY DEADLINE — DRAFT

To: ${city.name} Planning & Building Division
Re: ${project.address} (APN ${project.apn})
Application submitted: ${prettyDate(submittedDate)}
Statutory deadline: ${prettyDate(addDays(submittedDate, decisionLimit))} (${decisionLimit} days)
As of ${prettyDate(AS_OF_DATE)}: ${elapsed} days elapsed${overdue ? ` — ${elapsed - decisionLimit} days past deadline` : ""}

Pursuant to ${isAdu ? "California Government Code § 66317(a)(3)" : "California Government Code § 65913.4 [decision period not verified; confirm before use]"}, a local agency must ${isAdu ? "approve or deny an ADU application within 60 days of receiving a complete application (deemed complete after 15 business days without a determination, § 66317(a)(2))" : "complete streamlined ministerial review within the statutory period"}. ${isAdu ? "If the agency has not acted within that period, the application shall be deemed approved." : ""}

We respectfully request a written determination within 5 business days. A copy of this notice is being provided to the California Department of Housing and Community Development, Housing Accountability Unit.

Applicant: ${project.applicant.name}, ${project.applicant.firm}
${project.applicant.email} · ${project.applicant.phone}

— Form draft only. Does not constitute legal advice. Requires legal counsel review before issuance. —`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Page>
      <PageTitle
        eyebrow="Compliance audit"
        title="Two-Clock Ledger"
        description="What the law requires versus what actually happens — and a ready-to-review notice when the city runs out the clock."
        right={
          <label className="flex items-center gap-3 rounded-xl border border-hairline bg-white px-3 py-2">
            <span className="text-xs font-medium text-ink-2">Submitted</span>
            <input
              type="date"
              value={submittedDate}
              max={AS_OF_DATE}
              onChange={(e) => e.target.value && setSubmittedDate(e.target.value)}
              className="tabular bg-transparent text-sm font-semibold text-ink outline-none"
            />
          </label>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader title="Statutory shot clock" subtitle="Legally binding deadlines" icon={Scale} right={<Badge tone="brand">Law</Badge>} />
          <div className="grid grid-cols-2 gap-4 p-6">
            <ClockRing elapsed={elapsed} limit={clocks.completenessDays} label={clocks.completenessLabel} sublabel={clocks.completenessCitation} />
            <ClockRing elapsed={elapsed} limit={decisionLimit} label={decisionIsAssumption ? "Streamlined review (90-day ASSUMPTION)" : clocks.decisionLabel} sublabel={clocks.decisionCitation} />
          </div>
          <ul className="space-y-1 px-6 pb-5 text-[11px] text-muted">
            {clocks.notes.map((n) => (
              <li key={n}>· {n}</li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="Historical reality clock" subtitle={`Median turnaround · ${city.name} · ${city.apr_median_note}`} icon={Timer} right={<Badge tone="warning">ASSUMPTION</Badge>} />
          <div className="flex flex-col items-center gap-4 p-6 sm:flex-row sm:justify-around">
            <ClockRing elapsed={historical} limit={decisionLimit} label="Typical city median" sublabel={`${isAdu ? "ADU" : "Multifamily"} · placeholder, not APR data`} />
            <div className="max-w-[220px] text-center sm:text-left">
              <p className="text-[13px] text-ink-2">
                {historical <= decisionLimit ? (
                  <>
                    {city.name} typically decides <span className="font-semibold text-ink">{decisionLimit - historical} days inside</span> the statutory limit.
                  </>
                ) : (
                  <>
                    {city.name}&apos;s median runs <span className="font-semibold text-[#a32626]">{historical - decisionLimit} days past</span> the statutory limit.
                  </>
                )}
              </p>
              <p className="mt-2 text-[13px] text-ink-2">
                Your application is at <span className="font-semibold text-ink">day {elapsed}</span>.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader title="Median decision days by city" subtitle={isAdu ? "Black line = 60-day statutory limit" : "Multifamily medians (no single statutory limit)"} icon={BarChart3} />
          <div className="py-5 pl-10 pr-5">
            <CityBars data={benchmark} highlightId={city.id} reference={isAdu ? { value: 60, label: "60-day limit" } : undefined} />
          </div>
          <div className="px-5 pb-4">
            <Disclaimer>Illustrative seed values modeled on HCD Annual Progress Reports; verify before citing.</Disclaimer>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Who owns the delay?" subtitle={`${elapsed} days elapsed, segmented`} icon={Timer} />
          <div className="p-5">
            <StackedBar
              parts={[
                { label: "City processing", value: cityLag, color: "var(--color-s1)" },
                { label: "Applicant", value: applicant, color: "var(--color-s2)" },
                { label: "External (utilities)", value: external, color: "var(--color-s3)" },
              ]}
            />
            <ul className="mt-5 space-y-3 border-l-2 border-hairline pl-4">
              {[
                { d: submittedDate, t: "Application submitted" },
                { d: addDays(submittedDate, Math.min(applicant, elapsed)), t: "Applicant correction resubmitted" },
                { d: clocks.completenessDeadline, t: "Completeness deadline" },
                { d: addDays(submittedDate, decisionLimit), t: "Decision deadline" },
              ].map((e) => (
                <li key={e.t} className="relative">
                  <span className={cn("absolute -left-[21px] top-1.5 size-2.5 rounded-full ring-2 ring-white", daysBetween(e.d, AS_OF_DATE) >= 0 ? "bg-ink" : "bg-axis")} />
                  <p className="tabular text-xs text-muted">{prettyDate(e.d)}</p>
                  <p className="text-[13px] font-medium text-ink">{e.t}</p>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {/* Shot-Clock Kit */}
      <Card className="mt-5 overflow-hidden">
        <CardHeader
          title="Shot-Clock Kit"
          subtitle="Formal notice template when the city exceeds its statutory deadline."
          icon={Gavel}
          right={overdue ? <Badge tone="critical">Deadline exceeded</Badge> : <Badge tone="good">{decisionLimit - elapsed} days remaining</Badge>}
        />
        <div className="p-5">
          {!overdue && !showDraft ? (
            <div className="flex flex-col items-start gap-3 rounded-xl bg-plane p-5 sm:flex-row sm:items-center">
              <Lock className="size-5 text-muted" />
              <p className="flex-1 text-[13.5px] text-ink-2">
                The city is still inside its window. The notice becomes actionable on <span className="font-semibold text-ink">{prettyDate(addDays(submittedDate, decisionLimit + 1))}</span>.
              </p>
              <button type="button" onClick={() => setShowDraft(true)} className="rounded-lg border border-hairline bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-plane">
                Preview draft
              </button>
            </div>
          ) : (
            <AnimatePresence>
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="relative">
                <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl bg-[#0e1424] p-5 font-mono text-[12px] leading-relaxed text-white/85">{letter}</pre>
                <div className="absolute right-3 top-3 flex gap-2">
                  {!overdue && (
                    <button type="button" onClick={() => setShowDraft(false)} className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20">
                      Hide
                    </button>
                  )}
                  <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-ink hover:bg-white/90">
                    {copied ? <Check className="size-3.5 text-good" /> : <Copy className="size-3.5" />}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
          <div className="mt-3">
            <Disclaimer>Form draft only. Does not constitute legal advice. Requires legal counsel review before issuance.</Disclaimer>
          </div>
        </div>
      </Card>
    </Page>
  );
}
