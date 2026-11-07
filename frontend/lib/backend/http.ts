/** Small helpers shared by API route handlers. Keeps every route's error shape identical (ApiError). */
import { NextResponse } from "next/server";
import type { ZodError } from "zod";
import type { ApiError } from "@/lib/backend/schemas";

export function badRequest(message: string, zodError?: ZodError) {
  const body: ApiError = {
    error: { code: "BAD_REQUEST", message, issues: zodError?.issues },
  };
  return NextResponse.json(body, { status: 400 });
}

export function notFound(message: string) {
  const body: ApiError = { error: { code: "NOT_FOUND", message } };
  return NextResponse.json(body, { status: 404 });
}

export function internalError(message: string) {
  const body: ApiError = { error: { code: "INTERNAL", message } };
  return NextResponse.json(body, { status: 500 });
}

export async function readJson(req: Request): Promise<unknown | undefined> {
  try {
    return await req.json();
  } catch {
    return undefined;
  }
}
