/**
 * Statutory shot clocks (Two-Clock Ledger, Shot-Clock Kit). Pure date math, no Date.now().
 *
 * ADU (verified on leginfo 2026-11-07):
 *   - Completeness: written determination within 15 BUSINESS days of receipt, else deemed
 *     complete. Gov. Code § 66317(a)(2)(A), (F).
 *   - Decision: approve or deny within 60 days of receiving a COMPLETE application (existing
 *     dwelling on the lot), else deemed approved. Gov. Code § 66317(a)(3).
 *   So without an earlier completeness letter, the latest decision deadline is
 *   receipt + 15 business days + 60 days.
 *
 * Other projects: Permit Streamlining Act completeness, 30 calendar days. Gov. Code § 65943(a)
 * (verified). The streamlined-review decision period (§ 65913.4) is NOT verified, so no decision
 * deadline is computed for it.
 *
 * Holidays are not modeled: business days skip Saturdays and Sundays only.
 */
import { addDays, daysBetween } from "./format";
import type { ProjectType } from "./types";

export interface StatutoryClocks {
  completenessDeadline: string;
  /** Calendar days from submittal to the completeness deadline. */
  completenessDays: number;
  completenessLabel: string;
  completenessCitation: string;
  /** null when no verified decision deadline applies. */
  decisionDeadline: string | null;
  decisionDays: number | null;
  decisionLabel: string;
  decisionCitation: string;
  notes: string[];
}

/** Adds business days (Mon–Fri), skipping weekends only. */
export function addBusinessDays(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const dt = new Date(Date.UTC(y, m - 1, d));
  let left = n;
  while (left > 0) {
    dt.setUTCDate(dt.getUTCDate() + 1);
    const dow = dt.getUTCDay();
    if (dow !== 0 && dow !== 6) left--;
  }
  return dt.toISOString().slice(0, 10);
}

export function statutoryClocks(type: ProjectType, submittedIso: string, deemedCompleteIso?: string): StatutoryClocks {
  if (type === "ADU_DETACHED") {
    const completenessDeadline = addBusinessDays(submittedIso, 15);
    const completeOn = deemedCompleteIso ?? completenessDeadline;
    const decisionDeadline = addDays(completeOn, 60);
    return {
      completenessDeadline,
      completenessDays: daysBetween(submittedIso, completenessDeadline),
      completenessLabel: "Completeness (15 business days)",
      completenessCitation: "Gov. Code § 66317(a)(2)(A)",
      decisionDeadline,
      decisionDays: daysBetween(submittedIso, decisionDeadline),
      decisionLabel: "ADU decision (60 days from complete)",
      decisionCitation: "Gov. Code § 66317(a)(3)",
      notes: [
        deemedCompleteIso
          ? "Decision clock runs from the date the application was determined complete."
          : "Assumes no earlier completeness letter: the application is deemed complete after 15 business days (§ 66317(a)(2)(F)), so this is the latest decision date.",
        "Business days skip weekends only; holidays are not modeled.",
        "If the agency does not act in time, the application is deemed approved (§ 66317(a)(3)).",
      ],
    };
  }
  const completenessDeadline = addDays(submittedIso, 30);
  return {
    completenessDeadline,
    completenessDays: 30,
    completenessLabel: "Completeness (30 days)",
    completenessCitation: "Gov. Code § 65943(a)",
    decisionDeadline: null,
    decisionDays: null,
    decisionLabel: "Streamlined review decision",
    decisionCitation: "Gov. Code § 65913.4 (not verified)",
    notes: ["The streamlined-review decision period has not been verified, so no decision deadline is shown."],
  };
}
