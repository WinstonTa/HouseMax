import { describe, expect, it } from "vitest";
import { detectDiscretion } from "@/lib/backend/discretion-detector";

const triggers = (t: string, type: "ADU_DETACHED" | "MISSING_MIDDLE" = "ADU_DETACHED") =>
  detectDiscretion(t, type).map((f) => f.trigger);

describe("detectDiscretion", () => {
  it("flags HOA sign-off", () => {
    expect(triggers("Applicant must provide written approval from neighborhood HOA before intake.")).toEqual(["HOA_SIGNOFF"]);
  });

  it("flags subjective design language", () => {
    expect(triggers("Roof materials must match the primary dwelling to staff satisfaction.")).toContain("AESTHETIC_GUIDELINE");
    expect(triggers("Subject to architectural design review for neighborhood compatibility.")).toContain("AESTHETIC_GUIDELINE");
  });

  it("flags hearings, discretionary permits and traffic studies", () => {
    expect(triggers("Public notice and hearing for ADUs on small lots.")).toContain("PUBLIC_HEARING");
    expect(triggers("Requires a Site Development Permit approved by the Zoning Administrator.")).toContain("SITE_DEVELOPMENT_PERMIT");
    expect(triggers("Traffic impact study required.", "MISSING_MIDDLE")).toEqual(["TRAFFIC_STUDY"]);
  });

  it("passes objective dimensional standards", () => {
    expect(triggers("Maximum height of detached ADU limited to 16 feet.")).toEqual([]);
    expect(triggers("Side and rear setbacks: minimum 4 feet.")).toEqual([]);
  });

  it("every flag needs human review; ADU flags cite a verified basis where one exists", () => {
    const f = detectDiscretion("Public hearing before the Planning Commission.", "ADU_DETACHED");
    expect(f.every((x) => x.needs_human_review)).toBe(true);
    expect(f[0]!.basis).toMatch(/66317\(a\)\(1\)/);
  });

  it("missing-middle flags carry no basis (no verified multifamily statute yet)", () => {
    const f = detectDiscretion("Public hearing before the Planning Commission.", "MISSING_MIDDLE");
    expect(f[0]!.basis).toBeNull();
  });

  it("explanations never call a requirement illegal", () => {
    for (const t of ["HOA approval", "design review", "public hearing", "variance", "traffic study", "owner-occupancy"]) {
      for (const f of detectDiscretion(t, "ADU_DETACHED")) expect(f.explanation.toLowerCase()).not.toMatch(/illegal|unlawful|violation/);
    }
  });
});
