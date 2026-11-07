import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET as getCities } from "@/app/api/cities/route";
import { GET as getCity } from "@/app/api/cities/[id]/route";
import { GET as getRegulations } from "@/app/api/regulations/route";
import { GET as getProjects } from "@/app/api/projects/route";
import { GET as getPlans } from "@/app/api/plans/route";
import { CITIES } from "@/lib/data";

const ctx = (id: string) => ({ params: Promise.resolve({ id }) }) as RouteContext<"/api/cities/[id]">;

describe("data routes", () => {
  it("GET /api/cities lists cities with a disclaimer", async () => {
    const body = await getCities().json();
    expect(body.cities.length).toBe(CITIES.length);
    expect(body.disclaimer).toMatch(/not legal advice/i);
  });

  it("GET /api/cities/:id returns the city", async () => {
    const id = CITIES[0]!.id;
    const res = await getCity(new NextRequest(`http://t/api/cities/${id}`), ctx(id));
    expect(res.status).toBe(200);
    expect((await res.json()).city.id).toBe(id);
  });

  it("GET /api/cities/:id 404s instead of falling back to another city", async () => {
    const res = await getCity(new NextRequest("http://t/api/cities/nope"), ctx("nope"));
    expect(res.status).toBe(404);
  });

  it("GET /api/regulations and /api/projects return arrays", async () => {
    expect(Array.isArray((await getRegulations().json()).regulations)).toBe(true);
    expect(Array.isArray((await getProjects().json()).projects)).toBe(true);
  });

  it("GET /api/plans filters by cityId", async () => {
    const body = await getPlans(new NextRequest("http://t/api/plans?cityId=city_anaheim")).json();
    expect(body.plans.every((p: { city_id: string }) => p.city_id === "city_anaheim")).toBe(true);
  });
});
