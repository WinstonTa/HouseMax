/**
 * By-Right Pathway Engine.
 *
 * Pure functions, no I/O: runs on the server (POST /api/evaluate) and in the browser (instant
 * what-if previews). Every condition names the regulation it rests on (`ruleId`), and
 * `evaluate()` will only return BY_RIGHT_LIKELY when every blocking condition passes on a rule a
 * person has VERIFIED against the statute text (data/regulations.json).
 *
 * Verdict order:
 *   1. a blocking condition FAILS on a verified rule       -> DISCRETIONARY_LIKELY
 *   2. a blocking condition is UNKNOWN, or rests on an
 *      unverified rule (or no rule at all)                 -> CANT_TELL_YET
 *   3. otherwise                                           -> BY_RIGHT_LIKELY
 */
import { REVIEW_PENALTIES } from "./benchmarks";
import { REGULATIONS } from "./data";
import type {
  Condition,
  Confidence,
  Evaluation,
  Flip,
  FollowUpField,
  FollowUpQuestion,
  ProjectInput,
  ReviewKey,
  RuleStatus,
  Verdict,
} from "./types";

// ADU numbers below are from statute text read on leginfo 2026-11-07 (see data/regulations.json).
/** Height a city must allow at minimum: Gov. Code § 66321(b)(4)(A). A floor, not a cap. */
const ADU_FLOOR_HEIGHT = 16;
/** Height a city must allow near major transit / high-quality transit corridor: § 66321(b)(4)(B). */
const ADU_FLOOR_HEIGHT_TRANSIT = 18;
/** Detached ADU total floor area cap: § 66314(d)(5). */
const ADU_MAX_SQFT = 1200;
/** A city may not require more than a 4 ft side/rear setback: § 66314(d)(7). */
const ADU_MAX_REQUIRED_SETBACK = 4;
/** One ADU + one JADU within existing space, plus one detached new ADU: § 66323(a)(1)–(2). */
const ADU_MAX_UNITS = 2;

// Missing-middle numbers come from the original spec and rest on UNVERIFIED rules.
const MM_MAX_MINISTERIAL_UNITS = 10;
const MM_MAX_HEIGHT = 35; // illustrative local standard, no rule on file
const MM_MAX_LOT_SQFT = 217_800; // 5 acres
const MM_AFFORDABLE_THRESHOLD = 10;

