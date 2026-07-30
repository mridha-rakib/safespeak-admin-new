"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Route } from "next";
import Link from "next/link";

import { PublishableRowActions } from "@/components/content/publishable-row-actions";
import { Badge } from "@/components/ui/badge";
import { ContentStatusBadge, VerificationBadge } from "@/components/ui/status-badge";
import { getReviewDueState, REVIEW_DUE_STATE_LABEL } from "@/lib/content/review-due";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import { ORGANISATION_TYPE_LABEL } from "@/lib/models/organisation-type";
import type { SupportOrganisation } from "@/lib/models/support-organisation";
import type { PublishableContentRepository } from "@/lib/repositories/admin-content-repository";
import { deriveOrganisationContactCapabilities } from "@/lib/support-directory/contact";
import { getSupportOrganisationBlockers, type SupportOrganisationEligibilityContext } from "@/lib/support-directory/support-organisation-eligibility";

const REVIEW_DUE_TONE: Record<ReturnType<typeof getReviewDueState>, "neutral" | "warning" | "destructive"> = {
  current: "neutral",
  due_soon: "warning",
  overdue: "destructive",
  none: "neutral",
};

export function buildSupportOrganisationColumns(
  repository: PublishableContentRepository<SupportOrganisation>,
  eligibilityContext: SupportOrganisationEligibilityContext | undefined
): ColumnDef<SupportOrganisation, unknown>[] {
  return [
    {
      accessorKey: "name",
      header: "Organisation",
      cell: ({ row }) => (
        <Link
          href={`/content/support-organisations/${row.original.id}` as Route}
          className="font-medium text-foreground hover:text-primary hover:underline"
          prefetch={false}
        >
          {row.original.name}
        </Link>
      ),
    },
    {
      accessorKey: "organisationType",
      header: "Organisation type",
      cell: ({ getValue }) => {
        const type = getValue<SupportOrganisation["organisationType"]>();
        return type ? ORGANISATION_TYPE_LABEL[type] : "Not set";
      },
    },
    {
      id: "jurisdictions",
      header: "Jurisdictions",
      cell: ({ row }) =>
        row.original.australiaWide ? "Australia-wide" : row.original.jurisdictions.map(jurisdictionLabel).join(", ") || "Not set",
    },
    {
      id: "contactMethods",
      header: "Contact methods",
      cell: ({ row }) => {
        const capabilities = deriveOrganisationContactCapabilities(row.original);
        const methods = [
          capabilities.canCall && "Phone",
          capabilities.canEmail && "Email",
          capabilities.canVisitWebsite && "Website",
          capabilities.canBook && "Booking",
          capabilities.canRefer && "Referral",
        ].filter(Boolean);
        return methods.length > 0 ? methods.join(", ") : "None on file";
      },
    },
    {
      accessorKey: "verificationStatus",
      header: "Verification",
      cell: ({ getValue }) => <VerificationBadge status={getValue<SupportOrganisation["verificationStatus"]>()} />,
    },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <ContentStatusBadge status={getValue<SupportOrganisation["status"]>()} /> },
    {
      id: "reviewDue",
      header: "Review due",
      cell: ({ row }) => {
        const state = getReviewDueState(row.original.reviewDueDate);
        return <Badge tone={REVIEW_DUE_TONE[state]}>{REVIEW_DUE_STATE_LABEL[state]}</Badge>;
      },
    },
    { accessorKey: "updatedAt", header: "Updated", cell: ({ getValue }) => new Date(getValue<string>()).toLocaleDateString() },
    { accessorKey: "isDemo", header: "Demo", cell: ({ getValue }) => (getValue<boolean>() ? <Badge tone="neutral">Demo</Badge> : null) },
    {
      id: "actions",
      header: "Actions",
      enableSorting: false,
      cell: ({ row }) => (
        <PublishableRowActions
          record={row.original}
          label={row.original.name}
          repository={repository}
          baseRoute="/content/support-organisations"
          canPublish={eligibilityContext ? getSupportOrganisationBlockers(row.original, eligibilityContext).length === 0 : false}
        />
      ),
    },
  ];
}
