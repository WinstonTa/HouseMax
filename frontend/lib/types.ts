// Shared domain types for Permit Fastrak (mirrors /data/*.json schemas from Implementation.md §7)

export type ProjectType = "ADU_DETACHED" | "MISSING_MIDDLE";
export type ConflictType = "NONE" | "STALE_CITATION" | "SUBSTANTIVE_CONFLICT";
export type DiscretionTrigger =
  | "HOA_SIGNOFF"
  | "SITE_DEVELOPMENT_PERMIT"
  | "AESTHETIC_GUIDELINE"
  | "TRAFFIC_STUDY"
  | "PUBLIC_HEARING"
  | "OWNER_OCCUPANCY";
export type FireZone = "NONE" | "HIGH" | "VERY_HIGH";
export type ExistingStructure = "SINGLE_FAMILY_RESIDENCE" | "MULTIFAMILY" | "VACANT";
export type DataSource = "VERIFIED" | "UPLOADED" | "SELF_REPORTED";

export type Verdict = "BY_RIGHT_LIKELY" | "DISCRETIONARY_LIKELY" | "CANT_TELL_YET";
export type Confidence = "HIGH" | "MEDIUM" | "LOW";
export type ConditionStatus = "PASS" | "FAIL" | "UNKNOWN" | "NA";

export interface HcdLetter {
  issue_date: string;
  topic: string;
  reference_url: string;
}

export interface ChecklistItem {
  item_id: string;
  requirement_text: string;
  governing_state_statute: string;
  legacy_citation: string;
  conflict_type: ConflictType;
  statutory_note: string;
  category: string;
  discretion_trigger: DiscretionTrigger | null;
  precedent?: string;
}

export interface Checklist {
  checklist_id: string;
  last_verified: string;
  verified_by: string;
  source_document_url: string;
  required_documents: string[];
  items: ChecklistItem[];
}

export interface City {
  id: string;
  name: string;
  county: string;
  planning_department_url: string;
  hcd_housing_element_status: string;
  apr_median_days_adu: number;
  apr_median_days_multifamily: number;
  active_hcd_letters: HcdLetter[];
  checklists: Partial<Record<"adu" | "missing_middle", Checklist>>;
}

/** VERIFIED = a person read the source text. UNVERIFIED rules cannot produce a By-Right verdict. */
export type RuleStatus = "VERIFIED" | "UNVERIFIED";

export interface Regulation {
  id: string;
  code: string;
  modern_citation: string;
  legacy_citation: string;
  /** null = not recorded. */
  effective_date: string | null;
  /** Date a person last read the source. null = never verified. */
  last_checked_date: string | null;
  title: string;
  applies_to: ProjectType[];
  audit_text: string;
  status: RuleStatus;
  source_url: string;
  verified_by: string | null;
  verification_note: string;
}

export interface PreapprovedPlan {
  id: string;
  city_id: string;
  name: string;
  bedrooms: number;
  sqft: number;
  height_feet: number;
  footprint_width_ft: number;
  footprint_depth_ft: number;
  min_lot_area_sqft: number;
  max_slope_pct: number;
}

/** Live, editable project state used by every screen. `null` = not yet known. */
export interface ProjectInput {
  id: string;
  title: string;
  type: ProjectType;
  cityId: string;
  applicant: { name: string; firm: string; email: string; phone: string };
  address: string;
  apn: string;
  lotArea: number;
  lotWidth: number;
  lotDepth: number;
  slopePct: number;
  transit: boolean | null;
  coastal: boolean | null;
  fireZone: FireZone | null;
  existing: ExistingStructure | null;
  units: number;
  height: number;
  sqft: number;
  rearSetback: number;
  sideSetback: number;
  parking: number;
  preapprovedPlanId: string | null;
  affordablePct: number;
  dataSource: DataSource;
}

export type FollowUpField = "transit" | "coastal" | "fireZone" | "existing";

export interface Condition {
  id: string;
  label: string;
  status: ConditionStatus;
  detail: string;
  statute: string;
  blocking: boolean;
  /** Review the city would likely impose if this condition fails. */
  triggeredReview?: ReviewKey;
  /** Which missing field resolves an UNKNOWN. */
  unknownField?: FollowUpField;
  overrideId?: string;
  /** Regulation (data/regulations.json) this condition rests on. Absent = no rule on file. */
  ruleId?: string;
  /** Filled by evaluate(): VERIFIED only when ruleId points at a VERIFIED regulation. */
  ruleStatus?: RuleStatus;
}

export type ReviewKey = "PLANNING_COMMISSION" | "SITE_PLAN_REVIEW" | "EIR" | "COASTAL";

export interface FollowUpQuestion {
  field: FollowUpField;
  question: string;
  why: string;
  blocks: number;
  options: { label: string; value: string }[];
}

export interface Evaluation {
  verdict: Verdict;
  confidence: Confidence;
  conditions: Condition[];
  failed: Condition[];
  unknown: Condition[];
  /** Blocking conditions whose rule is not VERIFIED. Any of these keeps the verdict at CANT_TELL_YET. */
  unverified: Condition[];
  /** One sentence on why the verdict is what it is. Says "likely", never "approved". */
  reason: string;
  appliedOverrides: string[];
  followUps: FollowUpQuestion[];
  triggeredReviews: ReviewKey[];
}

export interface Flip {
  id: string;
  label: string;
  change: string;
  patch: Partial<ProjectInput>;
  resolves: string[];
  daysSaved: number;
}
