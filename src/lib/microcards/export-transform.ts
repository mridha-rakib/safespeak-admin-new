import type { Microcard } from "@/lib/models/microcard";
import type { MicrocardCta } from "@/lib/models/microcard-cta";

/**
 * Public export shape for Microcards — a field allow-list (not "everything
 * minus a few keys"), mirroring lib/taxonomy/export-transform.ts.
 * `internalNotes` is deliberately excluded: never appropriate for a
 * frontend consumer. See README "Published Content Bundle vs Admin Backup."
 */
export interface PublishedMicrocardExport {
  id: string;
  title: string;
  summary: string;
  body?: string;
  topic?: string;
  tags: string[];
  incidentTypeIds: string[];
  cardType: Microcard["cardType"];
  resourceCategoryId?: string;
  jurisdiction: Microcard["jurisdiction"];
  priority: Microcard["priority"];
  displayOrder: number;
  reviewDueDate?: string;
  relatedLegislationIds: string[];
  relatedSupportOrganisationIds: string[];
  cta: MicrocardCta;
  publishedDate?: string;
  status: Microcard["status"];
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export function toPublishedMicrocardExport(record: Microcard): PublishedMicrocardExport {
  return {
    id: record.id,
    title: record.title,
    summary: record.summary,
    body: record.body,
    topic: record.topic,
    tags: record.tags,
    incidentTypeIds: record.incidentTypeIds,
    cardType: record.cardType,
    resourceCategoryId: record.resourceCategoryId,
    jurisdiction: record.jurisdiction,
    priority: record.priority,
    displayOrder: record.displayOrder,
    reviewDueDate: record.reviewDueDate,
    relatedLegislationIds: record.relatedLegislationIds,
    relatedSupportOrganisationIds: record.relatedSupportOrganisationIds,
    cta: record.cta,
    publishedDate: record.publishedDate,
    status: record.status,
    isDemo: record.isDemo,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version,
  };
}
