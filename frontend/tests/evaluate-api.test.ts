import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/evaluate/route";
import { DEMO_PROJECTS } from "@/lib/data";
import { EvaluateRequest, type EvaluateResponse } from "@/lib/backend/schemas";
import { runEvaluation } from "@/lib/backend/evaluate-service";
import { evaluate } from "@/lib/by-right-engine";
import type { ProjectInput } from "@/lib/types";

const adu = DEMO_PROJECTS.find((p) => p.type === "ADU_DETACHED")!;
const call = (body: unknown) =>
  POST(new Request("http://test/api/evaluate", { method: "POST", body: JSON.stringify(body) }));

describe("request schema", () => {
  it("accepts every demo project", () => {
    for (const p of DEMO_PROJECTS) expect(EvaluateRequest.safeParse({ project: p }).success).toBe(true);
  });
});

describe("demo states through the service", () => {
  it("transit unknown -> CANT_TELL_YET, transit follow-up ranked first", () => {
    const r = runEvaluation({ ...adu, transit: null });
    expect(r.evaluation.verdict).toBe("CANT_TELL_YET");
    expect(r.evaluation.followUps[0]?.field).toBe("transit");
  });

  it("transit true -> BY_RIGHT_LIKELY with transit overrides applied", () => {
    const r = runEvaluation({ ...adu, transit: true });
    expect(r.evaluation.verdict).toBe("BY_RIGHT_LIKELY");
    expect(r.evaluation.appliedOverrides).toContain("STATUTE_ADU_HEIGHT_TRANSIT");
    expect(r.meta.sources.map((s) => s.id)).toContain("STATUTE_ADU_HEIGHT_TRANSIT");
  });

  it("transit false at 17.5 ft -> DISCRETIONARY_LIKELY with a height flip", () => {
    const r = runEvaluation({ ...adu, transit: false });
    expect(r.evaluation.verdict).toBe("DISCRETIONARY_LIKELY");
    expect(r.flips.some((f) => f.id === "height")).toBe(true);
  });

  it("server result equals the client engine (one engine, two runtimes)", () => {
    const p: ProjectInput = { ...adu, transit: true };
    expect(runEvaluation(p).evaluation).toEqual(evaluate(p));
  });

  it("sources are never claimed VERIFIED before P1 verification", () => {
    const r = runEvaluation({ ...adu, transit: true });
    expect(r.meta.sources.every((s) => s.status === "UNVERIFIED")).toBe(true);
  });
});

describe("POST /api/evaluate", () => {
  it("200 with evaluation, flips and meta", async () => {
    const res = await call({ project: adu });
    expect(res.status).toBe(200);
    const body = (await res.json()) as EvaluateResponse;
    expect(body.meta.computed_by).toBe("server");
    expect(body.meta.disclaimer).toMatch(/not legal advice/i);
    expect(["BY_RIGHT_LIKELY", "DISCRETIONARY_LIKELY", "CANT_TELL_YET"]).toContain(body.evaluation.verdict);
  });

  it("400 with issues on a bad body", async () => {
    const res = await call({ project: { title: "no type" } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("BAD_REQUEST");
    expect(Array.isArray(body.error.issues)).toBe(true);
  });

  it("400 on non-JSON", async () => {
    const res = await POST(new Request("http://test/api/evaluate", { method: "POST", body: "nope" }));
    expect(res.status).toBe(400);
  });
});
