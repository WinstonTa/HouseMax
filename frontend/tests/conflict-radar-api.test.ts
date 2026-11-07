import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "@/app/api/cities/[id]/conflict-radar/route";
import { POST } from "@/app/api/conflict-radar/route";
import { auditItems, splitChecklistText } from "@/lib/backend/conflict-radar";
import type { ConflictAudit } from "@/lib/backend/conflict-radar";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as RouteContext<"/api/cities/[id]/conflict-radar">;
const get = (id: string, q = "") => GET(new NextRequest(`http://t/api/cities/${id}/conflict-radar${q}`), ctx(id));
const post = (body: unknown) => POST(new Request("http://t/api/conflict-radar", { method: "POST", body: JSON.stringify(body) }));

describe("auditItems", () => {
  it("surfaces disagreement between the scan and the curated call", () => {
    const r = auditItems(
      [{ item_id: "X", requirement_text: "Setbacks per Gov. Code § 65852.2: 4 ft.", curated_conflict_type: "NONE" }],
      "ADU_DETACHED",
    );
    expect(r.items[0]!.auto_status).toBe("STALE_CITATION");
    expect(r.items[0]!.disagrees_with_curated).toBe(true);
  });

  it("marks discretionary language for human review", () => {
    const r = auditItems([{ item_id: "Y", requirement_text: "HOA approval letter required." }], "ADU_DETACHED");
    expect(r.items[0]!.needs_human_review).toBe(true);
    expect(r.summary.possible_discretionary).toBe(1);
  });
});

describe("splitChecklistText", () => {
  it("strips bullets and numbering and drops blank lines", () => {
    const items = splitChecklistText("1. Site plan\n\n• Floor plan per 65852.2\n(a) Elevations\n- x");
    expect(items.map((i) => i.requirement_text)).toEqual(["Site plan", "Floor plan per 65852.2", "Elevations"]);
  });
});

describe("GET /api/cities/:id/conflict-radar", () => {
  it("audits Santa Ana's (illustrative) ADU checklist and reports its status", async () => {
    const res = await get("city_santa_ana", "?type=adu");
    expect(res.status).toBe(200);
    const body = (await res.json()) as ConflictAudit;
    expect(body.source.checklist_status).toBe("ILLUSTRATIVE");
    expect(body.summary.items).toBeGreaterThan(0);
    expect(body.summary.stale).toBeGreaterThan(0);
  });

  it("404 for unknown city, 400 for bad type", async () => {
    expect((await get("nope")).status).toBe(404);
    expect((await get("city_santa_ana", "?type=condo")).status).toBe(400);
  });
});

describe("POST /api/conflict-radar", () => {
  it("audits pasted text", async () => {
    const res = await post({ text: "JADU deed restriction per Gov. Code 65852.22\nDesign must be compatible with neighborhood character", label: "test" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as ConflictAudit;
    expect(body.source.kind).toBe("pasted_text");
    expect(body.items[0]!.stale_citations[0]!.legacy).toBe("Gov. Code § 65852.22");
    expect(body.items[1]!.discretion_flags[0]!.trigger).toBe("AESTHETIC_GUIDELINE");
  });

  it("400 on empty or oversized text", async () => {
    expect((await post({ text: "" })).status).toBe(400);
    expect((await post({ text: "x".repeat(50_001) })).status).toBe(400);
  });
});
