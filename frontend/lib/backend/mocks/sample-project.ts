import type { ProjectInput } from "@/lib/backend/schemas";

/**
 * MOCK sample request body for POST /api/evaluate (P0 only).
 * Made-up project. No real person, address or APN. P1 replaces this with a publicly listed
 * Orange County lot from data/projects.json.
 *
 * `parcel.within_half_mile_major_transit` is deliberately ABSENT so the first evaluation
 * returns CANT_TELL_YET (demo screen 1).
 */
export const SAMPLE_PROJECT: ProjectInput = {
  id: "mock_proj_adu",
  title: "MOCK detached ADU (made-up project)",
  project_type: "ADU_DETACHED",
  jurisdiction_id: "city_santa_ana",
  applicant: {
    name: "Sample Applicant (made-up)",
    firm: "Example Builders (made-up)",
    email: "applicant@example.com",
    is_fictional: true,
  },
  parcel: {
    lot_area_sqft: { value: 6800, source: "SELF_REPORTED", note: "ASSUMPTION: made-up value" },
    coastal_zone: { value: false, source: "SELF_REPORTED" },
    existing_structures: { value: ["SINGLE_FAMILY_RESIDENCE"], source: "SELF_REPORTED" },
  },
  specs: {
    proposed_units: { value: 1, source: "SELF_REPORTED" },
    proposed_height_feet: { value: 17.5, source: "SELF_REPORTED" },
    proposed_sqft: { value: 800, source: "SELF_REPORTED" },
    setback_rear_feet: { value: 4, source: "SELF_REPORTED" },
    setback_side_feet: { value: 4, source: "SELF_REPORTED" },
    proposed_parking_spaces: { value: 0, source: "SELF_REPORTED" },
  },
};
