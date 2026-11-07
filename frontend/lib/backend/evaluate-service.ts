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

/**
 * Regulations in data/regulations.json have not yet been re-checked against leginfo by this
 * team, so every source is reported UNVERIFIED until P1 verification lands (plan §2 #5).
 */
function sourcesFor(regulationIds: string[]): SourceRef[] {
  return REGULATIONS.filter((r) => regulationIds.includes(r.id)).map((r) => ({
    id: r.id,
    label: `${r.modern_citation}: ${r.title}`,
    url: null,
    status: "UNVERIFIED",
    checked_date: null,
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
