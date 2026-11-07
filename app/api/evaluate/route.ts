/**
 * POST /api/evaluate
 * Body: EvaluateRequest  ({ project: ProjectInput })
 * 200:  EvaluationResult
 * 400:  ApiError (BAD_REQUEST, with Zod issues)
 *
 * P0: returns the MOCK evaluator (is_mock: true). P1 swaps in lib/engine/by-right-engine.ts
 * without changing the request/response contract.
 */
import { NextResponse } from "next/server";
import { EvaluateRequest, EvaluationResult } from "@/lib/schemas";
import { mockEvaluate } from "@/lib/mocks/evaluation";
import { badRequest, internalError, readJson } from "@/lib/http";

export async function POST(req: Request) {
  const body = await readJson(req);
  if (body === undefined) return badRequest("Request body must be JSON.");

  const parsed = EvaluateRequest.safeParse(body);
  if (!parsed.success) return badRequest("Invalid project.", parsed.error);

  const result = mockEvaluate(parsed.data.project);

  // Guard the contract on the way out too, so a backend bug surfaces as a 500, not bad UI data.
  const checked = EvaluationResult.safeParse(result);
  if (!checked.success) return internalError("Engine produced an invalid result.");

  return NextResponse.json(checked.data);
}
