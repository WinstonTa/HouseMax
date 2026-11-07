/** Shared request schema for POST /api/packet and POST /api/packet/pdf. */
import { z } from "zod";
import { ProjectInputSchema } from "./schemas";

export const PacketRequest = z.object({
  project: ProjectInputSchema,
  /** Pre-flight checklist: document name -> included. */
  docsChecked: z.record(z.string(), z.boolean()).default({}),
  /** As-of date printed on the packet (YYYY-MM-DD). Defaults to the demo as-of date. */
  asOf: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});
export type PacketRequest = z.infer<typeof PacketRequest>;