function aduConditions(p: ProjectInput): Condition[] {
  const c: Condition[] = [];

  c.push({
    id: "existing",
    label: "Primary dwelling on lot",
    statute: "Gov. Code § 66314(d)(2)",
    ruleId: "STATUTE_ADU_PRIMARY_DWELLING",
    blocking: true,
    unknownField: "existing",
    ...(p.existing === null
      ? { status: "UNKNOWN", detail: "Existing structures not confirmed." }
      : p.existing === "VACANT"
        ? {
            status: "FAIL",
            detail: "An ADU needs a proposed or existing dwelling on the lot. Vacant with no dwelling proposed does not qualify.",
            triggeredReview: "SITE_PLAN_REVIEW" as ReviewKey,
          }
        : { status: "PASS", detail: "Existing dwelling qualifies the lot for an ADU." }),
  });

  c.push({
    id: "units",
    label: "Unit count",
    statute: "Gov. Code § 66323(a)(1)–(2)",
    ruleId: "STATUTE_ADU_UNITS",
    blocking: true,
    ...(p.units <= ADU_MAX_UNITS
      ? { status: "PASS", detail: `${p.units} unit(s) within the single-family-lot allowance (ADU + JADU).` }
      : {
          status: "FAIL",
          detail: `${p.units} units exceeds the ${ADU_MAX_UNITS}-unit single-family-lot allowance this tool models.`,
          triggeredReview: "PLANNING_COMMISSION" as ReviewKey,
        }),
  });

  c.push({
    id: "size",
    label: "Floor area",
    statute: "Gov. Code § 66314(d)(5)",
    ruleId: "STATUTE_ADU_SIZE_SETBACK",
    blocking: true,
    ...(p.sqft <= ADU_MAX_SQFT
      ? { status: "PASS", detail: `${p.sqft.toLocaleString("en-US")} sq ft ≤ ${ADU_MAX_SQFT.toLocaleString("en-US")} sq ft detached cap.` }
      : {
          status: "FAIL",
          detail: `${p.sqft.toLocaleString("en-US")} sq ft exceeds the ${ADU_MAX_SQFT.toLocaleString("en-US")} sq ft detached ADU cap.`,
          triggeredReview: "PLANNING_COMMISSION" as ReviewKey,
        }),
  });

  // Height: 16 ft / 18 ft are what a city MUST allow. Above that, it depends on the local limit.
  let height: Partial<Condition>;
  if (p.height <= ADU_FLOOR_HEIGHT) {
    height = {
      status: "PASS",
      detail: `${p.height} ft ≤ 16 ft, which every city must allow.`,
      ruleId: "STATUTE_ADU_HEIGHT_BASE",
      statute: "Gov. Code § 66321(b)(4)(A)",
    };
  } else if (p.height <= ADU_FLOOR_HEIGHT_TRANSIT && p.transit === true) {
    height = {
      status: "PASS",
      detail: `${p.height} ft ≤ 18 ft, which a city must allow within ½ mile walking distance of major transit.`,
      overrideId: "STATUTE_ADU_HEIGHT_TRANSIT",
      ruleId: "STATUTE_ADU_HEIGHT_TRANSIT",
      statute: "Gov. Code § 66321(b)(4)(B)",
    };
  } else if (p.height <= ADU_FLOOR_HEIGHT_TRANSIT && p.transit === null) {
    height = {
      status: "UNKNOWN",
      detail: `${p.height} ft is guaranteed only if the lot is within ½ mile walking distance of major transit (18 ft floor).`,
      unknownField: "transit",
      ruleId: "STATUTE_ADU_HEIGHT_TRANSIT",
      statute: "Gov. Code § 66321(b)(4)(B)",
    };
  } else {
    const floor = p.transit === true ? ADU_FLOOR_HEIGHT_TRANSIT : ADU_FLOOR_HEIGHT;
    height = {
      status: "UNKNOWN",
      detail: `${p.height} ft is above the ${floor} ft state law guarantees. Whether it is allowed depends on the city's own height limit, which is not on file.`,
      ruleId: p.transit === true ? "STATUTE_ADU_HEIGHT_TRANSIT" : "STATUTE_ADU_HEIGHT_BASE",
      statute: p.transit === true ? "Gov. Code § 66321(b)(4)(B)" : "Gov. Code § 66321(b)(4)(A)",
    };
  }
  c.push({ id: "height", label: "Building height", statute: "", blocking: true, status: "PASS", detail: "", ...height });

  c.push({
    id: "setbacks",
    label: "Side & rear setbacks",
    statute: "Gov. Code § 66314(d)(7)",
    ruleId: "STATUTE_ADU_SIZE_SETBACK",
    blocking: true,
    ...(p.rearSetback >= ADU_MAX_REQUIRED_SETBACK && p.sideSetback >= ADU_MAX_REQUIRED_SETBACK
      ? { status: "PASS", detail: `Rear ${p.rearSetback} ft · side ${p.sideSetback} ft. A city may require no more than 4 ft.` }
      : {
          status: "FAIL",
          detail: `Setbacks under 4 ft (rear ${p.rearSetback}, side ${p.sideSetback}). A city may require up to 4 ft for new construction.`,
          triggeredReview: "SITE_PLAN_REVIEW" as ReviewKey,
        }),
  });

  let parking: Partial<Condition>;
  if (p.transit === true) {
    parking = {
      status: "PASS",
      detail: "No ADU parking standards may be imposed within ½ mile walking distance of public transit.",
      overrideId: "STATUTE_ADU_PARKING_TRANSIT",
      statute: "Gov. Code § 66322(a)(1)",
    };
  } else if (p.parking >= 1) {
    parking = {
      status: "PASS",
      detail: `${p.parking} space(s) provided; a city may require at most 1 per unit or per bedroom.`,
      statute: "Gov. Code § 66314(d)(10)",
    };
  } else if (p.transit === false) {
    parking = {
      status: "UNKNOWN",
      detail: "Off-transit, a city may require up to 1 space. Whether this city does is not on file.",
      statute: "Gov. Code § 66314(d)(10)",
    };
  } else {
    parking = {
      status: "UNKNOWN",
      detail: "0 spaces is guaranteed only within ½ mile walking distance of public transit.",
      unknownField: "transit",
      statute: "Gov. Code § 66322(a)(1)",
    };
  }
  c.push({
    id: "parking",
    label: "Parking",
    statute: "",
    ruleId: "STATUTE_ADU_PARKING_TRANSIT",
    blocking: true,
    status: "PASS",
    detail: "",
    ...parking,
  });

  // Coastal: a CDP is still required, but for ADUs it is decided within 60 days without a
  // required public hearing (Gov. Code § 66329(a)). Advisory, not a by-right blocker.
  c.push({
    id: "coastal",
    label: "Coastal zone",
    statute: "Gov. Code § 66329(a)",
    ruleId: "STATUTE_ADU_COASTAL",
    blocking: false,
    unknownField: "coastal",
    ...(p.coastal === null
      ? { status: "UNKNOWN", detail: "Coastal zone status not confirmed. If coastal, a coastal development permit is also needed." }
      : p.coastal
        ? {
            status: "PASS",
            detail: "Coastal development permit also required. For an ADU it must be decided within 60 days, with no public hearing required.",
          }
        : { status: "PASS", detail: "Outside the Coastal Zone." }),
  });

  c.push({
    id: "fire",
    label: "Fire hazard zone",
    statute: "Gov. Code § 51178 (not verified)",
    blocking: false,
    unknownField: "fireZone",
    ...(p.fireZone === null
      ? { status: "UNKNOWN", detail: "Fire hazard severity zone not confirmed (advisory)." }
      : p.fireZone === "VERY_HIGH"
        ? { status: "PASS", detail: "Very high fire hazard severity zone: expect fire-safety conditions (advisory; rule not verified)." }
        : { status: "PASS", detail: p.fireZone === "HIGH" ? "High fire hazard zone: advisory only." : "Not in a fire hazard severity zone." }),
  });

  return c;
}

