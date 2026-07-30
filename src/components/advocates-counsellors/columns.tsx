"use client";

import type { ColumnDef } from "@tanstack/react-table";
import type { Route } from "next";
import Link from "next/link";

import { PublishableRowActions } from "@/components/content/publishable-row-actions";
import { Badge } from "@/components/ui/badge";
import { ContentStatusBadge, VerificationBadge } from "@/components/ui/status-badge";
import { getReviewDueState, REVIEW_DUE_STATE_LABEL } from "@/lib/content/review-due";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import type { SupportOrganisation } from "@/lib/models/support-organisation";
import { PROFESSIONAL_TYPES, type SupportProfessional } from "@/lib/models/support-professional";
import type { PublishableContentRepository } from "@/lib/repositories/admin-content-repository";
import { deriveProfessionalContactCapabilities } from "@/lib/support-directory/contact";
import { getProfessionalBlockers, type ProfessionalEligibilityContext } from "@/lib/support-directory/professional-eligibility";

const REVIEW_DUE_TONE: Record<ReturnType<typeof getReviewDueState>, "neutral" | "warning" | "destructive"> = {
  current: "neutral",
  due_soon: "warning",
  overdue: "destructive",
  none: "neutral",
};

export const PROFESSIONAL_TYPE_LABEL: Record<(typeof PROFESSIONAL_TYPES)[number], string> = {
  advocate: "Advocate",
  counsellor: "Counsellor",
  case_worker: "Case worker",
  support_worker: "Support worker",
  legal_advocate: "Legal advocate",
  cultural_support_worker: "Cultural support worker",
  victim_support_specialist: "Victim support specialist",
  other: "Other",
};

export function buildProfessionalColumns(
  repository: PublishableContentRepository<SupportProfessional>,
  organisations: SupportOrganisation[],
  eligibilityContext: ProfessionalEligibilityContext | undefined
): ColumnDef<SupportProfessional, unknown>[] {
  const organisationById = new Map(organisations.map((o) => [o.id, o]));

  return [
    {
      accessorKey: "fullName",
      header: "Professional",
      cell: ({ row }) => (
        <Link
          href={`/content/advocates-counsellors/${row.original.id}` as Route}
          className="font-medium text-foreground hover:text-primary hover:underline"
          prefetch={false}
        >
          {row.original.displayName?.trim() || row.original.fullName}
        </Link>
      ),
    },
    {
      accessorKey: "professionalType",
      header: "Professional type",
      cell: ({ getValue }) => PROFESSIONAL_TYPE_LABEL[getValue<SupportProfessional["professionalType"]>()],
    },
    {
      id: "organisation",
      header: "Organisation",
      cell: ({ row }) => {
        if (!row.original.organisationId) return "Independent";
        const org = organisationById.get(row.original.organisationId);
        return org ? org.name : "Organisation no longer exists";
      },
    },
    {
      id: "specialisations",
      header: "Specialisations",
      cell: ({ row }) => row.original.specialisations.join(", ") || "Not set",
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
        const capabilities = deriveProfessionalContactCapabilities(row.original);
        const methods = [
          capabilities.canCall && "Phone",
          capabilities.canEmail && "Email",
          capabilities.canBook && "Booking",
          capabilities.canVisitWebsite && "Website",
        ].filter(Boolean);
        return methods.length > 0 ? methods.join(", ") : "None on file";
      },
    },
    {
      accessorKey: "verificationStatus",
      header: "Verification",
      cell: ({ getValue }) => <VerificationBadge status={getValue<SupportProfessional["verificationStatus"]>()} />,
    },
    { accessorKey: "status", header: "Status", cell: ({ getValue }) => <ContentStatusBadge status={getValue<SupportProfessional["status"]>()} /> },
    {
      id: "reviewDue",
      header: "Review due",
      cell: ({ row }) => {
        const state = getReviewDueState(row.original.nextReviewDate);
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
          label={row.original.fullName}
          repository={repository}
          baseRoute="/content/advocates-counsellors"
          canPublish={eligibilityContext ? getProfessionalBlockers(row.original, eligibilityContext).length === 0 : false}
        />
      ),
    },
  ];
}
