import { REVIEW_PENALTIES } from "./benchmarks";
import type {
  Condition,
  Confidence,
  Evaluation,
  Flip,
  FollowUpField,
  FollowUpQuestion,
  ProjectInput,
  ReviewKey,
  Verdict,
} from "./types";

const ADU_BASE_HEIGHT = 16;
const ADU_TRANSIT_HEIGHT = 18;
const ADU_MAX_SQFT = 1200;
const ADU_MIN_SETBACK = 4;
const ADU_MAX_UNITS = 2; // 1 ADU + 1 JADU
const MM_MAX_MINISTERIAL_UNITS = 10;
const MM_MAX_HEIGHT = 35;
const MM_MAX_LOT_SQFT = 217_800; // 5 acres
const MM_AFFORDABLE_THRESHOLD = 10;

function aduConditions(p: ProjectInput): Condition[] {
  const c: Condition[] = [];

  c.push({
    id: "existing",
    label: "Primary dwelling on lot",
    statute: "Gov. Code § 66314",
    blocking: true,
    unknownField: "existing",
    ...(p.existing === null
      ? { status: "UNKNOWN", detail: "Existing structures not confirmed." }
      : p.existing === "VACANT"
        ? {
            status: "FAIL",
            detail: "ADU needs an existing or concurrently proposed primary dwelling.",
            triggeredReview: "SITE_PLAN_REVIEW" as ReviewKey,
          }
        : { status: "PASS", detail: "Existing residence qualifies the lot for an ADU." }),
  });

  c.push({
    id: "units",
    label: "Unit count",
    statute: "Gov. Code § 66323",
    blocking: true,
    ...(p.units <= ADU_MAX_UNITS
      ? { status: "PASS", detail: `${p.units} unit(s) within the ADU + JADU allowance.` }
      : {
          status: "FAIL",
          detail: `${p.units} units exceeds the ${ADU_MAX_UNITS}-unit ADU/JADU allowance.`,
          triggeredReview: "PLANNING_COMMISSION" as ReviewKey,
        }),
  });

  c.push({
    id: "size",
    label: "Floor area",
    statute: "Gov. Code § 66321",
    blocking: true,
    ...(p.sqft <= ADU_MAX_SQFT
      ? { status: "PASS", detail: `${p.sqft.toLocaleString("en-US")} sq ft ≤ ${ADU_MAX_SQFT.toLocaleString("en-US")} sq ft.` }
      : {
          status: "FAIL",
          detail: `${p.sqft.toLocaleString("en-US")} sq ft exceeds the ${ADU_MAX_SQFT.toLocaleString("en-US")} sq ft state cap.`,
          triggeredReview: "PLANNING_COMMISSION" as ReviewKey,
        }),
  });

  // Height depends on transit proximity
  let height: Partial<Condition>;
  if (p.height <= ADU_BASE_HEIGHT) {
    height = { status: "PASS", detail: `${p.height} ft ≤ ${ADU_BASE_HEIGHT} ft baseline cap.` };
  } else if (p.height <= ADU_TRANSIT_HEIGHT) {
    if (p.transit === true) {
      height = {
        status: "PASS",
        detail: `${p.height} ft allowed — 18 ft cap applies within ½ mile of transit.`,
        overrideId: "STATUTE_ADU_HEIGHT_TRANSIT",
      };
    } else if (p.transit === false) {
      height = {
        status: "FAIL",
        detail: `${p.height} ft exceeds the ${ADU_BASE_HEIGHT} ft cap for non-transit lots.`,
        triggeredReview: "PLANNING_COMMISSION",
      };
    } else {
      height = {
        status: "UNKNOWN",
        detail: `${p.height} ft passes only if the lot is within ½ mile of major transit.`,
      };
    }
  } else {
    height = {
      status: "FAIL",
      detail: `${p.height} ft exceeds the ${ADU_TRANSIT_HEIGHT} ft maximum state allowance.`,
      triggeredReview: "PLANNING_COMMISSION",
    };
  }
  c.push({
    id: "height",
    label: "Building height",
    statute: "Gov. Code § 66321(b)",
    blocking: true,
    unknownField: "transit",
    status: "PASS",
    detail: "",
    ...height,
  });

  c.push({
    id: "setbacks",
    label: "Side & rear setbacks",
    statute: "Gov. Code § 66314(d)(7)",
    blocking: true,
    ...(p.rearSetback >= ADU_MIN_SETBACK && p.sideSetback >= ADU_MIN_SETBACK
      ? { status: "PASS", detail: `Rear ${p.rearSetback} ft · side ${p.sideSetback} ft (min 4 ft).` }
      : {
          status: "FAIL",
          detail: `Setbacks under 4 ft (rear ${p.rearSetback}, side ${p.sideSetback}) need a variance.`,
          triggeredReview: "SITE_PLAN_REVIEW" as ReviewKey,
        }),
  });

  let parking: Partial<Condition>;
  if (p.transit === true) {
    parking = {
      status: "PASS",
      detail: "No parking minimum within ½ mile of transit (AB 2097).",
      overrideId: "STATUTE_PARKING_AB2097",
    };
  } else if (p.parking >= 1) {
    parking = { status: "PASS", detail: `${p.parking} space(s) provided.` };
  } else if (p.transit === false) {
    parking = {
      status: "FAIL",
      detail: "Off-transit lots may require 1 space per ADU; 0 provided.",
      triggeredReview: "SITE_PLAN_REVIEW",
    };
  } else {
    parking = { status: "UNKNOWN", detail: "0 spaces is allowed only near major transit." };
  }
  c.push({
    id: "parking",
    label: "Parking",
    statute: "Gov. Code § 65863.2 / § 66322",
    blocking: true,
    unknownField: "transit",
    status: "PASS",
    detail: "",
    ...parking,
  });

  c.push({
    id: "coastal",
    label: "Coastal zone",
    statute: "Pub. Res. Code § 30600",
    blocking: true,
    unknownField: "coastal",
    ...(p.coastal === null
      ? { status: "UNKNOWN", detail: "Coastal zone status not confirmed." }
      : p.coastal
        ? {
            status: "FAIL",
            detail: "Coastal Development Permit may introduce appealable review.",
            triggeredReview: "COASTAL" as ReviewKey,
          }
        : { status: "PASS", detail: "Outside the Coastal Zone." }),
  });

  c.push({
    id: "fire",
    label: "Fire hazard zone",
    statute: "Gov. Code § 51178",
    blocking: false,
    unknownField: "fireZone",
    ...(p.fireZone === null
      ? { status: "UNKNOWN", detail: "Fire hazard severity zone not confirmed (advisory)." }
      : p.fireZone === "VERY_HIGH"
        ? { status: "PASS", detail: "VHFHSZ: ADU still ministerial, but expect CalFire defensible-space conditions." }
        : { status: "PASS", detail: p.fireZone === "HIGH" ? "High FHSZ — advisory only." : "Not in a fire hazard severity zone." }),
  });

  return c;
}

