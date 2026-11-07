/**
 * HouseMax shared contract.
 *
 * This file is the single source of truth for every type that crosses the backend/frontend
 * boundary: the JSON data files under /data, the API request bodies and the API responses.
 * Frontend code should import types from here (`import type { EvaluationResult } from "@/lib/backend/schemas"`)
 * and never redeclare them.
 *
 * Pure Zod, no framework imports, safe to import from server or client code.
 *
 * Honesty rules encoded in these types (see docs/backend-plan.md §1):
 *  - A fact that was never provided is ABSENT (undefined), which the engine reads as UNKNOWN.
 *    Never default a missing boolean to false.
 *  - Every rule, benchmark and checklist item carries Provenance (source URL, checked date, status).
 *  - Verdicts say "LIKELY", never "APPROVED".
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Enums                                                              */
/* ------------------------------------------------------------------ */

/** How much we trust a data record (a rule, a benchmark, a checklist entry). */
export const DataStatus = z.enum([
  "VERIFIED", // a person opened the source and confirmed the content
  "UNVERIFIED", // a lead: claimed source not yet confirmed. Cannot produce a by-right verdict.
  "ASSUMPTION", // a number we chose ourselves; must be labeled ASSUMPTION in the UI
  "AI_SUGGESTED", // produced by Claude; needs human confirmation
]);
export type DataStatus = z.infer<typeof DataStatus>;

/** Where a single project fact came from. Drives the Evidence Confidence rating. */
export const FactSource = z.enum([
  "VERIFIED_RECORD", // spatial record / official parcel data -> HIGH
  "OFFICIAL_CHECKLIST", // city's published checklist -> HIGH
  "UPLOADED_DOC", // builder PDF, non-verified municipal summary -> MEDIUM
  "SELF_REPORTED", // applicant's own estimate -> LOW
]);
export type FactSource = z.infer<typeof FactSource>;

export const Confidence = z.enum(["HIGH", "MEDIUM", "LOW"]);
export type Confidence = z.infer<typeof Confidence>;

export const Verdict = z.enum(["BY_RIGHT_LIKELY", "DISCRETIONARY_LIKELY", "CANT_TELL_YET"]);
export type Verdict = z.infer<typeof Verdict>;

export const ConditionResult = z.enum(["PASS", "FAIL", "UNKNOWN", "NOT_APPLICABLE"]);
export type ConditionResult = z.infer<typeof ConditionResult>;

export const ConflictType = z.enum([
  "NONE",
  "STALE_CITATION", // renumbered code, same legal effect
  "SUBSTANTIVE_CONFLICT", // local rule imposes something state law bars (human-curated only)
  "POSSIBLE_DISCRETIONARY_TRIGGER", // pattern match; needs human review
  "UNREVIEWED",
]);
export type ConflictType = z.infer<typeof ConflictType>;

export const ProjectType = z.enum([
  "ADU_DETACHED",
  "ADU_ATTACHED",
  "JADU",
  "SB9_TWO_UNIT",
  "SB9_LOT_SPLIT",
  "SB684_SMALL_SUBDIVISION",
  "SB35_STREAMLINED_MULTIFAMILY",
]);
export type ProjectType = z.infer<typeof ProjectType>;

export const Coverage = z.enum(["COMPLETE", "PARTIAL"]);
export type Coverage = z.infer<typeof Coverage>;

export const FireHazardZone = z.enum(["NONE", "MODERATE", "HIGH", "VERY_HIGH"]);

/** Plain ISO date `YYYY-MM-DD`. */
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

/* ------------------------------------------------------------------ */
/* Provenance                                                         */
/* ------------------------------------------------------------------ */

export const Provenance = z.object({
  status: DataStatus,
  source_url: z.string().url().nullable(),
  source_title: z.string().nullable(),
  /** Date a person last opened the source and checked it. null = never checked. */
  checked_date: IsoDate.nullable(),
  /** Date the law/ordinance took legal effect, when relevant. */
  effective_date: IsoDate.nullable().optional(),
  note: z.string().optional(),
});
export type Provenance = z.infer<typeof Provenance>;

