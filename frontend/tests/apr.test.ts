import { describe, expect, it } from "vitest";
import { APR, MIN_SAMPLE, aprTiming } from "@/lib/apr";

describe("APR medians file", () => {
  it("names its source and limitations", () => {
    expect(APR.source.dataset_url).toMatch(/^https:\/\/data\.ca\.gov\//);
    expect(APR.limitations.join(" ")).toMatch(/no application-submitted date/i);
  });

  it("contains no addresses, APNs or notes", () => {
    expect(JSON.stringify(APR)).not.toMatch(/STREET|APN|NOTES|ADDRESS/i);
  });
});

describe("aprTiming", () => {
  it("returns a real median for a city with enough projects", () => {
    const t = aprTiming("city_santa_ana", "ADU_DETACHED");
    expect(t.median).not.toBeNull();
    expect(t.n).toBeGreaterThanOrEqual(MIN_SAMPLE);
  });

  it("returns unknown when the sample is too small", () => {
    const t = aprTiming("city_compton", "ADU_DETACHED");
    expect(t.median).toBeNull();
    expect(t.note).toMatch(/too few/i);
  });

  it("returns unknown for same-day reporting", () => {
    const t = aprTiming("city_anaheim", "ADU_DETACHED", "entitlement_to_permit_days");
    expect(t.median).toBeNull();
    expect(t.note).toMatch(/same day/i);
  });

  it("explains skipped pulls", () => {
    expect(aprTiming("city_los_angeles", "ADU_DETACHED").note).toMatch(/not fetched/i);
  });

  it("unknown city is unknown, never zero", () => {
    expect(aprTiming("city_nowhere", "ADU_DETACHED").median).toBeNull();
  });
});
