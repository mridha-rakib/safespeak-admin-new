import { z } from "zod";

import { baseRecordSchema } from "@/lib/models/base";

export const supportOrganisationSchema = baseRecordSchema.extend({
  name: z.string().min(1),
  shortDescription: z.string().optional(),
  servicesOffered: z.array(z.string()).default([]),
  incidentTypeIds: z.array(z.string()).default([]),
  jurisdictions: z.array(z.string()).default([]),
  phone: z.string().optional(),
  email: z.email().optional().or(z.literal("")),
  website: z.url().optional().or(z.literal("")),
  address: z.string().optional(),
  verified: z.boolean().default(false),
});
export type SupportOrganisation = z.infer<typeof supportOrganisationSchema>;
