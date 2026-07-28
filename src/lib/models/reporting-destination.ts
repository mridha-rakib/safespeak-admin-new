import { z } from "zod";

import { baseRecordSchema } from "@/lib/models/base";

export const reportingDestinationSchema = baseRecordSchema.extend({
  name: z.string().min(1),
  agencyType: z.string().optional(),
  description: z.string().optional(),
  jurisdiction: z.string().optional(),
  incidentTypeIds: z.array(z.string()).default([]),
  phone: z.string().optional(),
  email: z.email().optional().or(z.literal("")),
  website: z.url().optional().or(z.literal("")),
  reportingInstructions: z.string().optional(),
});
export type ReportingDestination = z.infer<typeof reportingDestinationSchema>;