function missingMiddleConditions(p: ProjectInput): Condition[] {
  const c: Condition[] = [];

  let units: Partial<Condition>;
  if (p.units < 3) {
    units = { status: "FAIL", detail: "Under 3 units — use the SB 9 two-unit track instead." };
  } else if (p.units <= MM_MAX_MINISTERIAL_UNITS) {
    units = {
      status: "PASS",
      detail: `${p.units} units ≤ ${MM_MAX_MINISTERIAL_UNITS} — SB 684 ministerial pathway.`,
      overrideId: "STATUTE_SB684",
    };
  } else if (p.affordablePct >= MM_AFFORDABLE_THRESHOLD) {
    units = {
      status: "PASS",
      detail: `${p.units} units with ${p.affordablePct}% affordable — SB 423 streamlining.`,
      overrideId: "STATUTE_SB423",
    };
  } else {
    units = {
      status: "FAIL",
      detail: `${p.units} units exceeds SB 684's ${MM_MAX_MINISTERIAL_UNITS}-unit cap without ${MM_AFFORDABLE_THRESHOLD}% affordability.`,
      triggeredReview: "PLANNING_COMMISSION",
    };
  }
  c.push({ id: "units", label: "Unit count / pathway", statute: "Gov. Code § 65852.28", blocking: true, status: "PASS", detail: "", ...units });

  c.push({
    id: "lot",
    label: "Lot size",
    statute: "Gov. Code § 65852.28",
    blocking: true,
    ...(p.lotArea <= MM_MAX_LOT_SQFT
      ? { status: "PASS", detail: `${p.lotArea.toLocaleString("en-US")} sq ft ≤ 5 acres.` }
      : { status: "FAIL", detail: "Lot exceeds 5 acres.", triggeredReview: "EIR" as ReviewKey }),
  });

  c.push({
    id: "height",
    label: "Building height",
    statute: "Objective local standard (illustrative)",
    blocking: true,
    ...(p.height <= MM_MAX_HEIGHT
      ? { status: "PASS", detail: `${p.height} ft ≤ ${MM_MAX_HEIGHT} ft zone cap.` }
      : {
          status: "FAIL",
          detail: `${p.height} ft exceeds the ${MM_MAX_HEIGHT} ft zone cap.`,
          triggeredReview: "PLANNING_COMMISSION" as ReviewKey,
        }),
  });

  let parking: Partial<Condition>;
  if (p.transit === true) {
    parking = { status: "PASS", detail: "No parking minimum near transit (AB 2097).", overrideId: "STATUTE_PARKING_AB2097" };
  } else if (p.parking >= p.units) {
    parking = { status: "PASS", detail: `${p.parking} spaces ≥ 1 per unit.` };
  } else if (p.transit === false) {
    parking = { status: "FAIL", detail: `${p.parking} spaces < 1 per unit off-transit.`, triggeredReview: "SITE_PLAN_REVIEW" };
  } else {
    parking = { status: "UNKNOWN", detail: "Reduced parking is allowed only near major transit." };
  }
  c.push({ id: "parking", label: "Parking", statute: "Gov. Code § 65863.2", blocking: true, unknownField: "transit", status: "PASS", detail: "", ...parking });

  c.push({
    id: "coastal",
    label: "Coastal zone",
    statute: "Gov. Code § 65913.4(a)(6)",
    blocking: true,
    unknownField: "coastal",
    ...(p.coastal === null
      ? { status: "UNKNOWN", detail: "Coastal zone status not confirmed." }
      : p.coastal
        ? { status: "FAIL", detail: "Coastal sites are excluded from streamlining.", triggeredReview: "COASTAL" as ReviewKey }
        : { status: "PASS", detail: "Outside the Coastal Zone." }),
  });

  c.push({
    id: "fire",
    label: "Fire hazard zone",
    statute: "Gov. Code § 65913.4(a)(6)(D)",
    blocking: true,
    unknownField: "fireZone",
    ...(p.fireZone === null
      ? { status: "UNKNOWN", detail: "Fire hazard severity zone not confirmed." }
      : p.fireZone === "VERY_HIGH"
        ? { status: "FAIL", detail: "VHFHSZ sites are excluded without adopted mitigation.", triggeredReview: "EIR" as ReviewKey }
        : { status: "PASS", detail: "Not an excluded fire hazard site." }),
  });

  c.push({
    id: "existing",
    label: "Existing housing protection",
    statute: "Gov. Code § 65913.4(a)(7)",
    blocking: true,
    unknownField: "existing",
    ...(p.existing === null
      ? { status: "UNKNOWN", detail: "Existing structures / tenancy not confirmed." }
      : p.existing === "MULTIFAMILY"
        ? { status: "FAIL", detail: "Demolishing existing rental units disqualifies streamlining.", triggeredReview: "PLANNING_COMMISSION" as ReviewKey }
        : { status: "PASS", detail: "No protected rental units demolished." }),
  });

  return c;
}

