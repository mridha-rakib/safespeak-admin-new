"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { useAdminRepository } from "@/components/providers/repository-provider";
import type { AuditEntityType } from "@/lib/models/audit-event";
import type { ContentStatus } from "@/lib/models/base";
import type { VerificationStatus } from "@/lib/models/verification";
import { getMicrocardBlockers } from "@/lib/microcards/eligibility";
import { getMatchingRuleBlockers } from "@/lib/matching-rules/eligibility";
import { getRightsContentBlockers } from "@/lib/rights-content/eligibility";
import { getSupportOrganisationBlockers } from "@/lib/support-directory/support-organisation-eligibility";
import { getProfessionalBlockers } from "@/lib/support-directory/professional-eligibility";
import { getDestinationBlockers } from "@/lib/support-directory/destination-eligibility";

export interface ReviewQueueItem {
  id: string;
  domain: AuditEntityType;
  domainLabel: string;
  title: string;
  status: ContentStatus;
  updatedAt: string;
  /** Only set for domains with a review-due-date-shaped field. */
  reviewDueDate?: string;
  /** Only set for Support Organisations and Advocates/Counsellors — Reporting Destinations and every educational-content domain have no verification concept. */
  verificationStatus?: VerificationStatus;
  /** Computed per-domain via that domain's own eligibility helper. Empty array for domains without a Publish eligibility check (documents use their own legislation-specific guard, not modelled here). */
  blockers: string[];
  detailHref: string;
  listHref: string;
}

const DOMAIN_LABEL: Record<string, string> = {
  document: "Knowledge & Legislation",
  microcard: "Microcard",
  rights_content: "Rights & Legal Information",
  support_organisation: "Support Organisation",
  support_professional: "Advocate/Counsellor",
  reporting_destination: "Reporting Destination",
  matching_rule: "Matching Rule",
};

/** Cross-domain view of everything sitting in "ready_for_review". */
export function useReviewQueue(): ReviewQueueItem[] | undefined {
  const { repository } = useAdminRepository();

  return useLiveQuery(async () => {
    if (!repository) return undefined;

    const [
      documents,
      microcards,
      rightsContent,
      supportOrganisations,
      supportProfessionals,
      reportingDestinations,
      resourceCategories,
      incidentTypes,
      triageLabels,
      matchingRules,
    ] = await Promise.all([
      repository.documents.list(),
      repository.microcards.list(),
      repository.rightsContent.list(),
      repository.supportOrganisations.list(),
      repository.supportProfessionals.list(),
      repository.reportingDestinations.list(),
      repository.resourceCategories.list(),
      repository.incidentTypes.list(),
      repository.triageLabels.list(),
      repository.matchingRules.list(),
    ]);

    const contentEligibilityContext = { documents, resourceCategories, supportOrganisations, rightsContent };
    const directoryEligibilityContext = { resourceCategories, supportOrganisations };
    const matchingRuleEligibilityContext = {
      incidentTypes,
      triageLabels,
      resourceCategories,
      microcards,
      rightsContent,
      supportOrganisations,
      supportProfessionals,
      reportingDestinations,
      documents,
    };

    const items: ReviewQueueItem[] = [
      ...documents.map((r) => ({
        id: r.id,
        domain: "document" as const,
        title: r.title,
        status: r.status,
        updatedAt: r.updatedAt,
        blockers: [],
        detailHref: `/content/knowledge-legislation/${r.id}`,
        listHref: "/content/knowledge-legislation",
      })),
      ...microcards.map((r) => ({
        id: r.id,
        domain: "microcard" as const,
        title: r.title,
        status: r.status,
        updatedAt: r.updatedAt,
        reviewDueDate: r.reviewDueDate,
        blockers: getMicrocardBlockers(r, contentEligibilityContext),
        detailHref: `/content/microcards/${r.id}`,
        listHref: "/content/microcards",
      })),
      ...rightsContent.map((r) => ({
        id: r.id,
        domain: "rights_content" as const,
        title: r.title,
        status: r.status,
        updatedAt: r.updatedAt,
        reviewDueDate: r.reviewDueDate,
        blockers: getRightsContentBlockers(r, contentEligibilityContext),
        detailHref: `/content/rights-legal-information/${r.id}`,
        listHref: "/content/rights-legal-information",
      })),
      ...supportOrganisations.map((r) => ({
        id: r.id,
        domain: "support_organisation" as const,
        title: r.name,
        status: r.status,
        updatedAt: r.updatedAt,
        reviewDueDate: r.reviewDueDate,
        verificationStatus: r.verificationStatus,
        blockers: getSupportOrganisationBlockers(r, directoryEligibilityContext),
        detailHref: `/content/support-organisations/${r.id}`,
        listHref: "/content/support-organisations",
      })),
      ...supportProfessionals.map((r) => ({
        id: r.id,
        domain: "support_professional" as const,
        title: r.fullName,
        status: r.status,
        updatedAt: r.updatedAt,
        reviewDueDate: r.nextReviewDate,
        verificationStatus: r.verificationStatus,
        blockers: getProfessionalBlockers(r, directoryEligibilityContext),
        detailHref: `/content/advocates-counsellors/${r.id}`,
        listHref: "/content/advocates-counsellors",
      })),
      ...reportingDestinations.map((r) => ({
        id: r.id,
        domain: "reporting_destination" as const,
        title: r.name,
        status: r.status,
        updatedAt: r.updatedAt,
        reviewDueDate: r.reviewDueDate,
        blockers: getDestinationBlockers(r, directoryEligibilityContext),
        detailHref: `/content/reporting-destinations/${r.id}`,
        listHref: "/content/reporting-destinations",
      })),
      ...matchingRules.map((r) => ({
        id: r.id,
        domain: "matching_rule" as const,
        title: r.name,
        status: r.status,
        updatedAt: r.updatedAt,
        reviewDueDate: r.reviewDueDate,
        blockers: getMatchingRuleBlockers(r, matchingRuleEligibilityContext),
        detailHref: `/taxonomy/matching-rules/${r.id}`,
        listHref: "/taxonomy/matching-rules",
      })),
    ]
      .filter((item) => item.status === "ready_for_review")
      .map((item) => ({ ...item, domainLabel: DOMAIN_LABEL[item.domain] ?? item.domain }));

    return items;
  }, [repository]);
}
