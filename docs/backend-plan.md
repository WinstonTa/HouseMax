# HouseMax backend: proposal plan (draft for approval)

**Status:** DRAFT v0.1, November 7, 2026. Waiting on owner approval.
**Scope:** backend only. That means the data layer, the evaluation engine, API routes, PDF *data* assembly and tests.
**Out of scope:** UI screens and the visual PDF layout (other devs), unless we agree otherwise.
**Spec:** "Permit Fastrak v1.2" master spec (HouseMax = Permit Fastrak). Lane 2, "Clear it".
**Hard deadline:** submissions close at 2:30 PM today. Every phase below is sized in minutes, not days.

---

## 1. What the backend has to do

A single job: **given a project, tell the user whether a ministerial (by-right) path is likely, prove it with cited
rules, and show what is unknown.** Everything else (Conflict Radar, Flip, Cost of Discretion, clocks, PDF) hangs off
that one evaluation result.

Design principles, in priority order:

1. **Zero false "By-Right Likely".** When in doubt, the engine answers `CANT_TELL_YET`. A confident wrong answer is the worst outcome (event CLAUDE.md and spec KPI).
2. **Every output carries its sources.** Each rule, benchmark and checklist item has `source_url`, `checked_date` and `status` (`VERIFIED` | `UNVERIFIED` | `ASSUMPTION`). The API passes these through so the UI can show them.
3. **Pure functions, no framework inside the engine.** `lib/` has no Next.js imports. The engine is unit-testable, the frontend can call it directly, and API routes are thin wrappers.
4. **One shared contract.** Zod schemas in `lib/schemas.ts` are the single source of types for both teams.
5. **Draft only.** Nothing files, sends or submits. Letters and PDFs are watermarked as drafts.

---

## 2. Issues in the spec to resolve before we seed data

These come from checking the spec against the event rules (`claude-impact-lab-uci/CLAUDE.md`, `docs/ground-rules.md`)
and the lane's verified source list (`lanes/2-clear-it/data/DATA-SOURCES.md`). Several of them break a "rule that does not bend".

| # | Spec item | Problem | Proposed fix |
|---|---|---|---|
| 1 | §7.1 Santa Ana `planning_department_url` (`santa-ana.org`), HCD `santa-ana-adu-memo.pdf` URL, checklist `SA_CHK_ADU_2025`, "J. Doe, Certified Permit Tech #4412", APR medians 58 / 240 days | Not in any verified source. The verified Santa Ana domain is `santa-ana.gov`. These look illustrative, and presenting them as real breaks "never invent". | Seed only from sources we fetch and check. Unknown fields stay `null`. The verifier field reads "Unverified (hackathon team)" until a real technician signs off. |
| 2 | §7.1 `CHK_02`: Santa Ana requires HOA approval | Saying a **real city** imposes an illegal requirement, with no source, is the most damaging kind of invented fact. | Drop it unless we find it in Santa Ana's actual packet. For the Conflict Radar demo, use **Anaheim's November 2025 ADU checklist**: DATA-SOURCES confirms it still cites Gov Code 65852.2 / 65852.22, which makes it a real `STALE_CITATION`. |
| 3 | §7.3 demo parcel "922 E 4th St, APN 398-182-05" and applicant "Marcus Vance, marcus@vancebuilders.com" | Parcel facts are unverified. The applicant has a real-looking business domain. | Applicant becomes obviously fictional (`@example.com`, labeled "made-up"). Parcel: either verify the address and APN against OC GIS, or use a publicly listed lot as the lane suggests, with every assumed attribute flagged. |
| 4 | §2 metrics table (434–492 vs 731 days, +193 / +106 / +504 days, RAND, CA YIMBY 271 days, "28 failure causes", Dana Point NOV with 12 categories) | None of these are in the verified source list. The eScholarship paper is marked UNVERIFIED there, and "28 failure causes" has no citable source. | Put them in `data/benchmarks.json` with `status: "UNVERIFIED"` and the claimed source. The engine and UI show the UNVERIFIED tag until someone opens the source and confirms the number. Drop "28 failure causes" unless we find a source. |
| 5 | Statute cites: height rule at "§ 66321(b)", 60-day ADU clock at "§ 66317", HOA rule at "Civ. Code § 4751 & Gov. Code § 66314" | DATA-SOURCES lists the 60-day ministerial ADU rule under **66314**. Subsection numbers were not verified. | Verify each cite on leginfo or in the HCD March 2026 ADU Handbook (low volume, one fetch each) before encoding. Until then the rule is `UNVERIFIED`, and per §4.3 it cannot produce a by-right verdict. |
| 6 | §8 "verbatim" addendum: "this submittal **qualifies**… staff **are required**…" | Contradicts the spec's own Language Law ("Likely", never "Approved") and the not-legal-advice rule. | Reword to "The applicant asserts this project is likely eligible for ministerial review under…". Add a "DRAFT, prototype, not legal advice, review with counsel" footer on every page. |
| 7 | §8 "submission-ready" PDF | The event rule is prototype only and draft only. | Rename it "Draft application packet for applicant review". |
| 8 | Pilot cities include LA, Long Beach and Compton | The lane's data and verified sources are Orange County. | Seed **Santa Ana + Anaheim** (both have verified ADU pages and pre-approved plan catalogs), plus **Irvine** if time allows (verified submittal list and fee page). Other cities are listed with `null` fields. |
| 9 | Repo: `claude-impact-lab-uci` is committed as a git submodule pointer with no `.gitmodules` | On GitHub it shows as a broken link, so judges see nothing inside it. | Build the app at the HouseMax repo root and treat the boilerplate as read-only reference. Either remove the gitlink and add the folder to `.gitignore`, or add a proper `.gitmodules`. |