function missingMiddleConditions(p: ProjectInput): Condition[] {
  const c: Condition[] = [];

  let units: Partial<Condition>;
  if (p.units < 3) {
    units = { status: "FAIL", detail: "Under 3 units: use the SB 9 two-unit track instead.", ruleId: "STATUTE_SB684" };
  } else if (p.units <= MM_MAX_MINISTERIAL_UNITS) {
    units = {
      status: "PASS",
      detail: `${p.units} units ≤ ${MM_MAX_MINISTERIAL_UNITS}: SB 684 small-subdivision path (rule not verified).`,
      overrideId: "STATUTE_SB684",
      ruleId: "STATUTE_SB684",
    };
  } else if (p.affordablePct >= MM_AFFORDABLE_THRESHOLD) {
    units = {
      status: "PASS",
      detail: `${p.units} units with ${p.affordablePct}% affordable: SB 423 streamlining (rule not verified).`,
      overrideId: "STATUTE_SB423",
      ruleId: "STATUTE_SB423",
    };
  } else {
    units = {
      status: "FAIL",
      detail: `${p.units} units exceeds SB 684's ${MM_MAX_MINISTERIAL_UNITS}-unit cap without ${MM_AFFORDABLE_THRESHOLD}% affordability (rules not verified).`,
      triggeredReview: "PLANNING_COMMISSION",
      ruleId: "STATUTE_SB684",
    };
  }
  c.push({ id: "units", label: "Unit count / pathway", statute: "Gov. Code §§ 65852.28, 66499.41 (SB 684)", blocking: true, status: "PASS", detail: "", ...units });

  c.push({
    id: "lot",
    label: "Lot size",
    statute: "Gov. Code §§ 65852.28, 66499.41 (SB 684)",
    ruleId: "STATUTE_SB684",
    blocking: true,
    ...(p.lotArea <= MM_MAX_LOT_SQFT
      ? { status: "PASS", detail: `${p.lotArea.toLocaleString("en-US")} sq ft ≤ 5 acres (rule not verified).` }
      : { status: "FAIL", detail: "Lot exceeds 5 acres (rule not verified).", triggeredReview: "EIR" as ReviewKey }),
  });

  c.push({
    id: "height",
    label: "Building height",
    statute: "Local zoning standard (illustrative; no rule on file)",
    blocking: true,
    ...(p.height <= MM_MAX_HEIGHT
      ? { status: "PASS", detail: `${p.height} ft ≤ ${MM_MAX_HEIGHT} ft illustrative zone cap.` }
      : {
          status: "FAIL",
          detail: `${p.height} ft exceeds the ${MM_MAX_HEIGHT} ft illustrative zone cap.`,
          triggeredReview: "PLANNING_COMMISSION" as ReviewKey,
        }),
  });

  let parking: Partial<Condition>;
  if (p.transit === true) {
    parking = { status: "PASS", detail: "No minimum parking within ½ mile of a major transit stop (AB 2097).", overrideId: "STATUTE_PARKING_AB2097", ruleId: "STATUTE_PARKING_AB2097" };
  } else if (p.parking >= p.units) {
    parking = { status: "PASS", detail: `${p.parking} spaces ≥ 1 per unit (illustrative local standard).` };
  } else if (p.transit === false) {
    parking = { status: "FAIL", detail: `${p.parking} spaces < 1 per unit off-transit (illustrative local standard).`, triggeredReview: "SITE_PLAN_REVIEW" };
  } else {
    parking = { status: "UNKNOWN", detail: "Reduced parking is guaranteed only near a major transit stop.", ruleId: "STATUTE_PARKING_AB2097" };
  }
  c.push({ id: "parking", label: "Parking", statute: "Gov. Code § 65863.2", blocking: true, unknownField: "transit", status: "PASS", detail: "", ...parking });

  c.push({
    id: "coastal",
    label: "Coastal zone",
    statute: "Gov. Code § 65913.4 (not verified)",
    ruleId: "STATUTE_SB423",
    blocking: true,
    unknownField: "coastal",
    ...(p.coastal === null
      ? { status: "UNKNOWN", detail: "Coastal zone status not confirmed." }
      : p.coastal
        ? { status: "FAIL", detail: "Coastal sites are reported excluded from SB 35 streamlining (rule not verified).", triggeredReview: "COASTAL" as ReviewKey }
        : { status: "PASS", detail: "Outside the Coastal Zone." }),
  });

  c.push({
    id: "fire",
    label: "Fire hazard zone",
    statute: "Gov. Code § 65913.4 (not verified)",
    ruleId: "STATUTE_SB423",
    blocking: true,
    unknownField: "fireZone",
    ...(p.fireZone === null
      ? { status: "UNKNOWN", detail: "Fire hazard severity zone not confirmed." }
      : p.fireZone === "VERY_HIGH"
        ? { status: "FAIL", detail: "Very high fire hazard sites are reported excluded without mitigation (rule not verified).", triggeredReview: "EIR" as ReviewKey }
        : { status: "PASS", detail: "Not an excluded fire hazard site." }),
  });

  c.push({
    id: "existing",
    label: "Existing housing protection",
    statute: "Gov. Code § 65913.4 (not verified)",
    ruleId: "STATUTE_SB423",
    blocking: true,
    unknownField: "existing",
    ...(p.existing === null
      ? { status: "UNKNOWN", detail: "Existing structures / tenancy not confirmed." }
      : p.existing === "MULTIFAMILY"
        ? { status: "FAIL", detail: "Demolishing existing rental units is reported to disqualify streamlining (rule not verified).", triggeredReview: "PLANNING_COMMISSION" as ReviewKey }
        : { status: "PASS", detail: "No protected rental units demolished." }),
  });

  return c;
}

