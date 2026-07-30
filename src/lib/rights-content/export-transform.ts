import type { RightsContent } from "@/lib/models/rights-content";

/**
 * Public export shape for Rights & Legal Information — a field allow-list,
 * mirroring lib/microcards/export-transform.ts. `internalNotes` and
 * `sourceNotes` are internal-only and deliberately excluded;
 * `publicDisclaimer` is kept as-is since it is meant to be shown to users
 * verbatim — never softened or summarised. See README "Published Content
 * Bundle vs Admin Backup."
 */
export interface PublishedRightsContentExport {
  id: string;
  title: string;
  summary: string;
  body?: string;
  jurisdiction: RightsContent["jurisdiction"];
  relatedLegislationIds: string[];
  incidentTypeIds: string[];
  tags: string[];
  contentType: RightsContent["contentType"];
  resourceCategoryIds: string[];
  relatedSupportOrganisationIds: string[];
  priority: RightsContent["priority"];
  reviewDueDate?: string;
  effectiveFromDate?: string;
  publishedDate?: string;
  publicDisclaimer?: string;
  status: RightsContent["status"];
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export function toPublishedRightsContentExport(record: RightsContent): PublishedRightsContentExport {
  return {
    id: record.id,
    title: record.title,
    summary: record.summary,
    body: record.body,
    jurisdiction: record.jurisdiction,
    relatedLegislationIds: record.relatedLegislationIds,
    incidentTypeIds: record.incidentTypeIds,
    tags: record.tags,
    contentType: record.contentType,
    resourceCategoryIds: record.resourceCategoryIds,
    relatedSupportOrganisationIds: record.relatedSupportOrganisationIds,
    priority: record.priority,
    reviewDueDate: record.reviewDueDate,
    effectiveFromDate: record.effectiveFromDate,
    publishedDate: record.publishedDate,
    publicDisclaimer: record.publicDisclaimer,
    status: record.status,
    isDemo: record.isDemo,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version,
  };
}
