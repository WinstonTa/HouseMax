"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DEMO_PROJECTS } from "./data";
import { DEFAULT_COST } from "./benchmarks";
import { evaluate } from "./by-right-engine";
import { fetchEvaluation } from "./api-client";
import type { ResponseMeta } from "./backend/schemas";
import type { Evaluation, Flip, ProjectInput } from "./types";

/** Where the current `evaluation` came from. */
export type EvaluationSource = "server" | "local" | "local-fallback";

interface CostInputs {
  capital: number;
  monthlyRatePct: number;
}

interface Store {
  project: ProjectInput;
  evaluation: Evaluation;
  /** Flips from the server, or null until the first response. */
  serverFlips: Flip[] | null;
  /** Sources, disclaimer and engine version from POST /api/evaluate (null until it answers). */
  evaluationMeta: ResponseMeta | null;
  evaluationSource: EvaluationSource;
  update: (patch: Partial<ProjectInput>) => void;
  loadDemo: (id: string) => void;
  cost: CostInputs;
  setCost: (patch: Partial<CostInputs>) => void;
  docsChecked: Record<string, boolean>;
  toggleDoc: (doc: string) => void;
  submittedDate: string;
  setSubmittedDate: (iso: string) => void;
}

const Ctx = createContext<Store | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProject] = useState<ProjectInput>(DEMO_PROJECTS[0]);
  const [cost, setCostState] = useState<CostInputs>(DEFAULT_COST[DEMO_PROJECTS[0].type]);
  const [docsChecked, setDocsChecked] = useState<Record<string, boolean>>({});
  const [submittedDate, setSubmittedDate] = useState("2026-09-02");

  const update = useCallback((patch: Partial<ProjectInput>) => setProject((p) => ({ ...p, ...patch })), []);
  const loadDemo = useCallback((id: string) => {
    const next = DEMO_PROJECTS.find((d) => d.id === id);
    if (!next) return;
    setProject(next);
    setCostState(DEFAULT_COST[next.type]);
    setDocsChecked({});
  }, []);
  const setCost = useCallback((patch: Partial<CostInputs>) => setCostState((c) => ({ ...c, ...patch })), []);
  const toggleDoc = useCallback((doc: string) => setDocsChecked((d) => ({ ...d, [doc]: !d[doc] })), []);

  // Instant local result (same engine as the server) so the UI never waits on the network.
  const localEvaluation = useMemo(() => evaluate(project), [project]);

  // Canonical result from POST /api/evaluate, debounced; tagged with the project it answers.
  const [server, setServer] = useState<{
    for: ProjectInput;
    evaluation: Evaluation;
    flips: Flip[];
    meta: ResponseMeta;
  } | null>(null);
  const [serverFailed, setServerFailed] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetchEvaluation(project, ctrl.signal)
        .then((r) => {
          setServer({ for: project, ...r });
          setServerFailed(false);
        })
        .catch((err: unknown) => {
          if ((err as { name?: string })?.name === "AbortError") return;
          console.warn("POST /api/evaluate failed; using local engine", err);
          setServerFailed(true);
        });
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [project]);

  const fresh = server !== null && server.for === project;
  const evaluation = fresh ? server.evaluation : localEvaluation;
  const evaluationSource: EvaluationSource = fresh ? "server" : serverFailed ? "local-fallback" : "local";
  const serverFlips = fresh ? server.flips : null;
  const evaluationMeta = server?.meta ?? null;

  const value = useMemo(
    () => ({
      project,
      evaluation,
      serverFlips,
      evaluationMeta,
      evaluationSource,
      update,
      loadDemo,
      cost,
      setCost,
      docsChecked,
      toggleDoc,
      submittedDate,
      setSubmittedDate,
    }),
    [project, evaluation, serverFlips, evaluationMeta, evaluationSource, update, loadDemo, cost, setCost, docsChecked, toggleDoc, submittedDate],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProject(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProject must be used inside <ProjectProvider>");
  return ctx;
}
