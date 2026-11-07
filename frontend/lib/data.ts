import citiesJson from "@/data/cities.json";
import regulationsJson from "@/data/regulations.json";
import projectsJson from "@/data/projects.json";
import plansJson from "@/data/plans.json";
import type { Checklist, City, PreapprovedPlan, ProjectInput, ProjectType, Regulation } from "./types";

export const CITIES = citiesJson as unknown as City[];
export const REGULATIONS = regulationsJson as unknown as Regulation[];
export const DEMO_PROJECTS = projectsJson as unknown as ProjectInput[];
export const PLANS = plansJson as unknown as PreapprovedPlan[];

export function getCity(id: string): City {
  return CITIES.find((c) => c.id === id) ?? CITIES[0];
}

export function getChecklist(city: City, type: ProjectType): Checklist | undefined {
  return type === "ADU_DETACHED" ? city.checklists.adu : city.checklists.missing_middle;
}

export function getRegulation(id: string): Regulation | undefined {
  return REGULATIONS.find((r) => r.id === id);
}
