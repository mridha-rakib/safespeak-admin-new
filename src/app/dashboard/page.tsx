"use client";

import {
  IconAlertTriangle,
  IconBuildingCommunity,
  IconCircleCheck,
  IconClockPause,
  IconFileCheck,
  IconPencil,
  IconUsersGroup,
} from "@tabler/icons-react";

import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { auditEventColumns } from "@/components/table/audit-event-columns";
import { DataTable } from "@/components/table/data-table";
import { Badge } from "@/components/ui/badge";
import { useDashboardSummary } from "@/hooks/use-dashboard-summary";

export default function DashboardPage() {
  const summary = useDashboardSummary();

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="A snapshot of local SafeSpeak content, built from this browser's demo dataset."
        actions={<Badge tone="primary">Demo data</Badge>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Published content"
          value={summary?.publishedCount}
          icon={IconCircleCheck}
          href="/publishing/review-queue"
        />
        <StatCard
          label="Draft content"
          value={summary?.draftCount}
          icon={IconPencil}
          href="/publishing/review-queue"
        />
        <StatCard
          label="Ready for review"
          value={summary?.readyForReviewCount}
          icon={IconClockPause}
          href="/publishing/review-queue"
        />
        <StatCard
          label="Sources needing update"
          value={summary?.needsUpdateCount}
          icon={IconAlertTriangle}
          href="/publishing/review-queue"
          tone="warning"
        />
        <StatCard
          label="Support organisations"
          value={summary?.supportOrganisationCount}
          icon={IconBuildingCommunity}
          href="/content/support-organisations"
        />
        <StatCard
          label="Advocates & counsellors"
          value={summary?.supportProfessionalCount}
          icon={IconUsersGroup}
          href="/content/advocates-counsellors"
        />
        <StatCard
          label="Ready for AI processing"
          value={summary?.ragReadyDocumentCount}
          icon={IconFileCheck}
          href="/content/knowledge-legislation"
        />
      </div>

      <section aria-labelledby="recent-activity-heading" className="space-y-3">
        <h2 id="recent-activity-heading" className="text-lg font-semibold text-foreground">
          Recent local activity
        </h2>
        <DataTable
          caption="Recent local activity"
          columns={auditEventColumns}
          data={summary?.recentActivity}
          searchPlaceholder="Search recent activity..."
          emptyTitle="No local activity yet"
          emptyDescription="Actions across the admin app will show up here as they happen."
          pageSizeStorageKey="safespeak-admin:dashboard-activity:page-size"
        />
      </section>
    </>
  );
}
