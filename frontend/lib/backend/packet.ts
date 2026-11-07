/**
 * Submittal packet view-model: the data behind the 4-page draft PDF (spec §8), built from the
 * same evaluation the screens show. Rendering lives in lib/backend/pdf/PermitApplicationDoc.tsx.
 *
 * Honesty rules applied here (plan §2 #6, #7):
 *  - Every page is marked DRAFT / prototype. Nothing is filed.
 *  - The addendum is an APPLICANT'S STATEMENT that the project is "likely eligible", citing only
 *    rules the engine actually relied on. It is omitted unless the verdict is BY_RIGHT_LIKELY.
 *  - Checklist conflicts are "flagged for review", never "preempted".
 */
import { evaluate, VERDICT_META } from "@/lib/by-right-engine";
import { getChecklist, getCity, REGULATIONS } from "@/lib/data";
import { prettyDate } from "@/lib/format";
import type { ProjectInput } from "@/lib/types";
import { DISCLAIMER, ENGINE_VERSION } from "./schemas";

export interface KV {
  k: string;
  v: string;
}

export interface PacketModel {
  meta: {
    engine_version: string;
    generated_on: string;
    watermark: string;
    footer: string;
    disclaimer: string;
  };
  cover: {
    jurisdiction: string;
    title: string;
    parcel: KV[];
    team: KV[];
    verdict_label: string;
    verdict: string;
    confidence: string;
    reason: string;
  };
  specs: {
    rows: { label: string; detail: string; statute: string; result: string; rule_status: string }[];
    summary: KV[];
  };
  addendum: {
    included: boolean;
    omitted_reason: string | null;
    heading: string;
    to: string;
    jurisdiction: string;
    project: string;
    body: string[];
    statutes: { cite: string; title: string; status: string; checked: string | null; url: string }[];
    flagged_local_requirements: { item_id: string; text: string; statute: string; note: string }[];
    flagged_note: string;
  };
  preflight: {
    checklist_id: string | null;
    checklist_note: string;
    docs: { name: string; included: boolean }[];
    missing: number;
    complete: boolean;
    signoff: string;
  };
}

const yn = (v: boolean | null) => (v === null ? "Unconfirmed" : v ? "Yes" : "No");

/** Builds the addendum sentences from the rules the evaluation actually used. */
function addendumBody(p: ProjectInput, overrideIds: string[]): string[] {
  const body: string[] = [];
  if (p.type === "ADU_DETACHED") {
    body.push(
      "The applicant states that, based on the written state rules listed below, this accessory dwelling unit is likely eligible for ministerial review. " +
        "California Government Code § 66317(a)(1) provides that a permit application for an accessory dwelling unit shall be considered and approved ministerially without discretionary review or a hearing.",
    );
    if (overrideIds.includes("STATUTE_ADU_HEIGHT_TRANSIT"))
      body.push(
        `The proposed height of ${p.height} ft relies on Gov. Code § 66321(b)(4)(B), under which a local height limit must allow at least 18 feet for a detached ADU within one-half mile walking distance of a major transit stop or high-quality transit corridor.`,
      );
    if (overrideIds.includes("STATUTE_ADU_PARKING_TRANSIT"))
      body.push("No parking is proposed in reliance on Gov. Code § 66322(a)(1), under which a local agency shall not impose parking standards for an ADU within one-half mile walking distance of public transit.");
    body.push("The applicant requests that the application be reviewed against objective standards only, and that completeness and decision deadlines under § 66317(a)(2)–(3) be observed.");
  }
  body.push("This statement is a draft prepared with a prototype tool. It is not legal advice and should be reviewed by qualified counsel before use.");
  return body;
}

