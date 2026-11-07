"use client";

/**
 * Backend-driven Conflict Radar pieces:
 *  - useConflictAudit: loads GET /api/cities/:id/conflict-radar for the current project
 *  - AutoScanPanel: automatic findings for one checklist item
 *  - PasteChecklistAudit: paste any checklist text and audit it via POST /api/conflict-radar
 */
import { FileWarning, ScanSearch, ShieldQuestion, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { auditChecklistText, fetchCityConflictRadar } from "@/lib/api-client";
import type { AuditedItem, ConflictAudit } from "@/lib/backend/conflict-radar";
import type { ProjectType } from "@/lib/types";
import { Badge, Card, CardHeader, cn } from "./ui/primitives";

export function useConflictAudit(cityId: string, projectType: ProjectType) {
  const [audit, setAudit] = useState<{ key: string; data: ConflictAudit | null; error: string | null } | null>(null);
  const key = `${cityId}:${projectType}`;
  useEffect(() => {
    const ctrl = new AbortController();
    fetchCityConflictRadar(cityId, projectType, ctrl.signal)
      .then((data) => setAudit({ key, data, error: null }))
      .catch((e: unknown) => {
        if ((e as { name?: string })?.name === "AbortError") return;
        setAudit({ key, data: null, error: e instanceof Error ? e.message : "Audit failed" });
      });
    return () => ctrl.abort();
  }, [cityId, projectType, key]);
  return audit?.key === key ? audit : null;
}

export function AutoScanPanel({ item }: { item: AuditedItem | undefined }) {
  if (!item) return <p className="mt-4 text-xs text-muted">Automatic scan loading…</p>;
  const none = item.stale_citations.length === 0 && item.discretion_flags.length === 0;
  return (
    <div className="mt-4 rounded-xl bg-plane p-4 ring-1 ring-hairline" data-testid="auto-scan">
      <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">
        <Sparkles className="size-3.5" aria-hidden /> Automatic scan (backend)
      </p>
      {none && <p className="mt-2 text-[13px] text-ink-2">No renumbered statute numbers or discretionary-review language found.</p>}
      {item.stale_citations.map((s, i) => (
        <div key={`s${i}`} className="mt-2 text-[13px] text-ink">
          <Badge tone="warning" icon={FileWarning}>
            Stale citation
          </Badge>{" "}
          <span className="font-mono">{s.matched}</span> → <span className="font-mono font-semibold">{s.current}</span>
          <p className="mt-0.5 text-xs text-ink-2">
            {s.explanation}{" "}
            <a href={s.source_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
              Source
            </a>{" "}
            · mapping {s.mapping_status}
          </p>
        </div>
      ))}
      {item.discretion_flags.map((f) => (
        <div key={f.trigger} className="mt-2 text-[13px] text-ink">
          <Badge tone="serious" icon={ShieldQuestion}>
            Possible discretionary trigger
          </Badge>{" "}
          “{f.matched}”
          <p className="mt-0.5 text-xs text-ink-2">
            {f.explanation}{" "}
            {f.basis ? (
              f.basis_url ? (
                <a href={f.basis_url} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                  {f.basis}
                </a>
              ) : (
                f.basis
              )
            ) : (
              "No verified statute basis on file."
            )}{" "}
            · needs human review
          </p>
        </div>
      ))}
      {item.disagreement_note && <p className="mt-2 text-xs font-semibold text-[#7a5200]">Scan and curated call disagree: {item.disagreement_note}</p>}
    </div>
  );
}

export function PasteChecklistAudit({ projectType }: { projectType: ProjectType }) {
  const [text, setText] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ConflictAudit | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      setResult(await auditChecklistText(text, projectType, label || undefined));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audit failed");
    } finally {
      setBusy(false);
    }
  }

  const flagged = result?.items.filter((i) => i.auto_status !== "NO_FLAGS") ?? [];
  return (
    <Card className="mt-5">
      <CardHeader title="Audit any checklist" subtitle="Paste a city checklist (one requirement per line). Nothing is stored." icon={ScanSearch} />
      <div className="space-y-3 p-5">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Where is this from? (e.g. city, document title, date)"
          className="w-full rounded-lg border border-hairline bg-white px-3 py-2 text-[13px]"
          aria-label="Source label"
        />
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          placeholder={"e.g.\nJADU deed restriction per Gov. Code 65852.22\nDesign must be compatible with neighborhood character"}
          className="w-full rounded-lg border border-hairline bg-white px-3 py-2 font-mono text-[12.5px]"
          aria-label="Checklist text"
        />
        <button
          type="button"
          disabled={busy || text.trim().length === 0}
          onClick={run}
          className={cn("rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-white", (busy || !text.trim()) && "opacity-50")}
        >
          {busy ? "Scanning…" : "Scan checklist"}
        </button>
        {error && <p className="text-[13px] text-critical">{error}</p>}
        {result && (
          <div data-testid="paste-audit-result">
            <p className="text-[13px] text-ink-2">
              {result.summary.items} lines · {result.summary.stale} with stale citations · {result.summary.possible_discretionary} with possible discretionary language. {result.source.note}
            </p>
            <ul className="mt-2 divide-y divide-hairline">
              {flagged.map((i) => (
                <li key={i.item_id} className="py-2">
                  <p className="text-[13px] text-ink">
                    <span className="font-mono text-[11px] text-muted">{i.item_id}</span> {i.requirement_text}
                  </p>
                  <AutoScanPanel item={i} />
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}
