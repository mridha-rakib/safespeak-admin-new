/**
 * Canonical jurisdiction list. This is the single source of truth — do not
 * declare a second jurisdiction list in a form, filter, or seed file.
 * Scoped to Australia because Knowledge & Legislation is the only domain
 * that currently requires a typed (not free-text) jurisdiction.
 */
export const AUSTRALIAN_JURISDICTIONS = [
  { value: "commonwealth", label: "Commonwealth / Australia" },
  { value: "nsw", label: "New South Wales" },
  { value: "vic", label: "Victoria" },
  { value: "qld", label: "Queensland" },
  { value: "wa", label: "Western Australia" },
  { value: "sa", label: "South Australia" },
  { value: "tas", label: "Tasmania" },
  { value: "act", label: "Australian Capital Territory" },
  { value: "nt", label: "Northern Territory" },
] as const;

export const AUSTRALIAN_JURISDICTION_VALUES = AUSTRALIAN_JURISDICTIONS.map((j) => j.value) as [
  (typeof AUSTRALIAN_JURISDICTIONS)[number]["value"],
  ...(typeof AUSTRALIAN_JURISDICTIONS)[number]["value"][],
];

export type AustralianJurisdiction = (typeof AUSTRALIAN_JURISDICTIONS)[number]["value"];

export function jurisdictionLabel(value: string | undefined): string {
  if (!value) return "Not set";
  return AUSTRALIAN_JURISDICTIONS.find((j) => j.value === value)?.label ?? value;
}
