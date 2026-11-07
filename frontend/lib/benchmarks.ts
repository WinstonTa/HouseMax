import type { ReviewKey } from "./types";

/** Evidence base (Implementation.md §2). Every figure carries its geographic origin. */
export const REVIEW_PENALTIES: Record<
  ReviewKey,
  { label: string; days: number | null; source: string; origin: string }
> = {
  PLANNING_COMMISSION: {
    label: "Planning Commission hearing",
    days: 193,
    source: "TestFit (citing LABCI/UCLA)",
    origin: "Los Angeles baseline",
  },
  SITE_PLAN_REVIEW: {
    label: "Site Plan Review",
    days: 106,
    source: "TestFit (citing LABCI/UCLA)",
    origin: "Los Angeles baseline",
  },
  EIR: {
    label: "EIR (CEQA)",
    days: 504,
    source: "TestFit (citing LABCI/UCLA)",
    origin: "Los Angeles baseline",
  },
  COASTAL: {
    label: "Coastal Development Permit",
    days: null,
    source: "No published median",
    origin: "Not quantified",
  },
};

export const APPROVAL_MEDIANS = {
  ministerialLow: 434,
  ministerialHigh: 492,
  discretionary: 731,
  source: "UC eScholarship, By Transit, By-Right",
  origin: "Los Angeles baseline",
};

export const PIPELINE_STAGES = [
  { label: "Entitlement", days: 403 },
  { label: "Building permit", days: 726 },
  { label: "Final permit", days: 965 },
];
export const PIPELINE_SOURCE = "RAND Corp via Santa Monica Daily Press";

export const STATUTORY_CLOCKS = {
  completenessDays: 30,
  aduDecisionDays: 60,
};

/** Fixed demo "as-of" date — keeps renders deterministic (no Date.now()). */
export const AS_OF_DATE = "2026-11-07";

export const DEFAULT_COST = {
  ADU_DETACHED: { capital: 350_000, monthlyRatePct: 0.75 },
  MISSING_MIDDLE: { capital: 4_800_000, monthlyRatePct: 0.75 },
};
