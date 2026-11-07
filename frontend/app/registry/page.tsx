"use client";

import { AnimatePresence, motion } from "motion/react";
import { BadgeCheck, BookOpenCheck, ExternalLink, Scale, Search } from "lucide-react";
import { useState } from "react";
import { CITIES, REGULATIONS } from "@/lib/data";
import { daysBetween, prettyDate } from "@/lib/format";
import { AS_OF_DATE } from "@/lib/benchmarks";
import { Badge, Card, CardHeader, Page, PageTitle, Segmented, fadeUp, stagger } from "@/components/ui/primitives";

type Tab = "statutes" | "checklists";

function Freshness({ iso }: { iso: string }) {
  const age = daysBetween(iso, AS_OF_DATE);
  const tone = age <= 60 ? "good" : age <= 120 ? "warning" : "serious";
  return (
    <Badge tone={tone} icon={BadgeCheck}>
      {age <= 0 ? "Checked today" : `Checked ${age}d ago`}
    </Badge>
  );
}

export default function RegistryPage() {
  const [tab, setTab] = useState<Tab>("checklists");
  const [q, setQ] = useState("");
  const needle = q.trim().toLowerCase();

  const rows = CITIES.flatMap((c) =>
    (["adu", "missing_middle"] as const).flatMap((k) => {
      const cl = c.checklists[k];
      return cl ? [{ city: c, kind: k === "adu" ? "ADU" : "Missing-middle", cl }] : [];
    }),
  ).filter((r) => !needle || `${r.city.name} ${r.cl.checklist_id} ${r.cl.verified_by} ${r.kind}`.toLowerCase().includes(needle));

  const statutes = REGULATIONS.filter((r) => !needle || `${r.title} ${r.modern_citation} ${r.legacy_citation} ${r.audit_text}`.toLowerCase().includes(needle));

  return (
    <Page>
      <PageTitle
        eyebrow="Open Requirements Registry"
        title="Verified rules, with provenance"
        description="Every rule records when it took legal effect and when a qualified permit technician last verified it."
        right={
          <Segmented<Tab>
            id="regtab"
            value={tab}
            onChange={setTab}
            options={[
              { label: "City checklists", value: "checklists" },
              { label: "State statutes", value: "statutes" },
            ]}
          />
        }
      />

      <motion.div variants={fadeUp} className="mb-5 flex items-center gap-2 rounded-xl border border-hairline bg-white px-3 focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        <Search className="size-4 text-muted" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tab === "statutes" ? "Search statutes, citations…" : "Search cities, checklists, technicians…"}
          className="w-full bg-transparent py-2.5 text-sm outline-none"
          aria-label="Search registry"
        />
      </motion.div>

      <AnimatePresence mode="wait">
        {tab === "checklists" ? (
          <motion.div key="cl" variants={stagger} initial="hidden" animate="show" exit={{ opacity: 0 }} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.length === 0 && <p className="text-sm text-ink-2">No matches.</p>}
            {rows.map(({ city, kind, cl }) => {
              const conflicts = cl.items.filter((i) => i.conflict_type === "SUBSTANTIVE_CONFLICT").length;
              const stale = cl.items.filter((i) => i.conflict_type === "STALE_CITATION").length;
              return (
                <Card key={cl.checklist_id} whileHover={{ y: -3 }} className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-ink">{city.name}</p>
                      <p className="text-xs text-ink-2">
                        {kind} · {city.county}
                      </p>
                    </div>
                    <Freshness iso={cl.last_verified} />
                  </div>
                  <p className="mt-3 font-mono text-[11px] text-muted">{cl.checklist_id}</p>
                  <div className="mt-3 flex h-2 gap-[2px] overflow-hidden rounded-full bg-hairline">
                    {cl.items.map((i) => (
                      <motion.span
                        key={i.item_id}
                        className="h-full flex-1"
                        style={{
                          background: i.conflict_type === "SUBSTANTIVE_CONFLICT" ? "var(--color-critical)" : i.conflict_type === "STALE_CITATION" ? "var(--color-warning)" : "var(--color-good)",
                        }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.5 }}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-ink-2">
                    {cl.items.length} clauses · <span className="font-semibold text-[#a32626]">{conflicts} conflicts</span> · {stale} stale
                  </p>
                  <div className="mt-4 border-t border-hairline pt-3 text-xs text-ink-2">
                    <p>
                      Verified by <span className="font-medium text-ink">{cl.verified_by}</span>
                    </p>
                    <p>on {prettyDate(cl.last_verified)}</p>
                    <a href={cl.source_document_url} target="_blank" rel="noreferrer" className="mt-1.5 inline-flex items-center gap-1 font-semibold text-brand-600 hover:underline">
                      Source document <ExternalLink className="size-3" />
                    </a>
                  </div>
                </Card>
              );
            })}
          </motion.div>
        ) : (
          <motion.div key="st" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <Card initial="show" animate="show">
              <CardHeader title="State statute library" subtitle={`${statutes.length} rules`} icon={Scale} />
              <div className="overflow-x-auto p-2">
                <table className="w-full min-w-[720px] text-left text-[13px]">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wider text-muted">
                      <th className="px-3 py-2 font-semibold">Rule</th>
                      <th className="px-3 py-2 font-semibold">Citation</th>
                      <th className="px-3 py-2 font-semibold">Applies to</th>
                      <th className="tabular px-3 py-2 font-semibold">Effective</th>
                      <th className="px-3 py-2 font-semibold">Last checked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statutes.map((r, i) => (
                      <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }} className="border-t border-hairline align-top">
                        <td className="max-w-sm px-3 py-3">
                          <p className="font-medium text-ink">{r.title}</p>
                          <p className="mt-0.5 text-xs leading-relaxed text-ink-2">{r.audit_text}</p>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-mono text-xs text-ink">{r.modern_citation}</p>
                          {r.legacy_citation !== "None" && <p className="font-mono text-[11px] text-muted line-through">{r.legacy_citation}</p>}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex flex-wrap gap-1">
                            {r.applies_to.map((t) => (
                              <Badge key={t}>{t === "ADU_DETACHED" ? "ADU" : "Missing-middle"}</Badge>
                            ))}
                          </div>
                        </td>
                        <td className="tabular px-3 py-3 text-ink-2">{r.effective_date}</td>
                        <td className="px-3 py-3">
                          <Freshness iso={r.last_checked_date} />
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={fadeUp} className="mt-6 flex items-center gap-2 text-xs text-muted">
        <BookOpenCheck className="size-3.5" /> Contributions are reviewed by qualified permit technicians and land-use professionals before publication.
      </motion.div>
    </Page>
  );
}
