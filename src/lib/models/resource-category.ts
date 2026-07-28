import { z } from "zod";

import { baseRecordSchema } from "@/lib/models/base";

export const resourceCategorySchema = baseRecordSchema.extend({
  name: z.string().min(1),
  description: z.string().optional(),
  parentCategoryId: z.string().optional(),
});
export type ResourceCategory = z.infer<typeof resourceCategorySchema>;
