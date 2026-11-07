import { describe, expect, it } from "vitest";
import { addBusinessDays, statutoryClocks } from "@/lib/clocks";

describe("addBusinessDays", () => {
  it("skips weekends", () => {
    // 2026-09-04 is a Friday; one business day later is Monday 2026-09-07.
    expect(addBusinessDays("2026-09-04", 1)).toBe("2026-09-07");
    // 2026-09-02 (Wed) + 15 business days = 2026-09-23 (Wed).
    expect(addBusinessDays("2026-09-02", 15)).toBe("2026-09-23");
  });
});

describe("statutoryClocks", () => {
  it("ADU: 15 business days to completeness, then 60 days to decision", () => {
    const c = statutoryClocks("ADU_DETACHED", "2026-09-02");
    expect(c.completenessDeadline).toBe("2026-09-23");
    expect(c.decisionDeadline).toBe("2026-11-22");
    expect(c.decisionDays).toBe(81);
    expect(c.completenessCitation).toBe("Gov. Code § 66317(a)(2)(A)");
  });

  it("ADU: decision clock runs from an earlier completeness date when known", () => {
    const c = statutoryClocks("ADU_DETACHED", "2026-09-02", "2026-09-10");
    expect(c.decisionDeadline).toBe("2026-11-09");
  });

  it("missing-middle: 30-day completeness, no unverified decision deadline", () => {
    const c = statutoryClocks("MISSING_MIDDLE", "2026-09-02");
    expect(c.completenessDeadline).toBe("2026-10-02");
    expect(c.decisionDeadline).toBeNull();
  });
});
