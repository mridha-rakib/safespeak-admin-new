import { z } from "zod";

import { baseRecordSchema } from "@/lib/models/base";

export const incidentTypeSchema = baseRecordSchema.extend({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
});
export type IncidentType = z.infer<typeof incidentTypeSchema>;