const FOLLOW_UP_COPY: Record<FollowUpField, Omit<FollowUpQuestion, "blocks" | "field">> = {
  transit: {
    question: "Is the parcel within ½ mile walking distance of a major transit stop?",
    why: "For ADUs: raises the guaranteed height to 18 ft (§ 66321(b)(4)(B)) and bars parking standards (§ 66322(a)(1)).",
    options: [
      { label: "Yes, within ½ mile", value: "true" },
      { label: "No", value: "false" },
    ],
  },
  coastal: {
    question: "Is the parcel inside the California Coastal Zone?",
    why: "Coastal sites also need a coastal development permit (Pub. Res. Code § 30600).",
    options: [
      { label: "No", value: "false" },
      { label: "Yes", value: "true" },
    ],
  },
  fireZone: {
    question: "What is the CalFire hazard severity zone?",
    why: "Very-high zones may add conditions or exclude a site from streamlining.",
    options: [
      { label: "None", value: "NONE" },
      { label: "High", value: "HIGH" },
      { label: "Very high", value: "VERY_HIGH" },
    ],
  },
  existing: {
    question: "What currently stands on the lot?",
    why: "Determines eligibility and demolition protections.",
    options: [
      { label: "Single-family home", value: "SINGLE_FAMILY_RESIDENCE" },
      { label: "Multifamily", value: "MULTIFAMILY" },
      { label: "Vacant", value: "VACANT" },
    ],
  },
};