---

## 3. Architecture

```
HouseMax/
├─ data/                      # human-readable, auditable JSON (spec §7)
│  ├─ cities.json             # city meta + checklists (items carry source + status)
│  ├─ regulations.json        # state rules as condition trees + provenance
│  ├─ projects.json           # demo projects (made-up, labeled)
│  ├─ citation-map.json       # legacy → current statute numbering (65852.2 → 66310–66342, 2025 renumbers)
│  ├─ benchmarks.json         # delay/timeline numbers with source + VERIFIED/UNVERIFIED/ASSUMPTION
│  ├─ preapproved-plans.json  # Santa Ana (10), Anaheim (4) catalogs: what's public
│  └─ apr/                    # cached, filtered extracts from data.ca.gov APR tables (fetched once)
├─ lib/
│  ├─ schemas.ts              # Zod schemas = shared types for both teams
│  ├─ data.ts                 # loads + validates /data at startup; fails loud on bad records
│  ├─ engine/
│  │  ├─ conditions.ts        # three-valued condition evaluator (PASS/FAIL/UNKNOWN/NOT_APPLICABLE)
│  │  ├─ by-right-engine.ts   # pathway verdicts, confidence, follow-up ranking
│  │  ├─ conflict-radar.ts    # stale-citation detection + curated substantive conflicts
│  │  ├─ discretion-detector.ts
│  │  ├─ by-right-flip.ts
│  │  ├─ cost-of-discretion.ts
│  │  ├─ clocks.ts            # two-clock ledger
│  │  └─ plan-matcher.ts
│  ├─ packet/build-packet.ts  # assembles the PDF view-model (4 modules)
│  └─ letters/shot-clock.ts   # draft notice templates
├─ app/api/…                  # thin Next.js route handlers (see §5)
├─ scripts/fetch-apr.ts       # one-off, low-volume APR pull → data/apr/
└─ tests/                     # Vitest: engine golden cases + safety tests
```

**Stack:** Next.js App Router + TypeScript (per spec), Zod, Vitest, `@react-pdf/renderer` (server-side render in a route). Node v24 is installed.

**Persistence:** the spec says local JSON. Writes to the filesystem don't persist on serverless hosts, so seed data is
read-only and **evaluation is stateless**: the client POSTs the full project and gets the result back. Saving
user projects is a stretch goal (an in-memory store, or writing to `data/` in local dev only).

---

## 4. The engine

### 4.1 Facts with provenance
Every project attribute is wrapped as `{ value, source: "VERIFIED_RECORD" | "UPLOADED_DOC" | "SELF_REPORTED" }`, or is absent.
Absent means `UNKNOWN`. A boolean that was never answered is not the same as `false`. The demo's "Can't Tell → By-Right" moment
depends on this: `within_half_mile_transit` starts out unanswered.

### 4.2 Rules as data
Each rule in `regulations.json` is a small condition tree (`all` / `any` / comparison on a fact path), plus
`applies_when`, `pathway`, `blocking: true|false`, `citation`, `legacy_citation`, `effective_date`, `last_checked_date`, `source_url` and `status`.
Evaluation uses Kleene three-valued logic, so one unknown input makes a condition `UNKNOWN`, not `PASS`.

