import { IconAlertTriangleFilled, IconCircleCheckFilled, IconClockFilled, IconHelpCircleFilled } from "@tabler/icons-react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { ContentStatus } from "@/lib/models/base";
import type { VerificationStatus } from "@/lib/models/verification";

const CONTENT_STATUS_LABEL: Record<ContentStatus, string> = {
  draft: "Draft",
  ready_for_review: "Ready for review",
  published: "Published",
  needs_update: "Needs update",
  archived: "Archived",
};

const CONTENT_STATUS_TONE: Record<ContentStatus, BadgeTone> = {
  draft: "neutral",
  ready_for_review: "primary",
  published: "success",
  needs_update: "warning",
  archived: "neutral",
};

/** Publication-workflow status. Never rendered with color alone — the label text always states the status. */
export function ContentStatusBadge({
  status,
  className,
}: {
  status: ContentStatus;
  className?: string;
}) {
  return (
    <Badge tone={CONTENT_STATUS_TONE[status]} className={className}>
      {CONTENT_STATUS_LABEL[status]}
    </Badge>
  );
}

/** Short badge text — deliberately more compact than VERIFICATION_STATUS_LABEL in lib/models/verification.ts, which is written for form/detail-page prose, not a badge. */
const VERIFICATION_BADGE_LABEL: Record<VerificationStatus, string> = {
  not_verified: "Not verified",
  verification_pending: "Verification pending",
  verified: "Verified",
  verification_expired: "Verification expired",
  verification_rejected: "Verification not confirmed",
};

const VERIFICATION_BADGE_TONE: Record<VerificationStatus, BadgeTone> = {
  not_verified: "warning",
  verification_pending: "neutral",
  verified: "success",
  verification_expired: "warning",
  verification_rejected: "destructive",
};

const VERIFICATION_BADGE_ICON: Record<VerificationStatus, typeof IconCircleCheckFilled> = {
  not_verified: IconAlertTriangleFilled,
  verification_pending: IconClockFilled,
  verified: IconCircleCheckFilled,
  verification_expired: IconAlertTriangleFilled,
  verification_rejected: IconHelpCircleFilled,
};

/**
 * Local administrative verification status for Support Organisations and
 * Advocates/Counsellors. Communicated through the icon AND the text label
 * (never color alone), per the "Not verified must never be confused with
 * Verified" requirement — see lib/models/verification.ts.
 */
export function VerificationBadge({
  status,
  className,
}: {
  status: VerificationStatus;
  className?: string;
}) {
  const Icon = VERIFICATION_BADGE_ICON[status];
  return (
    <Badge tone={VERIFICATION_BADGE_TONE[status]} className={className}>
      <Icon size={13} aria-hidden="true" />
      {VERIFICATION_BADGE_LABEL[status]}
    </Badge>
  );
}
