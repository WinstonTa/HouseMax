/**
 * Typed browser client for the HouseMax backend routes (app/api/*).
 * Screens should call the backend through these helpers, not raw fetch.
 */
import type { ApiError, EvaluateResponse } from "./backend/schemas";
import type { ConflictAudit } from "./backend/conflict-radar";
import type { ProjectInput, ProjectType } from "./types";

export class ApiRequestError extends Error {
  constructor(
    public status: number,
    public body: ApiError | null,
  ) {
    super(body?.error.message ?? `HTTP ${status}`);
    this.name = "ApiRequestError";
  }
}

async function postJson<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(res.status, err);
  }
  return (await res.json()) as T;
}

export function fetchEvaluation(project: ProjectInput, signal?: AbortSignal): Promise<EvaluateResponse> {
  return postJson<EvaluateResponse>("/api/evaluate", { project }, signal);
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(path, { signal });
  if (!res.ok) {
    const err = (await res.json().catch(() => null)) as ApiError | null;
    throw new ApiRequestError(res.status, err);
  }
  return (await res.json()) as T;
}

export function fetchCityConflictRadar(cityId: string, projectType: ProjectType, signal?: AbortSignal): Promise<ConflictAudit> {
  const type = projectType === "ADU_DETACHED" ? "adu" : "missing_middle";
  return getJson<ConflictAudit>(`/api/cities/${encodeURIComponent(cityId)}/conflict-radar?type=${type}`, signal);
}

export function auditChecklistText(text: string, projectType: ProjectType, label?: string): Promise<ConflictAudit> {
  return postJson<ConflictAudit>("/api/conflict-radar", { text, projectType, label });
}
