"use client";

import {
  IconAlertTriangle,
  IconBuildingCommunity,
  IconCards,
  IconCircleCheck,
  IconClockPause,
  IconFileCheck,
  IconFlag,
  IconGavel,
  IconPencil,
  IconRoute,
  IconShieldCheck,
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Published microcards"
          value={summary?.publishedMicrocardCount}
          icon={IconCards}
          href="/content/microcards"
        />
        <StatCard
          label="Draft microcards"
          value={summary?.draftMicrocardCount}
          icon={IconPencil}
          href="/content/microcards"
        />
        <StatCard
          label="Published rights content"
          value={summary?.publishedRightsContentCount}
          icon={IconGavel}
          href="/content/rights-legal-information"
        />
        <StatCard
          label="Rights content awaiting review"
          value={summary?.rightsContentAwaitingReviewCount}
          icon={IconClockPause}
          href="/content/rights-legal-information"
        />
        <StatCard
          label="Educational content needing update"
          value={summary?.educationalContentNeedsUpdateCount}
          icon={IconAlertTriangle}
          href="/publishing/review-queue"
          tone="warning"
        />
        <StatCard
          label="Educational content review overdue"
          value={summary?.educationalContentReviewOverdueCount}
          icon={IconAlertTriangle}
          href="/publishing/review-queue"
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Published Support Organisations"
          value={summary?.publishedOrganisationCount}
          icon={IconBuildingCommunity}
          href="/content/support-organisations"
        />
        <StatCard
          label="Organisations awaiting review"
          value={summary?.organisationAwaitingReviewCount}
          icon={IconClockPause}
          href="/content/support-organisations"
        />
        <StatCard
          label="Verified organisations"
          value={summary?.verifiedOrganisationCount}
          icon={IconShieldCheck}
          href="/content/support-organisations"
        />
        <StatCard
          label="Published Advocates & Counsellors"
          value={summary?.publishedProfessionalCount}
          icon={IconUsersGroup}
          href="/content/advocates-counsellors"
        />
        <StatCard
          label="Published but not verified professionals"
          value={summary?.publishedUnverifiedProfessionalCount}
          icon={IconAlertTriangle}
          href="/content/advocates-counsellors"
          tone="warning"
        />
        <StatCard
          label="Professionals awaiting review"
          value={summary?.professionalAwaitingReviewCount}
          icon={IconClockPause}
          href="/content/advocates-counsellors"
        />
        <StatCard
          label="Published Reporting Destinations"
          value={summary?.publishedDestinationCount}
          icon={IconFlag}
          href="/content/reporting-destinations"
        />
        <StatCard
          label="Reporting Destinations awaiting review"
          value={summary?.destinationAwaitingReviewCount}
          icon={IconClockPause}
          href="/content/reporting-destinations"
        />
        <StatCard
          label="Support Directory records needing update"
          value={summary?.supportDirectoryNeedsUpdateCount}
          icon={IconAlertTriangle}
          href="/publishing/review-queue"
          tone="warning"
        />
        <StatCard
          label="Support Directory records review overdue"
          value={summary?.supportDirectoryReviewOverdueCount}
          icon={IconAlertTriangle}
          href="/publishing/review-queue"
          tone="warning"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Published matching rules"
          value={summary?.publishedMatchingRuleCount}
          icon={IconRoute}
          href="/taxonomy/matching-rules"
        />
        <StatCard
          label="Enabled published matching rules"
          value={summary?.enabledPublishedMatchingRuleCount}
          icon={IconRoute}
          href="/taxonomy/matching-rules"
        />
        <StatCard
          label="Disabled published matching rules"
          value={summary?.disabledPublishedMatchingRuleCount}
          icon={IconRoute}
          href="/taxonomy/matching-rules"
          tone="warning"
        />
        <StatCard
          label="Matching rules awaiting review"
          value={summary?.matchingRulesAwaitingReviewCount}
          icon={IconClockPause}
          href="/taxonomy/matching-rules"
        />
        <StatCard
          label="Matching rules needing update"
          value={summary?.matchingRulesNeedsUpdateCount}
          icon={IconAlertTriangle}
          href="/taxonomy/matching-rules"
          tone="warning"
        />
        <StatCard
          label="Matching rules review overdue"
          value={summary?.matchingRulesReviewOverdueCount}
          icon={IconAlertTriangle}
          href="/taxonomy/matching-rules"
          tone="warning"
        />
        <StatCard
          label="Matching rules with broken relationships"
          value={summary?.matchingRulesWithBrokenRelationshipsCount}
          icon={IconAlertTriangle}
          href="/taxonomy/matching-rules"
          tone="warning"
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
