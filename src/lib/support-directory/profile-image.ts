import { PROFILE_PHOTO_ACCEPTED_TYPES, PROFILE_PHOTO_MAX_BYTES } from "@/lib/models/support-professional";

/** Mirrors lib/pdf/validate-pdf-file.ts's shape — JPEG/PNG/WebP only, deliberately never SVG (SVG can embed script content). */
export interface ProfileImageValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateProfileImageFile(file: File, maxBytes: number = PROFILE_PHOTO_MAX_BYTES): ProfileImageValidationResult {
  if (!(PROFILE_PHOTO_ACCEPTED_TYPES as readonly string[]).includes(file.type)) {
    return { valid: false, reason: "Only JPEG, PNG, or WebP images can be uploaded here." };
  }

  if (file.size === 0) {
    return { valid: false, reason: "This file is empty and has no content to display." };
  }

  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return { valid: false, reason: `This image is larger than the ${maxMb}MB limit.` };
  }

  return { valid: true };
}
