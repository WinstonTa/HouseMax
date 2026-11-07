import { describe, expect, it } from "vitest";
import { CITATION_MAP, detectStaleCitations } from "@/lib/backend/stale-citations";

describe("detectStaleCitations", () => {
  it("finds the old ADU section and maps it to the new chapter", () => {
    const hits = detectStaleCitations("Setbacks per Gov. Code § 65852.2: minimum 4 feet.");
    expect(hits).toHaveLength(1);
    expect(hits[0]!.current).toMatch(/66310–66342/);
    expect(hits[0]!.mapping_status).toBe("VERIFIED");
  });

  it("distinguishes 65852.2 from 65852.22 (JADU) and 65852.21 (SB 9)", () => {
    const hits = detectStaleCitations("JADU covenant per 65852.22. SB 9 per 65852.21.");
    expect(hits.map((h) => h.legacy)).toEqual(["Gov. Code § 65852.22"]);
  });

  it("reports multiple hits in document order", () => {
    const hits = detectStaleCitations("See 65852.2 and 65852.22 and again 65852.2(a)(1).");
    expect(hits.map((h) => h.matched)).toEqual(["65852.2", "65852.22", "65852.2"]);
  });

  it("does not flag current citations", () => {
    expect(detectStaleCitations("Gov. Code § 66314(d)(7) and § 66333.")).toHaveLength(0);
  });

  it("does not flag 66324.1-style numbers as the renumbered 66324", () => {
    expect(detectStaleCitations("Section 66324.1")).toHaveLength(0);
  });

  it("every map entry has a source and a status, and VERIFIED ones a check date", () => {
    for (const e of CITATION_MAP) {
      expect(e.source_url).toMatch(/^https:\/\//);
      if (e.status === "VERIFIED") expect(e.checked_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      else expect(e.checked_date).toBeNull();
    }
  });
});
