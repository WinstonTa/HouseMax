/**
 * Real city timing from HCD APR Table A2 (data/apr-medians.json, built by scripts/fetch-apr.mjs).
 * Pure reader that applies a sample-size rule, so thin or degenerate statistics come back as
 * "unknown" instead of a confident number.
 */
import aprJson from "@/data/apr-medians.json";
import type { ProjectType } from "./types";

interface Stat {
  n: number;
  median: number | null;
  p25: number | null;
  p75: number | null;
}
interface CategoryStats {
  total_rows: number;
  projects: number;
  report_years: string | null;
  entitlement_to_permit_days: Stat;
  permit_to_co_days: Stat;
}
interface AprFile {
  generated_at: string;
  source: { title: string; dataset_url: string; resource_id: string; status: string };
  method: string;
  limitations: string[];
  cities: Record<string, { juris_name: string; adu: CategoryStats | null; multifamily: CategoryStats | null }>;
  not_fetched: { city_id: string; category: string; rows: number; reason: string }[];
}

export const APR = aprJson as unknown as AprFile;

/** Fewer projects than this and we report "unknown". */
export const MIN_SAMPLE = 20;

export type AprMetric = "permit_to_co_days" | "entitlement_to_permit_days";

export interface AprTiming {
  /** null = unknown (no data, too few projects, or degenerate reporting). */
  median: number | null;
  p25: number | null;
  p75: number | null;
  n: number;
  reportYears: string | null;
  /** Plain explanation of why the number is or is not shown. */
  note: string;
  sourceLabel: string;
  sourceUrl: string;
}

export function aprTiming(cityId: string, type: ProjectType, metric: AprMetric = "permit_to_co_days"): AprTiming {
  const cat = type === "ADU_DETACHED" ? "adu" : "multifamily";
  const city = APR.cities[cityId];
  const base = {
    sourceLabel: `HCD APR Table A2 (data.ca.gov), pulled ${APR.generated_at}`,
    sourceUrl: APR.source.dataset_url,
  };
  const unknown = (note: string, n = 0, years: string | null = null): AprTiming => ({ median: null, p25: null, p75: null, n, reportYears: years, note, ...base });

  if (!city) return unknown("No APR data pulled for this city.");
  const stats = city[cat];
  if (!stats) {
    const skip = APR.not_fetched.find((x) => x.city_id === cityId && x.category === cat);
    return unknown(skip ? `Not fetched: ${skip.reason}` : "No APR data pulled for this category.");
  }
  const s = stats[metric];
  if (s.n < MIN_SAMPLE) return unknown(`Only ${s.n} project(s) with both dates reported. Too few to give a median.`, s.n, stats.report_years);
  if (s.median === 0 && s.p75 === 0) {
    return unknown("The city reports both dates as the same day for most projects, so the lag can't be measured.", s.n, stats.report_years);
  }
  return {
    median: s.median,
    p25: s.p25,
    p75: s.p75,
    n: s.n,
    reportYears: stats.report_years,
    note: `Median of ${s.n} projects, report years ${stats.report_years}.`,
    ...base,
  };
}
