/**
 * POST /api/conflict-radar
 * Body: { text: string, projectType?: "ADU_DETACHED" | "MISSING_MIDDLE", label?: string }
 * 200:  ConflictAudit of the pasted checklist text (one item per line)
 * 400:  ApiError
 *
 * Lets a permit tech or applicant paste any city checklist (e.g. copied from a PDF) and get
 * stale citations and discretionary-language flags back. Nothing is stored.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { MAX_PASTED_CHARS, auditText } from "@/lib/backend/conflict-radar";
import { badRequest, readJson } from "@/lib/backend/http";

const Body = z.object({
  text: z.string().min(1).max(MAX_PASTED_CHARS),
  projectType: z.enum(["ADU_DETACHED", "MISSING_MIDDLE"]).default("ADU_DETACHED"),
  label: z.string().max(200).optional(),
});

export async function POST(req: Request) {
  const body = await readJson(req);
  if (body === undefined) return badRequest("Request body must be JSON.");
  const parsed = Body.safeParse(body);
  if (!parsed.success) return badRequest("Invalid request.", parsed.error);
  const { text, projectType, label } = parsed.data;
  return NextResponse.json(auditText(text, projectType, label));
}