export function buildPacket(p: ProjectInput, docsChecked: Record<string, boolean>, asOfIso: string): PacketModel {
  const ev = evaluate(p);
  const city = getCity(p.cityId);
  const checklist = getChecklist(city, p.type);
  const byRight = ev.verdict === "BY_RIGHT_LIKELY";
  const docs = (checklist?.required_documents ?? []).map((name) => ({ name, included: !!docsChecked[name] }));
  const missing = docs.filter((d) => !d.included).length;

  const usedRuleIds = new Set(ev.conditions.filter((c) => c.blocking && c.ruleId).map((c) => c.ruleId as string));
  for (const id of ev.appliedOverrides) usedRuleIds.add(id);
  const statutes = REGULATIONS.filter((r) => usedRuleIds.has(r.id)).map((r) => ({
    cite: r.modern_citation,
    title: r.title,
    status: r.status,
    checked: r.last_checked_date,
    url: r.source_url,
  }));

  const illustrative = checklist?.status !== "VERIFIED";

  return {
    meta: {
      engine_version: ENGINE_VERSION,
      generated_on: prettyDate(asOfIso),
      watermark: "DRAFT · NOT FOR SUBMISSION",
      footer: "HouseMax prototype · Draft application packet for applicant review · Not legal advice · Nothing has been filed",
      disclaimer: DISCLAIMER,
    },
    cover: {
      jurisdiction: `City of ${city.name} · ${city.county}`,
      title: p.title,
      parcel: [
        { k: "Address", v: p.address },
        { k: "APN", v: p.apn },
        { k: "Lot area", v: `${p.lotArea.toLocaleString("en-US")} sq ft` },
        { k: "Within ½ mi of major transit", v: yn(p.transit) },
        { k: "Coastal zone", v: yn(p.coastal) },
        { k: "Data source", v: p.dataSource.replace("_", " ").toLowerCase() },
      ],
      team: [
        { k: "Applicant", v: p.applicant.name },
        { k: "Firm", v: p.applicant.firm },
        { k: "Email", v: p.applicant.email },
        { k: "Phone", v: p.applicant.phone },
      ],
      verdict: ev.verdict,
      verdict_label: VERDICT_META[ev.verdict].label,
      confidence: ev.confidence,
      reason: ev.reason,
    },
    specs: {
      rows: ev.conditions.map((c) => ({
        label: c.label,
        detail: c.detail,
        statute: c.statute,
        result: c.status,
        rule_status: c.ruleStatus ?? "UNVERIFIED",
      })),
      summary: [
        { k: "Units", v: String(p.units) },
        { k: "Height", v: `${p.height} ft` },
        { k: "Floor area", v: `${p.sqft.toLocaleString("en-US")} sq ft` },
        { k: "Rear / side setback", v: `${p.rearSetback} / ${p.sideSetback} ft` },
        { k: "Parking", v: String(p.parking) },
      ],
    },
    addendum: {
      included: byRight,
      omitted_reason: byRight ? null : `Omitted: the verdict is ${VERDICT_META[ev.verdict].label}. A ministerial-eligibility statement would not be supported. ${ev.reason}`,
      heading: "APPLICANT'S STATEMENT OF MINISTERIAL ELIGIBILITY (DRAFT)",
      to: "Plan Check and Community Development Staff",
      jurisdiction: `City of ${city.name}`,
      project: `${p.address} (APN ${p.apn})`,
      body: byRight ? addendumBody(p, ev.appliedOverrides) : [],
      statutes,
      flagged_local_requirements: (checklist?.items ?? [])
        .filter((i) => i.conflict_type === "SUBSTANTIVE_CONFLICT")
        .map((i) => ({
          item_id: i.item_id,
          text: i.requirement_text,
          statute: i.governing_state_statute,
          note: illustrative ? "Illustrative item, not from the city's actual checklist" : "Flagged for review",
        })),
      flagged_note: illustrative
        ? `The ${city.name} checklist on file is ILLUSTRATIVE, not taken from the city's documents. Do not cite these items to the city.`
        : "Local requirements flagged for legal review. Not a determination that any requirement is preempted.",
    },
    preflight: {
      checklist_id: checklist?.checklist_id ?? null,
      checklist_note: checklist ? checklist.status_note : "No checklist registered for this city and project type.",
      docs,
      missing,
      complete: docs.length > 0 && missing === 0,
      signoff: checklist?.verified_by ?? "Not verified (no permit technician has reviewed this checklist)",
    },
  };
}
