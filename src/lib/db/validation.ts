import type { ZodType } from "zod";

// eslint-disable-next-line n/no-process-env
const isDev = process.env.NODE_ENV !== "production";

/**
 * Validates one record read back from IndexedDB. Invalid records are
 * dropped from the result set rather than crashing the app or discarding
 * every other record — see README "Persisted-data validation" for the
 * recovery-notice policy this backs.
 */
export function parseStoredRecord<T>(
  schema: ZodType<T>,
  raw: unknown,
  context: string
): { data: T; valid: true } | { data: undefined; valid: false } {
  const result = schema.safeParse(raw);
  if (result.success) {
    return { data: result.data, valid: true };
  }

  if (isDev) {
    // Detailed validation errors stay in the dev console only — never surfaced
    // as a raw stack trace in the UI.
    // eslint-disable-next-line no-console
    console.warn(`[safespeak-admin] Dropped an invalid ${context} record.`, result.error.issues);
  }

  return { data: undefined, valid: false };
}

export function filterValidRecords<T>(
  schema: ZodType<T>,
  rawRecords: unknown[],
  context: string
): { records: T[]; invalidCount: number } {
  const records: T[] = [];
  let invalidCount = 0;

  for (const raw of rawRecords) {
    const parsed = parseStoredRecord(schema, raw, context);
    if (parsed.valid) {
      records.push(parsed.data);
    } else {
      invalidCount += 1;
    }
  }

  return { records, invalidCount };
}
