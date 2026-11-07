/**
 * MOCK evaluator for P0. Returns contract-correct EvaluationResult objects so the frontend can
 * build against real shapes before the engine lands (P1). Every result has `is_mock: true`.
 *
 * It reacts to two inputs only, to support the three demo states:
 *   - transit flag absent            -> CANT_TELL_YET
 *   - transit true, height <= limit  -> BY_RIGHT_LIKELY
 *   - height over the limit          -> DISCRETIONARY_LIKELY + a By-Right Flip
 *
 * The height limits (16 ft / 18 ft near transit) come from the spec and are UNVERIFIED here.
 * Do not treat any mock output as a real determination.
 */
import {
  DISCLAIMER,
  ENGINE_VERSION,
  type ConditionEvaluation,
  type EvaluationResult,
  type ProjectInput,
  type Verdict,
} from "@/lib/backend/schemas";

const ADU_STATUTE_URL =
  "https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=66314";

const MOCK_BASE_HEIGHT_FT = 16; // UNVERIFIED (spec value)
const MOCK_TRANSIT_HEIGHT_FT = 18; // UNVERIFIED (spec value)

export function mockEvaluate(project: ProjectInput): EvaluationResult {
  const transit = project.parcel.within_half_mile_major_transit;
  const height = project.specs.proposed_height_feet;

  const limit = transit?.value === true ? MOCK_TRANSIT_HEIGHT_FT : MOCK_BASE_HEIGHT_FT;

  const transitCond: ConditionEvaluation = {
    rule_id: "MOCK_ADU_TRANSIT_PROXIMITY",
    label: "Within one-half mile of a major transit stop",
    result: transit === undefined ? "UNKNOWN" : transit.value ? "PASS" : "NOT_APPLICABLE",
    blocking: transit === undefined && (height?.value ?? 0) > MOCK_BASE_HEIGHT_FT,
    explanation:
      transit === undefined
        ? "Transit proximity was not provided. It decides which height limit applies."
        : transit.value
          ? "Project reports transit proximity, so the higher state height allowance is applied."
          : "Not near major transit; the base height limit applies.",
    citation: "CA Gov. Code § 66321 (subsection UNVERIFIED)",
    legacy_citation: "CA Gov. Code § 65852.2",
    facts_used: ["parcel.within_half_mile_major_transit"],
    weakest_fact_source: transit?.source ?? null,
    rule_status: "UNVERIFIED",
    source_url: null,
  };

  let heightResult: ConditionEvaluation["result"] = "UNKNOWN";
  if (height !== undefined) {
    if (height.value <= MOCK_BASE_HEIGHT_FT) heightResult = "PASS";
    else if (transit === undefined) heightResult = "UNKNOWN";
    else heightResult = height.value <= limit ? "PASS" : "FAIL";
  }

  const heightCond: ConditionEvaluation = {
    rule_id: "MOCK_ADU_HEIGHT",
    label: `Detached ADU height within the applicable limit`,
    result: heightResult,
    blocking: true,
    explanation:
      height === undefined
        ? "Proposed height was not provided."
        : `Proposed ${height.value} ft vs. limit ${transit === undefined ? "unknown (depends on transit)" : `${limit} ft`}.`,
    citation: "CA Gov. Code § 66321 (subsection UNVERIFIED)",
    legacy_citation: "CA Gov. Code § 65852.2(c)(2)(D) (UNVERIFIED)",
    facts_used: ["specs.proposed_height_feet", "parcel.within_half_mile_major_transit"],
    weakest_fact_source: height?.source ?? null,
    rule_status: "UNVERIFIED",
    source_url: null,
  };

  const conditions = [transitCond, heightCond];
  let verdict: Verdict = "CANT_TELL_YET";
  if (conditions.some((c) => c.blocking && c.result === "FAIL")) verdict = "DISCRETIONARY_LIKELY";
  else if (conditions.some((c) => c.blocking && c.result === "UNKNOWN") || heightResult === "UNKNOWN")
    verdict = "CANT_TELL_YET";
  else verdict = "BY_RIGHT_LIKELY";

  const reason = {
    CANT_TELL_YET: "A blocking condition is unknown. Answer the follow-up questions to continue.",
    DISCRETIONARY_LIKELY: "The proposed height is over the applicable limit, so ministerial review is unlikely.",
    BY_RIGHT_LIKELY: "All mocked blocking conditions pass. (MOCK: real engine lands in P1.)",
  }[verdict];

  const result: EvaluationResult = {
    engine_version: ENGINE_VERSION,
    is_mock: true,
    evaluated_at: new Date().toISOString(),
    project_title: project.title,
    jurisdiction_id: project.jurisdiction_id,
    overall: {
      verdict,
      confidence: "LOW",
      best_pathway_id: "ADU_DETACHED",
      summary: `MOCK: ${reason}`,
    },
    pathways: [
      {
        pathway_id: "ADU_DETACHED",
        label: "Detached ADU (Gov. Code §§ 66310–66342)",
        coverage: "PARTIAL",
        verdict,
        confidence: "LOW",
        reason,
        conditions,
        not_evaluated: ["Setbacks", "Unit size", "Owner-occupancy", "Fire and coastal constraints"],
        statutory_clock_days: 60,
      },
      {
        pathway_id: "SB9_TWO_UNIT",
        label: "SB 9 two-unit development (Gov. Code § 65852.21)",
        coverage: "PARTIAL",
        verdict: "CANT_TELL_YET",
        confidence: "LOW",
        reason: "MOCK: SB 9 pathway is not encoded yet.",
        conditions: [],
        not_evaluated: ["All SB 9 eligibility tests"],
        statutory_clock_days: null,
      },
    ],
    follow_ups:
      transit === undefined
        ? [
            {
              fact_path: "parcel.within_half_mile_major_transit",
              question: "Is the lot within one-half mile walking distance of a major transit stop?",
              priority: 1,
              blocking: true,
              unblocks_pathways: ["ADU_DETACHED"],
              could_flip_verdict: true,
            },
          ]
        : [],
    flips:
      verdict === "DISCRETIONARY_LIKELY" && height !== undefined
        ? [
            {
              pathway_id: "ADU_DETACHED",
              rule_id: "MOCK_ADU_HEIGHT",
              lever: "specs.proposed_height_feet",
              from: height.value,
              to: limit,
              change_description: `Reduce height from ${height.value} ft to ${limit} ft.`,
              resulting_verdict: "BY_RIGHT_LIKELY",
              verified_by_rerun: false,
              estimated_days_avoided: {
                value: null,
                benchmark_id: "BM_PLANNING_COMMISSION_DELAY",
                status: "UNVERIFIED",
                label: "Unknown until the benchmark source is verified (spec claims +193 days, LA data).",
              },
            },
          ]
        : [],
    conflicts: [],
    applied_overrides: transit?.value === true ? ["MOCK_ADU_TRANSIT_PROXIMITY"] : [],
    sources: [
      {
        id: "SRC_GOV_66314",
        label: "CA Gov. Code § 66314 (ADU ministerial approval)",
        url: ADU_STATUTE_URL,
        status: "UNVERIFIED",
        checked_date: null,
      },
    ],
    disclaimer: DISCLAIMER,
  };

  return result;
}
