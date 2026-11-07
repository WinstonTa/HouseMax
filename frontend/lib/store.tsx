"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { DEMO_PROJECTS } from "./data";
import { DEFAULT_COST } from "./benchmarks";
import { evaluate } from "./by-right-engine";
import type { Evaluation, ProjectInput } from "./types";

interface CostInputs {
  capital: number;
  monthlyRatePct: number;
}

interface Store {
  project: ProjectInput;
  evaluation: Evaluation;
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

  const evaluation = useMemo(() => evaluate(project), [project]);

  const value = useMemo(
    () => ({ project, evaluation, update, loadDemo, cost, setCost, docsChecked, toggleDoc, submittedDate, setSubmittedDate }),
    [project, evaluation, update, loadDemo, cost, setCost, docsChecked, toggleDoc, submittedDate],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProject(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProject must be used inside <ProjectProvider>");
  return ctx;
}
