import { z } from "zod";

export const APP_SETTINGS_ID = "app-settings";

export const appSettingsSchema = z.object({
  id: z.literal(APP_SETTINGS_ID).default(APP_SETTINGS_ID),
  dbSchemaVersion: z.number().int().positive(),
  bundleSchemaVersion: z.string().min(1),
  demoDataSeededAt: z.string().optional(),
  demoDataLastResetAt: z.string().optional(),
  pdfMaxFileSizeBytes: z.number().int().positive().default(20 * 1024 * 1024),
  updatedAt: z.string().min(1),
});
export type AppSettings = z.infer<typeof appSettingsSchema>;
