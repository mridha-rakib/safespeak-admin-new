import type { CostType, SupportMode } from "@/lib/models/support-professional";

/** Shared across Support Organisation and Advocate/Counsellor forms — one label map, not one per module. */
export const SUPPORT_MODE_LABEL: Record<SupportMode, string> = {
  phone: "Phone",
  video: "Video",
  in_person: "In person",
  chat: "Chat",
  email: "Email",
};

export const COST_TYPE_LABEL: Record<CostType, string> = {
  free: "Free",
  sliding_scale: "Sliding scale",
  fee_for_service: "Fee for service",
  unknown: "Not stated",
};