/** A compact source reference returned in API responses. */
export const SourceRef = z.object({
  id: z.string(),
  label: z.string(),
  url: z.string().url().nullable(),
  status: DataStatus,
  checked_date: IsoDate.nullable(),
});
export type SourceRef = z.infer<typeof SourceRef>;

/* ------------------------------------------------------------------ */
/* Project facts                                                      */
/* ------------------------------------------------------------------ */

/** A single project attribute with where it came from. Absent = UNKNOWN. */
export const fact = <T extends z.ZodTypeAny>(value: T) =>
  z.object({ value, source: FactSource, note: z.string().optional() });

export type Fact<T> = { value: T; source: FactSource; note?: string };

export const Parcel = z.object({
  address: fact(z.string()).optional(),
  apn: fact(z.string()).optional(),
  zoning: fact(z.string()).optional(),
  lot_area_sqft: fact(z.number().positive()).optional(),
  within_half_mile_major_transit: fact(z.boolean()).optional(),
  coastal_zone: fact(z.boolean()).optional(),
  fire_hazard_severity_zone: fact(FireHazardZone).optional(),
  flood_zone: fact(z.string()).optional(),
  historic_district: fact(z.boolean()).optional(),
  hoa_present: fact(z.boolean()).optional(),
  existing_structures: fact(z.array(z.string())).optional(),
});
export type Parcel = z.infer<typeof Parcel>;

export const Specs = z.object({
  proposed_units: fact(z.number().int().nonnegative()).optional(),
  proposed_height_feet: fact(z.number().nonnegative()).optional(),
  proposed_sqft: fact(z.number().nonnegative()).optional(),
  setback_front_feet: fact(z.number().nonnegative()).optional(),
  setback_rear_feet: fact(z.number().nonnegative()).optional(),
  setback_side_feet: fact(z.number().nonnegative()).optional(),
  proposed_parking_spaces: fact(z.number().int().nonnegative()).optional(),
  is_preapproved_standard_plan: fact(z.boolean()).optional(),
  preapproved_plan_id: fact(z.string()).optional(),
});
export type Specs = z.infer<typeof Specs>;

/** Dates used by the Two-Clock Ledger and the Shot-Clock Kit. */
export const ProjectDates = z.object({
  application_submitted: IsoDate.optional(),
  deemed_complete: IsoDate.optional(),
  determination_issued: IsoDate.optional(),
});

/** Inputs for Cost of Discretion. Defaults (if used) are labeled ASSUMPTION by the engine. */
export const ProjectFinance = z.object({
  project_capital_usd: fact(z.number().nonnegative()).optional(),
  monthly_cost_of_capital_rate: fact(z.number().min(0).max(1)).optional(),
  homes_count: fact(z.number().int().positive()).optional(),
});

/** Applicants in this prototype are always made up. Never enter a real person. */
export const Applicant = z.object({
  name: z.string(),
  firm: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  is_fictional: z.literal(true),
});

export const ProjectInput = z.object({
  id: z.string().optional(),
  title: z.string(),
  project_type: ProjectType,
  jurisdiction_id: z.string(),
  applicant: Applicant.optional(),
  parcel: Parcel.default({}),
  specs: Specs.default({}),
  dates: ProjectDates.optional(),
  finance: ProjectFinance.optional(),
  /** Free-text notes, e.g. which public listing the demo lot came from. */
  notes: z.string().optional(),
});
export type ProjectInput = z.infer<typeof ProjectInput>;

/** Stored demo project (data/projects.json): input + provenance of the demo itself. */
export const DemoProject = ProjectInput.extend({
  id: z.string(),
  created_at: z.string(),
  provenance: Provenance,
});
export type DemoProject = z.infer<typeof DemoProject>;

/* ------------------------------------------------------------------ */
/* Rules (data/regulations.json)                                      */
/* ------------------------------------------------------------------ */

export const ComparisonOp = z.enum(["eq", "neq", "lt", "lte", "gt", "gte", "in", "includes", "exists"]);

/**
 * A condition tree evaluated with three-valued logic against project facts.
 * `fact` is a dot path into ProjectInput, e.g. "parcel.within_half_mile_major_transit".
 */
export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { fact: string; op: z.infer<typeof ComparisonOp>; value?: unknown };

