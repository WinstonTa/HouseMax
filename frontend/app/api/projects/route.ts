/** GET /api/projects: demo projects. Made-up data for demonstration; not real applicants. */
import { NextResponse } from "next/server";
import { DEMO_PROJECTS } from "@/lib/data";

export function GET() {
  return NextResponse.json({ projects: DEMO_PROJECTS, note: "Demo projects. Applicants are fictional." });
}