const CONFIDENCE_ORDER: Confidence[] = ["HIGH", "MEDIUM", "LOW"];

const RULE_STATUS = new Map<string, RuleStatus>(REGULATIONS.map((r) => [r.id, r.status]));

/** VERIFIED only when the condition names a rule and that rule is VERIFIED. */
export function ruleStatusOf(c: Pick<Condition, "ruleId">): RuleStatus {
  return c.ruleId && RULE_STATUS.get(c.ruleId) === "VERIFIED" ? "VERIFIED" : "UNVERIFIED";
}

export function evaluate(p: ProjectInput): Evaluation {
  const raw = p.type === "ADU_DETACHED" ? aduConditions(p) : missingMiddleConditions(p);
  const conditions = raw.map((c) => ({ ...c, ruleStatus: ruleStatusOf(c) }));

  const failed = conditions.filter((c) => c.blocking && c.status === "FAIL");
  const verifiedFailed = failed.filter((c) => c.ruleStatus === "VERIFIED");
  const unknown = conditions.filter((c) => c.status === "UNKNOWN");
  const blockingUnknown = unknown.filter((c) => c.blocking);
  const unverified = conditions.filter(
    (c) => c.blocking && (c.status === "PASS" || c.status === "FAIL") && c.ruleStatus !== "VERIFIED",
  );

  let verdict: Verdict;
  let reason: string;
  if (verifiedFailed.length > 0) {
    verdict = "DISCRETIONARY_LIKELY";
    reason = `Fails ${verifiedFailed.map((c) => c.label.toLowerCase()).join(", ")} under verified state rules.`;
  } else if (blockingUnknown.length > 0 || unverified.length > 0) {
    verdict = "CANT_TELL_YET";
    const parts: string[] = [];
    if (blockingUnknown.length > 0) parts.push(`${blockingUnknown.length} blocking condition(s) unknown`);
    if (unverified.length > 0) parts.push(`${unverified.length} rest on rules not yet verified against the statute`);
    reason = `Can't tell yet: ${parts.join("; ")}.`;
  } else {
    verdict = "BY_RIGHT_LIKELY";
    reason = "Every blocking condition passes under state rules verified against the statute text.";
  }

  const baseIdx = p.dataSource === "VERIFIED" ? 0 : p.dataSource === "UPLOADED" ? 1 : 2;
  const confidence = CONFIDENCE_ORDER[Math.min(2, baseIdx + (unknown.length > 0 ? 1 : 0))];

  // Rank follow-ups by how many blocking conditions each missing field unlocks.
  const counts = new Map<FollowUpField, number>();
  for (const c of unknown) {
    if (!c.unknownField) continue;
    counts.set(c.unknownField, (counts.get(c.unknownField) ?? 0) + (c.blocking ? 10 : 1));
  }
  const followUps: FollowUpQuestion[] = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([field, score]) => ({ field, blocks: Math.floor(score / 10), ...FOLLOW_UP_COPY[field] }));

  const triggeredReviews = [...new Set(verifiedFailed.map((c) => c.triggeredReview).filter((r): r is ReviewKey => !!r))];

  return {
    verdict,
    confidence,
    conditions,
    failed,
    unknown,
    unverified,
    reason,
    appliedOverrides: [...new Set(conditions.map((c) => c.overrideId).filter((x): x is string => !!x))],
    followUps,
    triggeredReviews,
  };
}

export function reviewDays(reviews: ReviewKey[]): number {
  return reviews.reduce((sum, r) => sum + (REVIEW_PENALTIES[r].days ?? 0), 0);
}

/** Blocking conditions that are not currently passing (failed or unknown). */
const open = (e: Evaluation) => e.conditions.filter((c) => c.blocking && c.status !== "PASS");

/**
 * Minimal design changes that resolve a failing or unknown blocking condition, each re-checked by
 * running the full engine on the changed project. Only changes that actually resolve something
 * are returned.
 */
