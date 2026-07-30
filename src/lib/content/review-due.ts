/**
 * Shared review-due state for Microcards and Rights & Legal Information.
 * Deliberately a separate, generic function (takes a raw date string, not a
 * whole record) rather than reusing `lib/legislation/readiness.ts`'s
 * `isReviewOverdue` — that one is typed specifically to `DocumentRecord`'s
 * `nextReviewDate` field name; this one is field-name-agnostic so both
 * modules' `reviewDueDate` field can call the same implementation.
 */
export type ReviewDueState = "current" | "due_soon" | "overdue" | "none";

/** A review date within this many days counts as "due soon" rather than "current". */
export const REVIEW_DUE_SOON_WINDOW_DAYS = 30;

export function getReviewDueState(reviewDueDate: string | undefined, referenceDate: Date = new Date()): ReviewDueState {
  if (!reviewDueDate || reviewDueDate.trim().length === 0) return "none";
  const due = new Date(reviewDueDate);
  if (Number.isNaN(due.getTime())) return "none";

  const diffMs = due.getTime() - referenceDate.getTime();
  if (diffMs < 0) return "overdue";
  const diffDays = diffMs / (1000 * 60 * 60 * 24);
  if (diffDays <= REVIEW_DUE_SOON_WINDOW_DAYS) return "due_soon";
  return "current";
}

export function isReviewDueOverdue(reviewDueDate: string | undefined, referenceDate: Date = new Date()): boolean {
  return getReviewDueState(reviewDueDate, referenceDate) === "overdue";
}

export const REVIEW_DUE_STATE_LABEL: Record<ReviewDueState, string> = {
  current: "Review current",
  due_soon: "Review due soon",
  overdue: "Review overdue",
  none: "No review date set",
};
