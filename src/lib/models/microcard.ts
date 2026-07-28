import { z } from "zod";

import { baseRecordSchema } from "@/lib/models/base";

export const microcardSchema = baseRecordSchema.extend({
  title: z.string().min(1),
  summary: z.string().min(1),
  body: z.string().optional(),
  topic: z.string().optional(),
  tags: z.array(z.string()).default([]),
  incidentTypeIds: z.array(z.string()).default([]),
});
export type Microcard = z.infer<typeof microcardSchema>;
