/**
 * Safety properties for the spec's KPI "False By-Right Assurance: 0.0%".
 * These run the engine over a grid of projects and assert the verdict can only be
 * BY_RIGHT_LIKELY when every blocking condition passes on a VERIFIED rule.
 */
import { describe, expect, it } from "vitest";
import { evaluate, findFlips } from "@/lib/by-right-engine";
import { DEMO_PROJECTS } from "@/lib/data";
import type { ExistingStructure, FireZone, ProjectInput } from "@/lib/types";

const adu = DEMO_PROJECTS.find((p) => p.type === "ADU_DETACHED")!;
const mm = DEMO_PROJECTS.find((p) => p.type === "MISSING_MIDDLE")!;

function* grid(base: ProjectInput): Generator<ProjectInput> {
  const tri = [true, false, null] as const;
  const fires: (FireZone | null)[] = ["NONE", "HIGH", "VERY_HIGH", null];
  const existing: (ExistingStructure | null)[] = ["SINGLE_FAMILY_RESIDENCE", "MULTIFAMILY", "VACANT", null];
  for (const transit of tri)
    for (const coastal of tri)
      for (const fireZone of fires)
        for (const ex of existing)
          for (const height of [12, 16, 17.5, 18, 22, 40])
            for (const sqft of [500, 800, 1200, 1500])
              for (const parking of [0, 1])
                yield { ...base, transit, coastal, fireZone, existing: ex, height, sqft, parking };
}

describe("never a false By-Right", () => {
  for (const [name, base] of [["ADU", adu], ["missing-middle", mm]] as const) {
    it(`${name}: BY_RIGHT_LIKELY only if every blocking condition PASSES on a VERIFIED rule`, () => {
      let byRight = 0;
      for (const p of grid(base)) {
        const e = evaluate(p);
        if (e.verdict !== "BY_RIGHT_LIKELY") continue;
        byRight++;
        for (const c of e.conditions.filter((x) => x.blocking)) {
          expect(c.status, `${c.id} in ${JSON.stringify(p)}`).toBe("PASS");
          expect(c.ruleStatus, c.id).toBe("VERIFIED");
        }
      }
      // ADU rules are verified, so some grid points should reach By-Right; SB 684/SB 35 rules are not.
      if (name === "ADU") expect(byRight).toBeGreaterThan(0);
      else expect(byRight).toBe(0);
    });
  }

  it("answering an unknown never turns a non-By-Right ADU into By-Right unless the answer earns it", () => {
    // Blanking transit must never produce By-Right where the true answer (false) does not.
    for (const p of grid(adu)) {
      if (p.transit !== false) continue;
      const known = evaluate(p).verdict;
      const blanked = evaluate({ ...p, transit: null }).verdict;
      if (blanked === "BY_RIGHT_LIKELY") expect(known).toBe("BY_RIGHT_LIKELY");
    }
  });

  it("height above the state floor is never treated as a pass without a local limit on file", () => {
    const e = evaluate({ ...adu, transit: false, height: 17 });
    const h = e.conditions.find((c) => c.id === "height")!;
    expect(h.status).toBe("UNKNOWN");
    expect(e.verdict).not.toBe("BY_RIGHT_LIKELY");
  });

  it("coastal ADU is not pushed into discretionary review (Gov. Code § 66329(a))", () => {
    const e = evaluate({ ...adu, transit: true, coastal: true });
    expect(e.verdict).toBe("BY_RIGHT_LIKELY");
    expect(e.conditions.find((c) => c.id === "coastal")!.detail).toMatch(/coastal development permit/i);
  });

  it("every flip is re-checked by the engine and resolves something", () => {
    for (const p of grid(adu)) {
      for (const f of findFlips(p)) {
        expect(f.resolves.length).toBeGreaterThan(0);
        const after = evaluate({ ...p, ...f.patch });
        expect(after.conditions.length).toBeGreaterThan(0);
      }
    }
  });

  it("reason text never says approved or guaranteed", () => {
    for (const p of [...grid(adu)].slice(0, 300)) {
      expect(evaluate(p).reason.toLowerCase()).not.toMatch(/\bapproved\b|\bguarantee/);
    }
  });
});
