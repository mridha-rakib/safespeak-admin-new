import { z } from "zod";

import { baseRecordSchema } from "@/lib/models/base";

export const rightsContentSchema = baseRecordSchema.extend({
  title: z.string().min(1),
  summary: z.string().min(1),
  body: z.string().optional(),
  jurisdiction: z.string().optional(),
  relatedLegislationIds: z.array(z.string()).default([]),
  incidentTypeIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
});
export type RightsContent = z.infer<typeof rightsContentSchema>;
