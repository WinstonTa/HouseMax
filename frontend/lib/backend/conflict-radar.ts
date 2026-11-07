/**
 * Conflict Radar audit service. Runs both automatic detectors over checklist items and lines
 * them up against any human-curated conflict call, showing disagreements instead of hiding them.
 *
 * Used by:
 *   GET  /api/cities/:id/conflict-radar?type=adu|missing_middle  (a registered checklist)
 *   POST /api/conflict-radar                                     (any pasted checklist text)
 */
import type { Checklist, City, ConflictType, ProjectType } from "@/lib/types";
import { DISCLAIMER } from "./schemas";
import { detectDiscretion, type DiscretionFlag } from "./discretion-detector";
import { detectStaleCitations, type StaleCitationHit } from "./stale-citations";

export interface AuditInputItem {
  item_id: string;
  requirement_text: string;
  /** Citation printed on the document, if recorded separately from the text. */
  cited_on_document?: string | null;
  /** A person's curated call, if any. */
  curated_conflict_type?: ConflictType | null;
}

export type AutoStatus = "STALE_CITATION" | "POSSIBLE_DISCRETIONARY_TRIGGER" | "STALE_AND_DISCRETIONARY" | "NO_FLAGS";

export interface AuditedItem {
  item_id: string;
  requirement_text: string;
  curated_conflict_type: ConflictType | null;
  auto_status: AutoStatus;
  stale_citations: StaleCitationHit[];
  discretion_flags: DiscretionFlag[];
  /** True when the automatic scan and the curated call point different ways. */
  disagrees_with_curated: boolean;
  disagreement_note: string | null;
  needs_human_review: boolean;
}

export interface ConflictAudit {
  source: { kind: "registered_checklist" | "pasted_text"; city_id: string | null; checklist_id: string | null; checklist_status: string | null; note: string };
  project_type: ProjectType;
  items: AuditedItem[];
  summary: { items: number; stale: number; possible_discretionary: number; disagreements: number; curated_substantive: number };
  disclaimer: string;
}

function autoStatus(stale: number, disc: number): AutoStatus {
  if (stale && disc) return "STALE_AND_DISCRETIONARY";
  if (stale) return "STALE_CITATION";
  if (disc) return "POSSIBLE_DISCRETIONARY_TRIGGER";
  return "NO_FLAGS";
}

function disagreement(curated: ConflictType | null, stale: number, disc: number): string | null {
  if (curated === null) return null;
  if (curated === "NONE" && stale) return "Curated as no conflict, but the text cites a renumbered statute.";
  if (curated === "NONE" && disc) return "Curated as no conflict, but the text contains discretionary-review language.";
  if (curated === "STALE_CITATION" && !stale) return "Curated as a stale citation, but no renumbered statute number was found in the text.";
  return null;
}

export function auditItems(items: AuditInputItem[], projectType: ProjectType): Omit<ConflictAudit, "source" | "disclaimer"> {
  const audited = items.map((it): AuditedItem => {
    const text = [it.requirement_text, it.cited_on_document && it.cited_on_document !== "None" ? it.cited_on_document : ""].join(" \n ");
    const stale = detectStaleCitations(text);
    const disc = detectDiscretion(it.requirement_text, projectType);
    const curated = it.curated_conflict_type ?? null;
    const note = disagreement(curated, stale.length, disc.length);
    return {
      item_id: it.item_id,
      requirement_text: it.requirement_text,
      curated_conflict_type: curated,
      auto_status: autoStatus(stale.length, disc.length),
      stale_citations: stale,
      discretion_flags: disc,
      disagrees_with_curated: note !== null,
      disagreement_note: note,
      needs_human_review: disc.length > 0 || note !== null || curated === "SUBSTANTIVE_CONFLICT",
    };
  });
  return {
    project_type: projectType,
    items: audited,
    summary: {
      items: audited.length,
      stale: audited.filter((a) => a.stale_citations.length > 0).length,
      possible_discretionary: audited.filter((a) => a.discretion_flags.length > 0).length,
      disagreements: audited.filter((a) => a.disagrees_with_curated).length,
      curated_substantive: audited.filter((a) => a.curated_conflict_type === "SUBSTANTIVE_CONFLICT").length,
    },
  };
}

export function auditChecklist(city: City, checklist: Checklist, projectType: ProjectType): ConflictAudit {
  const core = auditItems(
    checklist.items.map((i) => ({
      item_id: i.item_id,
      requirement_text: i.requirement_text,
      cited_on_document: i.legacy_citation,
      curated_conflict_type: i.conflict_type,
    })),
    projectType,
  );
  return {
    source: {
      kind: "registered_checklist",
      city_id: city.id,
      checklist_id: checklist.checklist_id,
      checklist_status: checklist.status,
      note: checklist.status_note,
    },
    ...core,
    disclaimer: DISCLAIMER,
  };
}

export const MAX_PASTED_CHARS = 50_000;
export const MAX_PASTED_LINES = 500;

/** Splits pasted checklist text into items: one per non-empty line, bullets and numbering stripped. */
export function splitChecklistText(text: string): AuditInputItem[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•▪□☐]|\(?\d{1,3}[.)]|\(?[a-z][.)])\s+/i, "").trim())
    .filter((l) => l.length > 2)
    .slice(0, MAX_PASTED_LINES)
    .map((requirement_text, i) => ({ item_id: `L${i + 1}`, requirement_text }));
}

export function auditText(text: string, projectType: ProjectType, label?: string): ConflictAudit {
  return {
    source: {
      kind: "pasted_text",
      city_id: null,
      checklist_id: null,
      checklist_status: null,
      note: label ? `Pasted text: ${label}. Not verified as the city's current document.` : "Pasted text. Not verified as the city's current document.",
    },
    ...auditItems(splitChecklistText(text), projectType),
    disclaimer: DISCLAIMER,
  };
}
