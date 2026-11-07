# HouseMax backend guide

For developers and AI agents working on HouseMax. Read this before changing an API route, the engine or the data.

## Where things are

The backend lives inside the Next.js app in `frontend/`. There is no separate server.

| Path | What it is |
|---|---|
| `frontend/app/api/**/route.ts` | Route handlers (thin: validate, call a `lib/` function, return JSON) |
| `frontend/lib/by-right-engine.ts` | The verdict engine. Pure functions; runs on the server and in the browser |
| `frontend/lib/backend/` | Server-side services: contract (`schemas.ts`), evaluation, Conflict Radar, Discretion Detector, packet, PDF |
| `frontend/lib/api-client.ts` | Typed browser client. Screens call the backend through this, not raw `fetch` |
| `frontend/lib/clocks.ts`, `frontend/lib/apr.ts` | Statutory clock math; reader for real APR timing data |
| `frontend/data/*.json` | Rules, cities, projects, plans, citation map, APR medians |
| `frontend/scripts/fetch-apr.mjs` | One-off APR pull from data.ca.gov |
| `frontend/tests/` | Vitest suite (`npm test`) |

Types the frontend uses are in `frontend/lib/types.ts`. Request bodies are validated with Zod (`lib/backend/schemas.ts`).
A compile-time check fails the build if the Zod schema and `ProjectInput` drift apart.

## Rules that do not bend

1. **Never return BY_RIGHT_LIKELY unless every blocking condition PASSES on a VERIFIED rule.** `tests/engine-safety.test.ts` enforces this over a grid of thousands of projects. Do not weaken it.
2. **Unknown is not no.** `null` on `transit`, `coastal`, `fireZone` or `existing` means UNKNOWN.
3. **No invented facts.** A rule is VERIFIED only when a person read the statute text; record `verified_by`, `last_checked_date` and `source_url`. Anything else is UNVERIFIED, ASSUMPTION or ILLUSTRATIVE, and the UI must show that label.
4. **Say "likely", never "approved" or "guaranteed".** Discretion flags say "needs human review", never "illegal".
5. **Draft only.** Nothing files, emails or submits. PDFs are watermarked DRAFT.
6. **No personal information.** Demo applicants are fictional (`@example.com`, 555 numbers). APR data is stored as aggregates only.

## API

All routes return JSON unless noted. Errors use one shape:

```json
{ "error": { "code": "BAD_REQUEST" | "NOT_FOUND" | "INTERNAL", "message": "…", "issues": [ /* Zod issues */ ] } }
```

| Method | Route | Body / query | Returns |
|---|---|---|---|
| GET | `/api/health` | | Live routes and engine version |
| POST | `/api/evaluate` | `{ project: ProjectInput }` | `{ evaluation, flips, meta: { engine_version, evaluated_at, computed_by, sources[], disclaimer } }` |
| GET | `/api/cities` | | `{ cities, disclaimer }` |
| GET | `/api/cities/:id` | | `{ city }` or 404 (never falls back to another city) |
| GET | `/api/cities/:id/conflict-radar` | `?type=adu\|missing_middle` | `ConflictAudit` for the registered checklist |
| POST | `/api/conflict-radar` | `{ text, projectType?, label? }` (≤ 50,000 chars) | `ConflictAudit` of pasted text, one item per line |
| GET | `/api/regulations` | | Rule catalog with status, source URL and check date |
| GET | `/api/projects` | | Demo projects (fictional) |
| GET | `/api/plans` | `?cityId=` | Pre-approved plan catalog (illustrative dimensions) |
| POST | `/api/packet` | `{ project, docsChecked?, asOf? }` | `PacketModel` (data behind the PDF) |
| POST | `/api/packet/pdf` | same | `application/pdf`, 4-page draft |

### Using it from a screen

```ts
import { fetchEvaluation, fetchCityConflictRadar, auditChecklistText, fetchPacket, fetchPacketPdf } from "@/lib/api-client";
```

The store (`lib/store.tsx`) already calls `/api/evaluate` on every project change (debounced 200 ms). It shows the
local engine's result instantly and swaps in the server result when it arrives. Read
`useProject().evaluationSource` (`"server" | "local" | "local-fallback"`) and `evaluationMeta.sources`.

### Evaluation essentials

`Evaluation` (see `lib/types.ts`):

- `verdict`, `confidence`, `reason`: one sentence explaining the verdict
- `conditions[]`: each has `status` (PASS/FAIL/UNKNOWN), `blocking`, `statute`, `ruleId`, `ruleStatus`
- `unverified[]`: blocking conditions resting on a rule nobody has verified (these force CANT_TELL_YET)
- `followUps[]`: ranked questions for missing facts
- `appliedOverrides[]`: state rules that raised a local limit for this project (e.g. the 18 ft transit height)

Verdict order: a verified blocking FAIL → DISCRETIONARY_LIKELY; any blocking UNKNOWN or unverified → CANT_TELL_YET;
otherwise BY_RIGHT_LIKELY.

## Common changes

**Verify a rule.** Read the section on leginfo. In `data/regulations.json` set `status: "VERIFIED"`, `verified_by`,
`last_checked_date`, `source_url`, a correct `modern_citation`, and an `audit_text` that paraphrases the text you
read. `tests/regulations-data.test.ts` checks the fields.

**Add a condition to the engine.** In `aduConditions` / `missingMiddleConditions`, push a condition with a `ruleId`
pointing at a regulation. If the condition can be UNKNOWN, set `unknownField` and add copy in `FOLLOW_UP_COPY`. Add a
case to `tests/engine-safety.test.ts` or `tests/evaluate-api.test.ts`.

**Add a real city checklist.** Transcribe items from the city's own document into `data/cities.json` with
`status: "VERIFIED"`, `verified_by`, `last_verified`, `source_document_url`, and `legacy_citation` set to the citation
printed on the document. Conflict Radar picks it up automatically. `tests/city-data.test.ts` checks the fields.

**Map another renumbered statute.** Add an entry to `data/citation-map.json` with a regex `pattern` that cannot match
neighbouring sections (see the `65852\.2(?![0-9])` example) and a test in `tests/stale-citations.test.ts`.

**Refresh APR data.** `node frontend/scripts/fetch-apr.mjs`. Keep requests filtered and low-volume. Do not add
address, APN or notes fields.

## Before you push

```bash
cd frontend
npm test
npx next build
```

Commit small and push often. Never commit `.env`.
