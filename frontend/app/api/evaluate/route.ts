/**
 * POST /api/evaluate
 * Body: { project: ProjectInput }   (lib/types.ts, validated by lib/backend/schemas.ts)
 * 200:  EvaluateResponse { evaluation, flips, meta }
 * 400:  ApiError (BAD_REQUEST, with Zod issues)
 */
import { NextResponse } from "next/server";
import { EvaluateRequest } from "@/lib/backend/schemas";
import { runEvaluation } from "@/lib/backend/evaluate-service";
import { badRequest, internalError, readJson } from "@/lib/backend/http";

export async function POST(req: Request) {
  const body = await readJson(req);
  if (body === undefined) return badRequest("Request body must be JSON.");

  const parsed = EvaluateRequest.safeParse(body);
  if (!parsed.success) return badRequest("Invalid project.", parsed.error);

  try {
    return NextResponse.json(runEvaluation(parsed.data.project));
  } catch (err) {
    console.error("evaluate failed", err);
    return internalError("Evaluation failed.");
  }
}