export const Condition: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    z.object({ all: z.array(Condition) }),
    z.object({ any: z.array(Condition) }),
    z.object({ not: Condition }),
    z.object({ fact: z.string(), op: ComparisonOp, value: z.unknown().optional() }),
  ]),
);

/** Describes a dimensional lever the By-Right Flip engine may adjust. */
export const Lever = z.object({
  fact: z.string(),
  kind: z.enum(["max", "min", "boolean_true"]),
  limit: z.number().optional(),
  unit: z.string().optional(),
});

export const Regulation = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  pathway_ids: z.array(z.string()),
  modern_citation: z.string(),
  legacy_citation: z.string().nullable(),
  /** When false/absent the rule does not apply (NOT_APPLICABLE). Unknown inputs -> UNKNOWN. */
  applies_when: Condition.optional(),
  test: Condition,
  blocking: z.boolean(),
  /** True when the rule raises the local limit (a state override), e.g. the transit height bump. */
  is_state_override: z.boolean().default(false),
  lever: Lever.optional(),
  /** Plain question to ask when this rule is UNKNOWN. */
  follow_up_questions: z.record(z.string(), z.string()).default({}),
  audit_text: z.string(),
  last_checked_date: IsoDate.nullable(),
  provenance: Provenance,
});
export type Regulation = z.infer<typeof Regulation>;

export const PathwayDef = z.object({
  id: z.string(),
  label: z.string(),
  project_types: z.array(ProjectType),
  coverage: Coverage,
  /** Conditions we know exist in the statute but have not encoded. Shown to the user. */
  not_evaluated: z.array(z.string()),
  statutory_clock_days: z.number().int().positive().nullable(),
  provenance: Provenance,
});
export type PathwayDef = z.infer<typeof PathwayDef>;

/* ------------------------------------------------------------------ */
/* Cities (data/cities.json)                                          */
/* ------------------------------------------------------------------ */

export const ChecklistItem = z.object({
  item_id: z.string(),
  requirement_text: z.string(),
  /** Citation as printed on the city document (may be stale). */
  cited_on_document: z.string().nullable(),
  governing_state_statute: z.string().nullable(),
  conflict_type: ConflictType,
  statutory_note: z.string().nullable(),
  provenance: Provenance,
});
export type ChecklistItem = z.infer<typeof ChecklistItem>;

export const Checklist = z.object({
  checklist_id: z.string(),
  typology: z.enum(["adu", "sb9", "multifamily"]),
  title: z.string(),
  document_date: z.string().nullable(),
  verified_by: z.string().nullable(),
  items: z.array(ChecklistItem),
  provenance: Provenance,
});
export type Checklist = z.infer<typeof Checklist>;

export const HcdLetter = z.object({
  issue_date: IsoDate.nullable(),
  topic: z.string(),
  statutes_cited: z.array(z.string()),
  provenance: Provenance,
});

export const City = z.object({
  id: z.string(),
  name: z.string(),
  county: z.string(),
  permit_page_url: z.string().url().nullable(),
  submittal_portal: z.string().nullable(),
  hcd_letters: z.array(HcdLetter).default([]),
  checklists: z.array(Checklist).default([]),
  preapproved_plan_program_url: z.string().url().nullable(),
  provenance: Provenance,
});
export type City = z.infer<typeof City>;

/* ------------------------------------------------------------------ */
/* Benchmarks and citation map                                        */
/* ------------------------------------------------------------------ */

export const Benchmark = z.object({
  id: z.string(),
  label: z.string(),
  metric: z.enum(["days", "months", "usd", "rate", "count"]),
  value: z.number().nullable(),
  geography: z.string(),
  applies_to: z.string(),
  provenance: Provenance,
});
export type Benchmark = z.infer<typeof Benchmark>;

export const CitationMapEntry = z.object({
  legacy: z.string(),
  /** Regex source matched against document text (case-insensitive). */
  pattern: z.string(),
  current: z.string(),
  explanation: z.string(),
  provenance: Provenance,
});
export type CitationMapEntry = z.infer<typeof CitationMapEntry>;

/* ------------------------------------------------------------------ */
/* API: /api/evaluate                                                 */
/* ------------------------------------------------------------------ */

export const EvaluateRequest = z.object({ project: ProjectInput });
export type EvaluateRequest = z.infer<typeof EvaluateRequest>;

