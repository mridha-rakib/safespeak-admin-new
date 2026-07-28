import { IconAlertTriangleFilled, IconCircleCheckFilled } from "@tabler/icons-react";

import { Badge, type BadgeTone } from "@/components/ui/badge";
import type { ContentStatus } from "@/lib/models/base";
import type { VerificationStatus } from "@/lib/models/support-professional";

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

const VERIFICATION_LABEL: Record<VerificationStatus, string> = {
  verified: "Verified",
  not_verified: "Not verified",
  pending_review: "Verification pending",
};

/**
 * Verification status for support professionals. Communicated through the
 * icon AND the text label (never color alone), per the "Not verified must
 * never be confused with Verified" requirement.
 */
export function VerificationBadge({
  status,
  className,
}: {
  status: VerificationStatus;
  className?: string;
}) {
  if (status === "verified") {
    return (
      <Badge tone="success" className={className}>
        <IconCircleCheckFilled size={13} aria-hidden="true" />
        {VERIFICATION_LABEL[status]}
      </Badge>
    );
  }

  return (
    <Badge tone="warning" className={className}>
      <IconAlertTriangleFilled size={13} aria-hidden="true" />
      {VERIFICATION_LABEL[status]}
    </Badge>
  );
}