Pathways in v1: **ADU detached** (fully encoded, the demo vehicle). Pathways modeled, partly encoded and labeled `coverage: PARTIAL`: **JADU, SB 9 two-unit, SB 9 lot split, SB 684 ≤10 parcels, SB 35/423**.

### 4.3 Verdict rules (spec §4.1, made stricter)
Per pathway:
- `DISCRETIONARY_LIKELY` if any blocking condition is `FAIL`, or the city's procedure has a hearing step that state law does not preempt.
- `CANT_TELL_YET` if any blocking condition is `UNKNOWN`, **or a blocking rule is `UNVERIFIED`**, or the pathway's coverage is `PARTIAL`.
- `BY_RIGHT_LIKELY` only when every blocking condition is `PASS` / `NOT_APPLICABLE`, all of them are verified, and coverage is complete.

Every result also lists `not_evaluated`: the conditions we know exist but haven't encoded. The tool says what it didn't check.

**Confidence** is the weakest link across the facts and rules that decided the verdict: verified record or official checklist → HIGH,
uploaded doc → MEDIUM, self-reported → LOW. It is never higher than the weakest input.

**Follow-up engine:** unknown facts ranked by (1) blocking, (2) how many pathways they unblock, (3) whether resolving them could flip the verdict.
Each one comes with a plain-language question.

### 4.4 Feature modules
| Feature | Backend approach | Honesty guard |
|---|---|---|
| **Conflict Radar** | (a) Automatic: regex plus `citation-map.json` finds legacy cites in checklist text → `STALE_CITATION` with the current section. (b) Curated: `SUBSTANTIVE_CONFLICT` only where a human entered it with a source (statute or HCD letter). | The engine never decides a substantive conflict on its own. Unreviewed items are marked `UNREVIEWED`. |
| **Discretion Detector** | Pattern rules on checklist and guideline text (HOA sign-off, "compatible with neighborhood character", design review, discretionary permits, ad-hoc studies) → `POSSIBLE_DISCRETIONARY_TRIGGER`. | Output says "needs human review", never "illegal". |
| **By-Right Flip** | For each `FAIL` on a lever (height, units, sqft, setbacks, parking, use a pre-approved plan): compute the smallest change that passes, re-run the engine to confirm the verdict actually flips, then sort by size of change. | Only flips the engine re-verifies are returned. "Days saved" comes from `benchmarks.json` with its status tag. |
| **Cost of Discretion** | `carrying_cost = delay_months × project_capital × monthly_cost_of_capital`, plus a per-home figure. Every input is returned with its origin label. | Defaults are `ASSUMPTION`. Delays are labeled by geography (e.g. "LA study, UNVERIFIED"). The timeline.json worked example ($85k time cost on a $535k home) is labeled ASSUMPTION too. |
| **Two-Clock Ledger** | Statutory clock from rule data (completeness review and approval deadlines, once verified). Historical clock from **real APR Table A2** extracts on data.ca.gov: median days from entitlement to building permit to certificate of occupancy per city and `UNIT_CAT`. | Shows sample size and what the APR data can't show (e.g. no application-to-permit time in A2). |
| **Shot-Clock Kit** | Fills a template from project dates and the cited deadline → draft letter text and HCD HAU contact (from a verified HCD page). | Mandatory disclaimer from spec §5.6. Never sent. |
| **Pre-Approved Plan Matcher** | Matches a project's lot and setbacks against catalog entries using whatever dimensions the catalogs publish. | Fields the catalogs don't publish are `UNKNOWN`. Stretch goal. |

### 4.5 Where Claude fits (optional, stretch)
`POST /api/checklist/extract`: Claude (`claude-sonnet-5-5`, key in `ANTHROPIC_API_KEY` env var) turns pasted checklist text into structured
items with *suggested* citations and flags. All of it is marked `AI_SUGGESTED` until a person confirms it. This gives a credible
"path to the next 100 cities" for the Scale score, and covers the README's "how Claude is used inside the tool".

---

## 5. API contract (for the frontend team)