export const ConditionEvaluation = z.object({
  rule_id: z.string(),
  label: z.string(),
  result: ConditionResult,
  blocking: z.boolean(),
  explanation: z.string(),
  citation: z.string(),
  legacy_citation: z.string().nullable(),
  facts_used: z.array(z.string()),
  /** Weakest FactSource among facts_used (null when no facts were present). */
  weakest_fact_source: FactSource.nullable(),
  rule_status: DataStatus,
  source_url: z.string().url().nullable(),
});
export type ConditionEvaluation = z.infer<typeof ConditionEvaluation>;

export const PathwayResult = z.object({
  pathway_id: z.string(),
  label: z.string(),
  coverage: Coverage,
  verdict: Verdict,
  confidence: Confidence,
  /** One sentence; why this verdict. Uses "likely", never "approved". */
  reason: z.string(),
  conditions: z.array(ConditionEvaluation),
  not_evaluated: z.array(z.string()),
  statutory_clock_days: z.number().nullable(),
});
export type PathwayResult = z.infer<typeof PathwayResult>;

export const FollowUp = z.object({
  fact_path: z.string(),
  question: z.string(),
  /** 1 = ask first. */
  priority: z.number().int().positive(),
  blocking: z.boolean(),
  unblocks_pathways: z.array(z.string()),
  could_flip_verdict: z.boolean(),
});
export type FollowUp = z.infer<typeof FollowUp>;

export const Flip = z.object({
  pathway_id: z.string(),
  rule_id: z.string(),
  lever: z.string(),
  from: z.union([z.number(), z.boolean(), z.string(), z.null()]),
  to: z.union([z.number(), z.boolean(), z.string()]),
  change_description: z.string(),
  resulting_verdict: Verdict,
  /** True only when the engine re-ran the full evaluation with the change applied. */
  verified_by_rerun: z.boolean(),
  estimated_days_avoided: z.object({
    value: z.number().nullable(),
    benchmark_id: z.string().nullable(),
    status: DataStatus,
    label: z.string(),
  }),
});
export type Flip = z.infer<typeof Flip>;

export const ConflictFinding = z.object({
  city_id: z.string(),
  checklist_id: z.string(),
  item_id: z.string(),
  requirement_text: z.string(),
  conflict_type: ConflictType,
  cited_on_document: z.string().nullable(),
  current_citation: z.string().nullable(),
  explanation: z.string(),
  needs_human_review: z.boolean(),
  evidence: z.array(SourceRef),
});
export type ConflictFinding = z.infer<typeof ConflictFinding>;

export const EvaluationResult = z.object({
  engine_version: z.string(),
  /** True while the route returns canned data. The UI should show a "MOCK" badge. */
  is_mock: z.boolean(),
  evaluated_at: z.string(),
  project_title: z.string(),
  jurisdiction_id: z.string(),
  overall: z.object({
    verdict: Verdict,
    confidence: Confidence,
    best_pathway_id: z.string().nullable(),
    summary: z.string(),
  }),
  pathways: z.array(PathwayResult),
  follow_ups: z.array(FollowUp),
  flips: z.array(Flip),
  conflicts: z.array(ConflictFinding),
  /** Rule ids of state overrides that changed the local limit for this project. */
  applied_overrides: z.array(z.string()),
  sources: z.array(SourceRef),
  disclaimer: z.string(),
});
export type EvaluationResult = z.infer<typeof EvaluationResult>;

/* ------------------------------------------------------------------ */
/* API: errors                                                        */
/* ------------------------------------------------------------------ */

export const ApiError = z.object({
  error: z.object({
    code: z.enum(["BAD_REQUEST", "NOT_FOUND", "INTERNAL", "NOT_IMPLEMENTED"]),
    message: z.string(),
    issues: z.array(z.unknown()).optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

/* ------------------------------------------------------------------ */
/* Shared constants                                                   */
/* ------------------------------------------------------------------ */

export const DISCLAIMER =
  "Prototype only. Not legal advice. Verdicts are 'likely' outcomes based on the written rules we have encoded; " +
  "final determination rests with city staff. Review with a qualified professional before acting.";

export const ENGINE_VERSION = "0.1.0-p0";
