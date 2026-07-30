import {
  IconAlertTriangle,
  IconBriefcase,
  IconCoin,
  IconHeartHandshake,
  IconHome2,
  IconMoodKid,
  IconScale,
  IconShieldCheck,
  IconSquareRoundedX,
  IconTag,
  type Icon,
} from "@tabler/icons-react";

import type { ResourceCategoryAccentToken, ResourceCategoryIconKey } from "@/lib/models/resource-category";

/** Curated map onto the project's existing icon library (@tabler/icons-react) — never an arbitrary URL or custom SVG. */
export const RESOURCE_CATEGORY_ICON_COMPONENTS: Record<ResourceCategoryIconKey, Icon> = {
  safety: IconShieldCheck,
  legal: IconScale,
  mental_health: IconHeartHandshake,
  housing: IconHome2,
  financial: IconCoin,
  discrimination: IconSquareRoundedX,
  workplace: IconBriefcase,
  children: IconMoodKid,
  emergency: IconAlertTriangle,
  general: IconTag,
};

export const RESOURCE_CATEGORY_ICON_LABELS: Record<ResourceCategoryIconKey, string> = {
  safety: "Safety",
  legal: "Legal",
  mental_health: "Mental health",
  housing: "Housing",
  financial: "Financial",
  discrimination: "Discrimination",
  workplace: "Workplace",
  children: "Children and young people",
  emergency: "Emergency support",
  general: "General",
};

/** Maps to the existing Badge `tone` vocabulary (src/components/ui/badge.tsx) — never a custom hex colour. */
export const RESOURCE_CATEGORY_ACCENT_LABELS: Record<ResourceCategoryAccentToken, string> = {
  primary: "Brand blue",
  success: "Green",
  warning: "Amber",
  destructive: "Red",
  neutral: "Neutral grey",
};
