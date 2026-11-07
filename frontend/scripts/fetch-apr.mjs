#!/usr/bin/env node
/**
 * One-off, low-volume pull of HCD Annual Progress Report Table A2 (entitlements, building
 * permits, certificates of occupancy) from data.ca.gov, reduced to per-city timing medians.
 *
 *   node scripts/fetch-apr.mjs        -> writes data/apr-medians.json
 *
 * Data rules (event CLAUDE.md):
 *  - Documented CKAN API, filtered per city and unit category, 5,000 rows per request, a pause
 *    between requests. Large pulls are skipped and listed in `not_fetched`.
 *  - Only date / year / category / tracking-id fields are requested. No addresses, APNs or notes
 *    are fetched or written. Only aggregate statistics are saved.
 *
 * Source: https://data.ca.gov/dataset/housing-element-annual-progress-report-apr-data-by-jurisdiction-and-year
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RESOURCE_ID = "fe505d9b-8c36-42ba-ba30-08bc4f34e022"; // APR Table A2
const API = "https://data.ca.gov/api/3/action/datastore_search";
const PAGE = 5000;
const MAX_ROWS_PER_QUERY = 12_000; // skip anything bigger (volume rule)
const FIELDS = ["JURIS_NAME", "YEAR", "UNIT_CAT", "JURS_TRACKING_ID", "ENT_APPROVE_DT1", "BP_ISSUE_DT1", "CO_ISSUE_DT1"];

const CITIES = {
  city_santa_ana: "SANTA ANA",
  city_anaheim: "ANAHEIM",
  city_irvine: "IRVINE",
  city_long_beach: "LONG BEACH",
  city_compton: "COMPTON",
  city_los_angeles: "LOS ANGELES",
};
const CATEGORIES = { adu: ["ADU"], multifamily: ["5+"] };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let requests = 0;

async function query(filters, offset, limit) {
  const url = new URL(API);
  url.searchParams.set("resource_id", RESOURCE_ID);
  url.searchParams.set("filters", JSON.stringify(filters));
  url.searchParams.set("fields", FIELDS.join(","));
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  requests++;
  const res = await fetch(url, { headers: { "user-agent": "HouseMax hackathon prototype (APR timing medians)" } });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const json = await res.json();
  if (!json.success) throw new Error(JSON.stringify(json.error));
  await sleep(400);
  return json.result;
}

const day = (s) => (s ? Date.parse(String(s).slice(0, 10)) : NaN);
const DAY = 86_400_000;

function stats(values) {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (v.length === 0) return { n: 0, median: null, p25: null, p75: null };
  const q = (p) => v[Math.min(v.length - 1, Math.floor(p * (v.length - 1)))];
  const mid = v.length / 2;
  const median = v.length % 2 ? v[Math.floor(mid)] : Math.round((v[mid - 1] + v[mid]) / 2);
  return { n: v.length, median, p25: q(0.25), p75: q(0.75) };
}

function lag(from, to) {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return NaN;
  const d = Math.round((to - from) / DAY);
  return d >= 0 && d <= 3650 ? d : NaN; // drop negative / >10y data-entry errors
}

async function summarize(juris, cats) {
  const head = await query({ JURIS_NAME: juris, UNIT_CAT: cats }, 0, 0);
  if (head.total > MAX_ROWS_PER_QUERY) return { skipped: true, total_rows: head.total };

  const rows = [];
  for (let off = 0; off < head.total; off += PAGE) rows.push(...(await query({ JURIS_NAME: juris, UNIT_CAT: cats }, off, PAGE)).records);

  // A project can appear in several report years; join rows by tracking id and keep the earliest
  // date seen for each stage. Rows without a tracking id are used on their own.
  const projects = new Map();
  rows.forEach((r, i) => {
    const key = r.JURS_TRACKING_ID ? `t:${r.JURS_TRACKING_ID}` : `row:${i}`;
    const p = projects.get(key) ?? { ent: NaN, bp: NaN, co: NaN };
    const min = (a, b) => (Number.isFinite(a) ? (Number.isFinite(b) ? Math.min(a, b) : a) : b);
    p.ent = min(p.ent, day(r.ENT_APPROVE_DT1));
    p.bp = min(p.bp, day(r.BP_ISSUE_DT1));
    p.co = min(p.co, day(r.CO_ISSUE_DT1));
    projects.set(key, p);
  });
  const list = [...projects.values()];
  const years = [...new Set(rows.map((r) => r.YEAR))].sort();
  return {
    skipped: false,
    total_rows: head.total,
    projects: list.length,
    report_years: years.length ? `${years[0]}–${years[years.length - 1]}` : null,
    entitlement_to_permit_days: stats(list.map((p) => lag(p.ent, p.bp))),
    permit_to_co_days: stats(list.map((p) => lag(p.bp, p.co))),
  };
}

const out = {
  generated_at: new Date().toISOString().slice(0, 10),
  source: {
    title: "HCD Housing Element Annual Progress Report (APR), Table A2",
    dataset_url: "https://data.ca.gov/dataset/housing-element-annual-progress-report-apr-data-by-jurisdiction-and-year",
    resource_id: RESOURCE_ID,
    status: "VERIFIED",
  },
  method:
    "Rows joined across report years by the city's tracking id; earliest date per stage kept. " +
    "Lags outside 0–3,650 days dropped as data-entry errors. Medians, 25th and 75th percentiles in calendar days.",
  limitations: [
    "Table A2 has no application-submitted date, so these are NOT application-to-approval times.",
    "Ministerial projects (most ADUs) often have no entitlement date, so entitlement-to-permit samples are small or empty for ADUs.",
    "Permit-to-certificate-of-occupancy includes construction time, not just city review.",
    "Self-reported by each city to HCD; reporting quality varies by city and year.",
  ],
  categories: { adu: "UNIT_CAT = ADU", multifamily: "UNIT_CAT = 5+" },
  cities: {},
  not_fetched: [],
};

for (const [id, juris] of Object.entries(CITIES)) {
  out.cities[id] = { juris_name: juris };
  for (const [cat, codes] of Object.entries(CATEGORIES)) {
    const s = await summarize(juris, codes.length === 1 ? codes[0] : codes);
    if (s.skipped) {
      out.cities[id][cat] = null;
      out.not_fetched.push({ city_id: id, category: cat, rows: s.total_rows, reason: `Over ${MAX_ROWS_PER_QUERY} rows; skipped under the no-volume-scraping rule.` });
    } else {
      out.cities[id][cat] = s;
    }
    console.log(id, cat, s.skipped ? `skipped (${s.total_rows} rows)` : `${s.total_rows} rows, permit->CO median ${s.permit_to_co_days.median}`);
  }
}
out.requests_made = requests;

const target = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "apr-medians.json");
writeFileSync(target, JSON.stringify(out, null, 2) + "\n");
console.log(`wrote ${target} (${requests} requests)`);
