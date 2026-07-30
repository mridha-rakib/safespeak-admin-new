import { z } from "zod";

/**
 * Fields shared by every taxonomy entity (Incident Types, Triage Labels,
 * Resource Categories). Spread into each entity's own `baseRecordSchema.extend({...})`
 * call rather than collapsing the three into one generic table — see
 * docs/ARCHITECTURE.md "Shared taxonomy architecture."
 */
export const taxonomyBaseFields = {
  machineKey: z.string().min(1),
  displayOrder: z.number().int().nonnegative().default(0),
  internalNotes: z.string().optional(),
};
