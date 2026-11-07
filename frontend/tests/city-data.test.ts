/** Guards against invented facts about real cities and real people in the demo data. */
import { describe, expect, it } from "vitest";
import { CITIES, DEMO_PROJECTS } from "@/lib/data";

describe("data/cities.json honesty", () => {
  it("no checklist claims a verifier unless it is VERIFIED with a date and source", () => {
    for (const c of CITIES) {
      for (const cl of Object.values(c.checklists)) {
        if (!cl) continue;
        if (cl.status === "VERIFIED") {
          expect(cl.verified_by, cl.checklist_id).toBeTruthy();
          expect(cl.last_verified, cl.checklist_id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(cl.source_document_url, cl.checklist_id).toMatch(/^https:\/\//);
        } else {
          expect(cl.verified_by, cl.checklist_id).toBeNull();
          expect(cl.last_verified, cl.checklist_id).toBeNull();
          expect(cl.status_note, cl.checklist_id).toMatch(/not taken from/i);
        }
      }
    }
  });

  it("no invented APR medians remain in city records (real ones live in data/apr-medians.json)", () => {
    for (const c of CITIES) expect(Object.keys(c).some((k) => k.startsWith("apr_")), c.id).toBe(false);
  });
});

describe("data/projects.json has no real people", () => {
  it("applicants are fictional with reserved example contact details", () => {
    for (const p of DEMO_PROJECTS) {
      expect(p.applicant.name).toMatch(/fictional/i);
      expect(p.applicant.email).toMatch(/@example\.(com|org)$/);
      expect(p.applicant.phone).toMatch(/555/);
    }
  });

  it("demo parcels do not claim verified records", () => {
    for (const p of DEMO_PROJECTS) expect(p.dataSource).not.toBe("VERIFIED");
  });
});
