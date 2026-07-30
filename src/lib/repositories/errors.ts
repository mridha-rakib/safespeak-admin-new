/** Thrown by `documents.transitionStatus` when the status graph or a domain guard rejects the move. */
export class StatusTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StatusTransitionError";
  }
}

/** Thrown by `documents.updateWithVersionCheck` when another tab/session updated the record first. */
export class VersionConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VersionConflictError";
  }
}

/** Thrown by `documents.deleteDraft` / taxonomy `deleteDraft` when called on an ineligible record. */
export class InvalidDeletionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidDeletionError";
  }
}

/** Thrown by taxonomy `create`/`updateWithVersionCheck` when the machine key collides with another record. */
export class DuplicateMachineKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DuplicateMachineKeyError";
  }
}

/** Thrown by `replaceReferences` when the replacement target is invalid (same id, archived, or missing). */
export class InvalidReplacementTargetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidReplacementTargetError";
  }
}
