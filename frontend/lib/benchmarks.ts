import type { ReviewKey } from "./types";

/**
 * Evidence base (spec §2). Every figure carries its geographic origin and a status.
 *
 * None of the delay/median figures below has been opened and confirmed by the team yet: they are
 * the spec's claimed numbers, so they are UNVERIFIED and must be shown with that label.
 * The `source` strings include the label so every screen that prints a source also prints it.
 */
export type BenchmarkStatus = "VERIFIED" | "UNVERIFIED" | "ASSUMPTION";

const UNVERIFIED = " (UNVERIFIED: figure from the spec; source not yet opened and confirmed)";

export const REVIEW_PENALTIES: Record<
  ReviewKey,
  { label: string; days: number | null; source: string; origin: string; status: BenchmarkStatus }
> = {
  PLANNING_COMMISSION: {
    label: "Planning Commission hearing",
    days: 193,
    source: "TestFit (citing LABCI/UCLA)" + UNVERIFIED,
    origin: "Los Angeles baseline",
    status: "UNVERIFIED",
  },
  SITE_PLAN_REVIEW: {
    label: "Site Plan Review",
    days: 106,
    source: "TestFit (citing LABCI/UCLA)" + UNVERIFIED,
    origin: "Los Angeles baseline",
    status: "UNVERIFIED",
  },
  EIR: {
    label: "EIR (CEQA)",
    days: 504,
    source: "TestFit (citing LABCI/UCLA)" + UNVERIFIED,
    origin: "Los Angeles baseline",
    status: "UNVERIFIED",
  },
  COASTAL: {
    label: "Coastal Development Permit",
    days: null,
    source: "No published median",
    origin: "Not quantified",
    status: "UNVERIFIED",
  },
};

export const APPROVAL_MEDIANS = {
  ministerialLow: 434,
  ministerialHigh: 492,
  discretionary: 731,
  source: "UC eScholarship, By Transit, By-Right" + UNVERIFIED,
  origin: "Los Angeles baseline",
  status: "UNVERIFIED" as BenchmarkStatus,
};

export const PIPELINE_STAGES = [
  { label: "Entitlement", days: 403 },
  { label: "Building permit", days: 726 },
  { label: "Final permit", days: 965 },
];
export const PIPELINE_SOURCE = "RAND Corp via Santa Monica Daily Press" + UNVERIFIED;

/**
 * @deprecated Use statutoryClocks() in lib/clocks.ts. ADU completeness is 15 BUSINESS days
 * (Gov. Code § 66317(a)(2)(A)), and the 60-day ADU decision clock runs from a complete application.
 */
export const STATUTORY_CLOCKS = {
  completenessDays: 30, // Gov. Code § 65943(a): Permit Streamlining Act, non-ADU projects
  aduDecisionDays: 60, // Gov. Code § 66317(a)(3), from a complete application
};

/** Fixed demo "as-of" date — keeps renders deterministic (no Date.now()). */
export const AS_OF_DATE = "2026-11-07";

/** ASSUMPTION: illustrative carrying-cost inputs; not sourced. Users can edit them on screen. */
export const DEFAULT_COST = {
  ADU_DETACHED: { capital: 350_000, monthlyRatePct: 0.75 },
  MISSING_MIDDLE: { capital: 4_800_000, monthlyRatePct: 0.75 },
};
