/**
 * Stable machine-key rules shared by Incident Types, Triage Labels, and
 * Resource Categories. A machine key is a permanent relationship identifier
 * — matching rules and other content reference taxonomy records by ID, but
 * the key is what a future integration or import script would key off, so
 * it follows a strict, predictable format and never changes after creation.
 */
const MACHINE_KEY_PATTERN = /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/;
// Unicode combining diacritical marks (U+0300–U+036F), stripped after NFKD
// normalization to turn e.g. "é" into a plain "e" for the key suggestion.
const COMBINING_ACCENT_MARKS = new RegExp("[\\u0300-\\u036f]", "g");

export function normalizeMachineKeyInput(raw: string): string {
  return raw.trim();
}

export function isValidMachineKey(key: string): boolean {
  return MACHINE_KEY_PATTERN.test(key);
}

export const MACHINE_KEY_HELP_TEXT =
  "Lowercase letters, numbers, and single underscores only, starting with a letter — for example physical_assault.";

/** Best-effort suggestion from a display name — the admin can still edit it before first save. */
export function suggestMachineKeyFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(COMBINING_ACCENT_MARKS, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (slug.length === 0) return "";
  // A machine key must start with a letter — prefix if the slug starts with a digit.
  return /^[a-z]/.test(slug) ? slug : `key_${slug}`;
}
