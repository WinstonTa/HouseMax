/**
 * Conflict Radar, part 1: automatic stale-citation detection.
 *
 * Scans any document text for statute numbers that have been renumbered (data/citation-map.json)
 * and reports the current section. A stale citation is harmless in legal effect but tells the
 * reader the document predates the renumbering, so other content may be out of date too.
 *
 * This never decides a SUBSTANTIVE conflict. That stays a human-curated call.
 */
import citationMapJson from "@/data/citation-map.json";

export interface CitationMapEntry {
  legacy: string;
  pattern: string;
  current: string;
  explanation: string;
  status: "VERIFIED" | "UNVERIFIED";
  source_url: string;
  checked_date: string | null;
  note: string;
}

export interface StaleCitationHit {
  /** Exact text that matched, e.g. "65852.2". */
  matched: string;
  /** Character offset of the match in the scanned text. */
  index: number;
  legacy: string;
  current: string;
  explanation: string;
  mapping_status: "VERIFIED" | "UNVERIFIED";
  source_url: string;
}

export const CITATION_MAP = citationMapJson as CitationMapEntry[];

const COMPILED = CITATION_MAP.map((e) => ({ entry: e, re: new RegExp(e.pattern, "gi") }));

export function detectStaleCitations(text: string): StaleCitationHit[] {
  const hits: StaleCitationHit[] = [];
  for (const { entry, re } of COMPILED) {
    re.lastIndex = 0;
    for (let m = re.exec(text); m !== null; m = re.exec(text)) {
      hits.push({
        matched: m[0],
        index: m.index,
        legacy: entry.legacy,
        current: entry.current,
        explanation: entry.explanation,
        mapping_status: entry.status,
        source_url: entry.source_url,
      });
    }
  }
  return hits.sort((a, b) => a.index - b.index);
}
