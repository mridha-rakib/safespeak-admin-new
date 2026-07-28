"use client";

import { useLiveQuery } from "dexie-react-hooks";

import { useAdminRepository } from "@/components/providers/repository-provider";
import type { AuditEntityType } from "@/lib/models/audit-event";
import type { ContentStatus } from "@/lib/models/base";

export interface ReviewQueueItem {
  id: string;
  domain: AuditEntityType;
  domainLabel: string;
  title: string;
  status: ContentStatus;
  updatedAt: string;
}

const DOMAIN_LABEL: Record<string, string> = {
  document: "Knowledge & Legislation",
  microcard: "Microcard",
  rights_content: "Rights & Legal Information",
  support_organisation: "Support Organisation",
  support_professional: "Advocate/Counsellor",
  reporting_destination: "Reporting Destination",
};

/** Cross-domain view of everything sitting in "ready_for_review" — read-only in this phase. */
export function useReviewQueue(): ReviewQueueItem[] | undefined {
  const { repository } = useAdminRepository();

  return useLiveQuery(async () => {
    if (!repository) return undefined;

    const [documents, microcards, rightsContent, supportOrganisations, supportProfessionals, reportingDestinations] =
      await Promise.all([
        repository.documents.list(),
        repository.microcards.list(),
        repository.rightsContent.list(),
        repository.supportOrganisations.list(),
        repository.supportProfessionals.list(),
        repository.reportingDestinations.list(),
      ]);

    const items: ReviewQueueItem[] = [
      ...documents.map((r) => ({ id: r.id, domain: "document" as const, title: r.title, status: r.status, updatedAt: r.updatedAt })),
      ...microcards.map((r) => ({ id: r.id, domain: "microcard" as const, title: r.title, status: r.status, updatedAt: r.updatedAt })),
      ...rightsContent.map((r) => ({ id: r.id, domain: "rights_content" as const, title: r.title, status: r.status, updatedAt: r.updatedAt })),
      ...supportOrganisations.map((r) => ({ id: r.id, domain: "support_organisation" as const, title: r.name, status: r.status, updatedAt: r.updatedAt })),
      ...supportProfessionals.map((r) => ({ id: r.id, domain: "support_professional" as const, title: r.fullName, status: r.status, updatedAt: r.updatedAt })),
      ...reportingDestinations.map((r) => ({ id: r.id, domain: "reporting_destination" as const, title: r.name, status: r.status, updatedAt: r.updatedAt })),
    ]
      .filter((item) => item.status === "ready_for_review")
      .map((item) => ({ ...item, domainLabel: DOMAIN_LABEL[item.domain] ?? item.domain }));

    return items;
  }, [repository]);
}