const FOLLOW_UP_COPY: Record<FollowUpField, Omit<FollowUpQuestion, "blocks" | "field">> = {
  transit: {
    question: "Is the parcel within ½ mile of a major transit stop?",
    why: "Unlocks the 18 ft height allowance and AB 2097 zero-parking rule.",
    options: [
      { label: "Yes, within ½ mile", value: "true" },
      { label: "No", value: "false" },
    ],
  },
  coastal: {
    question: "Is the parcel inside the California Coastal Zone?",
    why: "Coastal sites may require a Coastal Development Permit.",
    options: [
      { label: "No", value: "false" },
      { label: "Yes", value: "true" },
    ],
  },
  fireZone: {
    question: "What is the CalFire hazard severity zone?",
    why: "Very-high zones can exclude a site from streamlining.",
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

export function evaluate(p: ProjectInput): Evaluation {
  const conditions = p.type === "ADU_DETACHED" ? aduConditions(p) : missingMiddleConditions(p);
  const failed = conditions.filter((c) => c.blocking && c.status === "FAIL");
  const unknown = conditions.filter((c) => c.status === "UNKNOWN");
  const blockingUnknown = unknown.filter((c) => c.blocking);

  const verdict: Verdict =
    failed.length > 0 ? "DISCRETIONARY_LIKELY" : blockingUnknown.length > 0 ? "CANT_TELL_YET" : "BY_RIGHT_LIKELY";

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

  const triggeredReviews = [...new Set(failed.map((c) => c.triggeredReview).filter((r): r is ReviewKey => !!r))];

  return {
    verdict,
    confidence,
    conditions,
    failed,
    unknown,
    appliedOverrides: [...new Set(conditions.map((c) => c.overrideId).filter((x): x is string => !!x))],
    followUps,
    triggeredReviews,
  };
}

export function reviewDays(reviews: ReviewKey[]): number {
  return reviews.reduce((sum, r) => sum + (REVIEW_PENALTIES[r].days ?? 0), 0);
}

/** Minimal changes that flip DISCRETIONARY → BY-RIGHT (or remove a failure). */
export function findFlips(p: ProjectInput): Flip[] {
  const base = evaluate(p);
  if (base.failed.length === 0) return [];
  const baseDays = reviewDays(base.triggeredReviews);

  const candidates: Omit<Flip, "resolves" | "daysSaved">[] = [];
  if (p.type === "ADU_DETACHED") {
    const cap = p.transit === true ? ADU_TRANSIT_HEIGHT : ADU_BASE_HEIGHT;
    if (p.height > cap)
      candidates.push({ id: "height", label: "Trim height", change: `${p.height} ft → ${cap} ft`, patch: { height: cap } });
    if (p.sqft > ADU_MAX_SQFT)
      candidates.push({ id: "size", label: "Reduce floor area", change: `${p.sqft} → ${ADU_MAX_SQFT} sq ft`, patch: { sqft: ADU_MAX_SQFT } });
    if (p.units > ADU_MAX_UNITS)
      candidates.push({ id: "units", label: "Reduce unit count", change: `${p.units} → ${ADU_MAX_UNITS} units (ADU + JADU)`, patch: { units: ADU_MAX_UNITS } });
    if (p.rearSetback < ADU_MIN_SETBACK || p.sideSetback < ADU_MIN_SETBACK)
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
      const resolves = base.failed.filter((f) => !after.failed.some((a) => a.id === f.id)).map((f) => f.label);
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
