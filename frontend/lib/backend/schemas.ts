/**
 * HouseMax backend contract.
 *
 * The API speaks the frontend's own domain types (lib/types.ts), so screens need no adapters.
 * This file adds the runtime validation (Zod) for what crosses the API boundary, plus the
 * provenance types the backend uses to label sources.
 *
 * Honesty rules (docs/backend-plan.md §1):
 *  - `null` on transit / coastal / fireZone / existing means UNKNOWN, never "no".
 *  - Verdicts say "LIKELY", never "APPROVED".
 *  - Every response carries a disclaimer and the sources behind it.
 */
import { z } from "zod";
import type { Evaluation, Flip, ProjectInput } from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Provenance                                                         */
/* ------------------------------------------------------------------ */

/** How much we trust a data record (a rule, a benchmark, a checklist entry). */
export const DataStatus = z.enum([
  "VERIFIED", // a person opened the source and confirmed the content
  "UNVERIFIED", // a lead: claimed source not yet confirmed
  "ASSUMPTION", // a number we chose ourselves; labeled ASSUMPTION in the UI
  "AI_SUGGESTED", // produced by Claude; needs human confirmation
]);
export type DataStatus = z.infer<typeof DataStatus>;

export const SourceRef = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string().nullable(),
  status: DataStatus,
  checked_date: z.string().nullable(),
});
export type SourceRef = z.infer<typeof SourceRef>;

/* ------------------------------------------------------------------ */
/* Request: mirrors lib/types.ts ProjectInput                          */
/* ------------------------------------------------------------------ */

const nonNeg = z.number().finite().nonnegative();

export const ProjectInputSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(["ADU_DETACHED", "MISSING_MIDDLE"]),
  cityId: z.string(),
  applicant: z.object({ name: z.string(), firm: z.string(), email: z.string(), phone: z.string() }),
  address: z.string(),
  apn: z.string(),
  lotArea: nonNeg,
  lotWidth: nonNeg,
  lotDepth: nonNeg,
  slopePct: nonNeg,
  transit: z.boolean().nullable(),
  coastal: z.boolean().nullable(),
  fireZone: z.enum(["NONE", "HIGH", "VERY_HIGH"]).nullable(),
  existing: z.enum(["SINGLE_FAMILY_RESIDENCE", "MULTIFAMILY", "VACANT"]).nullable(),
  units: z.number().int().nonnegative(),
  height: nonNeg,
  sqft: nonNeg,
  rearSetback: nonNeg,
  sideSetback: nonNeg,
  parking: z.number().int().nonnegative(),
  preapprovedPlanId: z.string().nullable(),
  affordablePct: z.number().min(0).max(100),
  dataSource: z.enum(["VERIFIED", "UPLOADED", "SELF_REPORTED"]),
});

// Compile-time guard: the Zod schema and the frontend type must stay identical.
type _SchemaMatchesType = [z.infer<typeof ProjectInputSchema>] extends [ProjectInput]
  ? [ProjectInput] extends [z.infer<typeof ProjectInputSchema>]
    ? true
    : never
  : never;
const _schemaMatchesType: _SchemaMatchesType = true;
void _schemaMatchesType;

export const EvaluateRequest = z.object({ project: ProjectInputSchema });
export type EvaluateRequest = z.infer<typeof EvaluateRequest>;

/* ------------------------------------------------------------------ */
/* Response                                                           */
/* ------------------------------------------------------------------ */

export interface ResponseMeta {
  engine_version: string;
  evaluated_at: string;
  /** "server" when computed by POST /api/evaluate. */
  computed_by: "server";
  sources: SourceRef[];
  disclaimer: string;
}

export interface EvaluateResponse {
  evaluation: Evaluation;
  flips: Flip[];
  meta: ResponseMeta;
}

export interface ApiError {
  error: {
    code: "BAD_REQUEST" | "NOT_FOUND" | "INTERNAL" | "NOT_IMPLEMENTED";
    message: string;
    issues?: unknown[];
  };
}

/* ------------------------------------------------------------------ */
/* Shared constants                                                   */
/* ------------------------------------------------------------------ */

export const DISCLAIMER =
  "Prototype only. Not legal advice. Verdicts are 'likely' outcomes based on the written rules encoded here; " +
  "final determination rests with city staff. Review with a qualified professional before acting.";

export const ENGINE_VERSION = "0.2.0";
