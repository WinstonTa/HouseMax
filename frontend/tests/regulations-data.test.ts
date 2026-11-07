import { describe, expect, it } from "vitest";
import { REGULATIONS } from "@/lib/data";

describe("data/regulations.json provenance", () => {
  it("ids are unique", () => {
    const ids = REGULATIONS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every rule has a source URL and a status", () => {
    for (const r of REGULATIONS) {
      expect(r.source_url, r.id).toMatch(/^https:\/\//);
      expect(["VERIFIED", "UNVERIFIED"]).toContain(r.status);
    }
  });

  it("VERIFIED rules name who checked them and when", () => {
    for (const r of REGULATIONS.filter((x) => x.status === "VERIFIED")) {
      expect(r.verified_by, r.id).toBeTruthy();
      expect(r.last_checked_date, r.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("UNVERIFIED rules never claim a check date", () => {
    for (const r of REGULATIONS.filter((x) => x.status === "UNVERIFIED")) {
      expect(r.last_checked_date, r.id).toBeNull();
      expect(r.audit_text, r.id).toMatch(/^UNVERIFIED/);
    }
  });
});
