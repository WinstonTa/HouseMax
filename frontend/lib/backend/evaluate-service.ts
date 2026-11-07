/**
 * Server-side evaluation service behind POST /api/evaluate.
 *
 * Runs the same pure engine the screens use for instant what-if previews
 * (lib/by-right-engine.ts), so server and client can never disagree, and wraps the result
 * with source labels and the disclaimer.
 */
import { evaluate, findFlips } from "@/lib/by-right-engine";
import { REGULATIONS } from "@/lib/data";
import type { ProjectInput } from "@/lib/types";
import { DISCLAIMER, ENGINE_VERSION, type EvaluateResponse, type SourceRef } from "./schemas";

/** Source refs straight from data/regulations.json, carrying each rule's verification status. */
function sourcesFor(regulationIds: string[]): SourceRef[] {
  return REGULATIONS.filter((r) => regulationIds.includes(r.id)).map((r) => ({
    id: r.id,
    label: `${r.modern_citation}: ${r.title}`,
    url: r.source_url,
    status: r.status,
    checked_date: r.last_checked_date,
  }));
}

export function runEvaluation(project: ProjectInput, now: Date = new Date()): EvaluateResponse {
  const evaluation = evaluate(project);
  const flips = findFlips(project);
  return {
    evaluation,
    flips,
    meta: {
      engine_version: ENGINE_VERSION,
      evaluated_at: now.toISOString(),
      computed_by: "server",
      sources: sourcesFor(evaluation.appliedOverrides),
      disclaimer: DISCLAIMER,
    },
  };
}
