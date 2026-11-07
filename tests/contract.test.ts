import { describe, expect, it } from "vitest";
import { EvaluateRequest, EvaluationResult, type ProjectInput } from "@/lib/schemas";
import { SAMPLE_PROJECT } from "@/lib/mocks/sample-project";
import { mockEvaluate } from "@/lib/mocks/evaluation";
import { POST } from "@/app/api/evaluate/route";

const withTransit = (p: ProjectInput, value: boolean): ProjectInput => ({
  ...p,
  parcel: { ...p.parcel, within_half_mile_major_transit: { value, source: "SELF_REPORTED" } },
});
const withHeight = (p: ProjectInput, value: number): ProjectInput => ({
  ...p,
  specs: { ...p.specs, proposed_height_feet: { value, source: "SELF_REPORTED" } },
});

describe("contract", () => {
  it("sample project is a valid EvaluateRequest", () => {
    expect(EvaluateRequest.safeParse({ project: SAMPLE_PROJECT }).success).toBe(true);
  });

  it("rejects an applicant not marked fictional", () => {
    const bad = { ...SAMPLE_PROJECT, applicant: { name: "x", is_fictional: false } };
    expect(EvaluateRequest.safeParse({ project: bad }).success).toBe(false);
  });
});

describe("mock evaluator: three demo states", () => {
  it("transit unknown -> CANT_TELL_YET with a transit follow-up", () => {
    const r = EvaluationResult.parse(mockEvaluate(SAMPLE_PROJECT));
    expect(r.is_mock).toBe(true);
    expect(r.overall.verdict).toBe("CANT_TELL_YET");
    expect(r.follow_ups[0]?.fact_path).toBe("parcel.within_half_mile_major_transit");
  });

  it("transit true, 17.5 ft -> BY_RIGHT_LIKELY", () => {
    const r = EvaluationResult.parse(mockEvaluate(withTransit(SAMPLE_PROJECT, true)));
    expect(r.overall.verdict).toBe("BY_RIGHT_LIKELY");
    expect(r.follow_ups).toHaveLength(0);
  });

  it("transit false, 17.5 ft -> DISCRETIONARY_LIKELY with a flip", () => {
    const r = EvaluationResult.parse(mockEvaluate(withTransit(SAMPLE_PROJECT, false)));
    expect(r.overall.verdict).toBe("DISCRETIONARY_LIKELY");
    expect(r.flips[0]?.to).toBe(16);
  });

  it("height unknown never yields BY_RIGHT_LIKELY", () => {
    const { proposed_height_feet: _omit, ...specs } = SAMPLE_PROJECT.specs;
    const r = mockEvaluate(withTransit({ ...SAMPLE_PROJECT, specs }, true));
    expect(r.overall.verdict).not.toBe("BY_RIGHT_LIKELY");
  });

  it("verdict text never says approved or guaranteed", () => {
    for (const p of [SAMPLE_PROJECT, withTransit(SAMPLE_PROJECT, true), withHeight(SAMPLE_PROJECT, 30)]) {
      const r = mockEvaluate(p);
      const text = [r.overall.summary, ...r.pathways.map((x) => x.reason)].join(" ").toLowerCase();
      expect(text).not.toMatch(/\bapproved\b|\bguarantee/);
    }
  });
});

describe("POST /api/evaluate", () => {
  const call = (body: unknown) =>
    POST(new Request("http://test/api/evaluate", { method: "POST", body: JSON.stringify(body) }));

  it("200 with a valid EvaluationResult", async () => {
    const res = await call({ project: SAMPLE_PROJECT });
    expect(res.status).toBe(200);
    expect(EvaluationResult.safeParse(await res.json()).success).toBe(true);
  });

  it("400 with issues on a bad body", async () => {
    const res = await call({ project: { title: "no type" } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(Array.isArray(body.error.issues)).toBe(true);
  });
});