export function findFlips(p: ProjectInput): Flip[] {
  const base = evaluate(p);
  if (base.verdict === "BY_RIGHT_LIKELY") return [];
  const baseOpen = open(base);
  if (baseOpen.length === 0) return [];
  const baseDays = reviewDays(base.triggeredReviews);

  const candidates: Omit<Flip, "resolves" | "daysSaved">[] = [];
  if (p.type === "ADU_DETACHED") {
    const floor = p.transit === true ? ADU_FLOOR_HEIGHT_TRANSIT : ADU_FLOOR_HEIGHT;
    if (p.height > floor)
      candidates.push({ id: "height", label: "Trim height to the state floor", change: `${p.height} ft → ${floor} ft`, patch: { height: floor } });
    if (p.sqft > ADU_MAX_SQFT)
      candidates.push({ id: "size", label: "Reduce floor area", change: `${p.sqft} → ${ADU_MAX_SQFT} sq ft`, patch: { sqft: ADU_MAX_SQFT } });
    if (p.units > ADU_MAX_UNITS)
      candidates.push({ id: "units", label: "Reduce unit count", change: `${p.units} → ${ADU_MAX_UNITS} units (ADU + JADU)`, patch: { units: ADU_MAX_UNITS } });
    if (p.rearSetback < ADU_MAX_REQUIRED_SETBACK || p.sideSetback < ADU_MAX_REQUIRED_SETBACK)
      candidates.push({
        id: "setbacks",
        label: "Pull back setbacks",
        change: "Rear & side → 4 ft",
        patch: { rearSetback: Math.max(4, p.rearSetback), sideSetback: Math.max(4, p.sideSetback) },
      });
    if (p.transit !== true && p.parking < 1)
      candidates.push({ id: "parking", label: "Add one parking space", change: "0 → 1 space", patch: { parking: 1 } });
  } else {
    if (p.units > MM_MAX_MINISTERIAL_UNITS) {
      candidates.push({ id: "units", label: "Reduce unit count", change: `${p.units} → ${MM_MAX_MINISTERIAL_UNITS} units (SB 684)`, patch: { units: MM_MAX_MINISTERIAL_UNITS } });
      candidates.push({ id: "afford", label: "Deed-restrict 10% affordable", change: `${p.affordablePct}% → 10% affordable (SB 423)`, patch: { affordablePct: MM_AFFORDABLE_THRESHOLD } });
    }
    if (p.height > MM_MAX_HEIGHT)
      candidates.push({ id: "height", label: "Trim height", change: `${p.height} ft → ${MM_MAX_HEIGHT} ft`, patch: { height: MM_MAX_HEIGHT } });
    if (p.transit !== true && p.parking < p.units)
      candidates.push({ id: "parking", label: "Add parking", change: `${p.parking} → ${p.units} spaces`, patch: { parking: p.units } });
  }

  return candidates
    .map((cand) => {
      const after = evaluate({ ...p, ...cand.patch });
      const afterOpenIds = new Set(open(after).map((c) => c.id));
      const resolves = baseOpen.filter((c) => !afterOpenIds.has(c.id)).map((c) => c.label);
      return { ...cand, resolves, daysSaved: baseDays - reviewDays(after.triggeredReviews) };
    })
    .filter((f) => f.resolves.length > 0);
}

export function applyAllFlips(p: ProjectInput): ProjectInput {
  // Prefer the affordability flip only if unit reduction isn't offered.
  const flips = findFlips(p).filter((f) => f.id !== "afford");
  return flips.reduce<ProjectInput>((acc, f) => ({ ...acc, ...f.patch }), p);
}

export function carryingCost(days: number, capital: number, monthlyRatePct: number): number {
  const months = days / 30.4;
  return months * capital * (monthlyRatePct / 100);
}

export const VERDICT_META: Record<Verdict, { label: string; short: string; tone: "good" | "critical" | "warning" }> = {
  BY_RIGHT_LIKELY: { label: "By-Right Likely", short: "By-Right", tone: "good" },
  DISCRETIONARY_LIKELY: { label: "Discretionary Likely", short: "Discretionary", tone: "critical" },
  CANT_TELL_YET: { label: "Can't Tell Yet", short: "Can't Tell", tone: "warning" },
};
