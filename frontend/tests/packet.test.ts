import { describe, expect, it } from "vitest";
import { buildPacket } from "@/lib/backend/packet";
import { DEMO_PROJECTS } from "@/lib/data";

const adu = DEMO_PROJECTS.find((p) => p.type === "ADU_DETACHED")!;
const mm = DEMO_PROJECTS.find((p) => p.type === "MISSING_MIDDLE")!;
const AS_OF = "2026-11-07";

describe("buildPacket", () => {
  it("By-Right ADU: includes the applicant's statement citing only rules the engine used", () => {
    const pk = buildPacket({ ...adu, transit: true }, {}, AS_OF);
    expect(pk.addendum.included).toBe(true);
    const text = pk.addendum.body.join(" ");
    expect(text).toMatch(/likely eligible/);
    expect(text).toMatch(/§ 66317\(a\)\(1\)/);
    expect(text).toMatch(/§ 66321\(b\)\(4\)\(B\)/);
    expect(pk.addendum.statutes.every((s) => s.status === "VERIFIED")).toBe(true);
  });

  it("never uses the spec's overclaiming language", () => {
    const pk = buildPacket({ ...adu, transit: true }, {}, AS_OF);
    const all = JSON.stringify(pk).toLowerCase();
    expect(all).not.toMatch(/hereby given|qualifies for mandatory|staff are required|are preempted|guarantee/);
  });

  it("omits the addendum unless By-Right Likely", () => {
    for (const p of [{ ...adu, transit: null }, { ...adu, transit: false }, mm]) {
      const pk = buildPacket(p, {}, AS_OF);
      expect(pk.addendum.included).toBe(false);
      expect(pk.addendum.body).toEqual([]);
      expect(pk.addendum.omitted_reason).toMatch(/Omitted/);
    }
  });

  it("every packet is watermarked draft and says nothing was filed", () => {
    const pk = buildPacket({ ...adu, transit: true }, {}, AS_OF);
    expect(pk.meta.watermark).toMatch(/DRAFT/);
    expect(pk.meta.footer).toMatch(/Nothing has been filed/);
  });

  it("illustrative checklists are flagged as such, not cited as preempted", () => {
    const pk = buildPacket({ ...adu, transit: true }, {}, AS_OF);
    expect(pk.addendum.flagged_note).toMatch(/ILLUSTRATIVE/);
    for (const f of pk.addendum.flagged_local_requirements) expect(f.note).toMatch(/Illustrative/);
  });

  it("pre-flight counts included and missing documents", () => {
    const first = buildPacket(adu, {}, AS_OF).preflight.docs[0]!.name;
    const pk = buildPacket(adu, { [first]: true }, AS_OF);
    expect(pk.preflight.docs[0]!.included).toBe(true);
    expect(pk.preflight.missing).toBe(pk.preflight.docs.length - 1);
    expect(pk.preflight.complete).toBe(false);
  });
});
