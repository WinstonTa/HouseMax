/**
 * Discretion Detector: flags checklist language that can turn a ministerial project into a
 * discretionary one (HOA sign-offs, subjective design review, hearings, discretionary permits,
 * ad-hoc studies, owner-occupancy rules).
 *
 * A flag is a lead for a person to review, never a legal conclusion. Where the ADU statute
 * basis has been verified on leginfo it is cited; otherwise `basis` is null and the UI should
 * say so.
 */
import type { DiscretionTrigger, ProjectType } from "@/lib/types";

export interface DiscretionFlag {
  trigger: DiscretionTrigger;
  /** Exact text that matched. */
  matched: string;
  index: number;
  /** Why this can be a problem, in plain words. */
  explanation: string;
  /** Verified statute the concern rests on, for this project type, or null. */
  basis: string | null;
  basis_url: string | null;
  needs_human_review: true;
}

interface Pattern {
  trigger: DiscretionTrigger;
  re: RegExp;
  explanation: string;
  /** Verified ADU basis (leginfo, 2026-11-07). No verified multifamily basis yet. */
  aduBasis: { cite: string; url: string } | null;
}

const LEGINFO = (n: string) => `https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=GOV&sectionNum=${n}`;

const PATTERNS: Pattern[] = [
  {
    trigger: "HOA_SIGNOFF",
    re: /\b(HOA|home\s?owners'?\s+association|architectural\s+(review\s+)?committee)\b/gi,
    explanation: "Makes a private association's approval a condition of the city process. A city decision should rest on its own objective standards.",
    aduBasis: { cite: "Gov. Code § 66317(c): only an ADU ordinance consistent with the article may be the basis for delay or denial", url: LEGINFO("66317") },
  },
  {
    trigger: "AESTHETIC_GUIDELINE",
    re: /\b(compatib\w*|harmon\w*|neighbou?rhood\s+character|character\s+of\s+the\s+(neighbou?rhood|area)|to\s+(the\s+)?(staff|director|planner)'?s?\s+satisfaction|aesthetic\w*|architectural\s+(design\s+)?review|design\s+review)\b/gi,
    explanation: "Subjective design language. ADU standards, including architectural review, must be objective.",
    aduBasis: { cite: "Gov. Code § 66314(b)(1): objective standards, including architectural review", url: LEGINFO("66314") },
  },
  {
    trigger: "PUBLIC_HEARING",
    re: /\b(public\s+hearing|public\s+notice|planning\s+commission|notice\s+to\s+(adjacent|neighbou?ring|surrounding)\s+(owners|properties|residents)|neighbou?r\s+notification)\b/gi,
    explanation: "A hearing or notice step implies discretionary review.",
    aduBasis: { cite: "Gov. Code § 66317(a)(1): ADU permits are approved ministerially without discretionary review or a hearing", url: LEGINFO("66317") },
  },
  {
    trigger: "SITE_DEVELOPMENT_PERMIT",
    re: /\b(site\s+development\s+permit|conditional\s+use\s+permit|special\s+use\s+permit|variance|discretionary\s+(review|approval|permit)|zoning\s+administrator)\b/gi,
    explanation: "A discretionary permit step.",
    aduBasis: { cite: "Gov. Code § 66317(a)(1): ministerial notwithstanding local variance or special use permit ordinances", url: LEGINFO("66317") },
  },
  {
    trigger: "TRAFFIC_STUDY",
    re: /\b(traffic\s+(impact\s+)?(study|analysis|report)|trip\s+generation)\b/gi,
    explanation: "An ad-hoc study requirement can stall an otherwise objective review.",
    aduBasis: null,
  },
  {
    trigger: "OWNER_OCCUPANCY",
    re: /\b(owner[-\s]occupan\w*|owner\s+must\s+(reside|live))\b/gi,
    explanation: "Owner-occupancy rules for ADUs are restricted by state law; check the current statute before relying on this requirement.",
    aduBasis: null,
  },
];

export function detectDiscretion(text: string, projectType: ProjectType): DiscretionFlag[] {
  const flags: DiscretionFlag[] = [];
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    const m = p.re.exec(text);
    if (!m) continue; // one flag per trigger per text is enough for review
    const basis = projectType === "ADU_DETACHED" ? p.aduBasis : null;
    flags.push({
      trigger: p.trigger,
      matched: m[0],
      index: m.index,
      explanation: p.explanation,
      basis: basis?.cite ?? null,
      basis_url: basis?.url ?? null,
      needs_human_review: true,
    });
  }
  return flags.sort((a, b) => a.index - b.index);
}