All responses are JSON, typed by `lib/schemas.ts`. Each one includes a `disclaimer` and a `sources[]` array.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/cities`, `/api/cities/:id` | City meta, checklists, HCD letters, data status |
| GET | `/api/regulations` | Rule catalog with provenance |
| GET | `/api/projects`, `/api/projects/:id` | Demo projects |
| POST | `/api/evaluate` | `{ project }` → per-pathway verdicts, conditions, confidence, follow-ups, flips, conflicts |
| GET | `/api/cities/:id/conflict-radar?typology=adu` | Checklist audit (stale / substantive / possible-discretionary / unreviewed) |
| POST | `/api/cost-of-discretion` | `{ delays[], capital, rate }` → cost breakdown with labels |
| GET | `/api/cities/:id/clocks?typology=adu` | Statutory and historical clocks |
| POST | `/api/shot-clock-letter` | Draft notice text |
| POST | `/api/packet` and `/api/packet/pdf` | 4-module packet view-model, and the rendered PDF |
| POST | `/api/checklist/extract` | (stretch) Claude-assisted checklist structuring |

I'll publish `lib/schemas.ts` and a mock `POST /api/evaluate` response **in the first 30 minutes**, so the frontend isn't blocked on the engine.

---

## 6. Tests (the safety net)

- **Golden cases:** the three demo states (unknown transit → `CANT_TELL_YET`, transit set → `BY_RIGHT_LIKELY`, height over the cap → `DISCRETIONARY_LIKELY` plus a Flip suggestion).
- **Safety properties** (KPI "0% false by-right"): no `BY_RIGHT_LIKELY` when any blocking rule is unknown, failed or unverified, or when coverage is partial. A randomized test blanks fields one at a time and asserts the verdict never upgrades.
- **Data validation:** every record in `/data` parses with Zod and has `source_url` + `checked_date`, or `status: ASSUMPTION`.
- **Language law:** no API string contains "approved" or "guaranteed" in a verdict context.
- Scenarios C01–C03 from `lanes/2-clear-it/scenarios.json` as API-level tests.

---

## 7. Schedule (today)

| When (approx.) | Phase | Done means |
|---|---|---|
| +0:00–0:30 | **P0 Scaffold and contract.** Next.js + TS + Zod + Vitest. `lib/schemas.ts`, mock `/api/evaluate`. Fix the repo gitlink. | Frontend can build against real types. |
| +0:30–1:30 | **P1 Data + engine core.** Verify ~6 statute cites and the Santa Ana / Anaheim pages (low volume). Seed the JSON. Condition evaluator, verdict, confidence, follow-ups. Golden + safety tests. | `/api/evaluate` is real for the ADU demo and tests are green. |
| +1:30–2:30 | **P2 Differentiators.** Conflict Radar (Anaheim stale cites), Discretion Detector, By-Right Flip, Cost of Discretion. | Demo screens 1 and 2 run on the real backend. |
| +2:30–3:15 | **P3 Packet + clocks.** Packet view-model + PDF route. APR fetch script and city medians. Shot-clock draft. | Demo screen 3 runs. Historical clock shows real APR numbers. |
| +3:15–3:30 | **P4 Hardening.** README sources/assumptions table, mocked-vs-real table, scan for personal info and keys, final commit. | Ready to submit. |

**Cut line, if we fall behind** (drop from the bottom first): Claude extraction → plan matcher → shot-clock kit → APR clocks (fall back to labeled benchmarks) → PDF render (keep the JSON packet).
Never cut: the verdict engine, safety tests, source labels.

---

## 8. Decisions I need from you

1. **Spec fixes in §2:** approve all of them, or tell me which to keep as written (especially #2, #3 and #6).

Answer: I have answered all your questions as "Answer: [answer]" below each of your questions, so reference those for your inquiries.

2. **Who scaffolds Next.js?** If the frontend devs already have an app, I'll put the backend into their structure instead.

Answer: Frontend developers are still working on it, for now create a procedure that makes it easy to integrate the backend to the frontend, creating artifact markdown files that future AI agents can reference in order to successfully and smoothly integrate this backend into the future frontend.

3. **Repo:** build at the HouseMax root and drop the gitlink (recommended)?

Answer: Yes.

4. **Demo parcel:** verify the spec's Santa Ana address, or pick a publicly listed OC lot?

Answer: Publicly hosted OC lot

5. **Claude extraction (§4.5):** in scope as a stretch goal, and is there an API key available?

Answer: API key available, check the .env file. It is called ANTHROPIC_API_KEY.

6. **PDF rendering:** does the backend own `@react-pdf/renderer` rendering, or only the view-model?

Answer: Backend owns `@react-pdf-renderer`.
