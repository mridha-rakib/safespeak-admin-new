import type { ReportingDestination } from "@/lib/models/reporting-destination";

/**
 * Public export shape for Reporting Destinations — a field allow-list,
 * mirroring lib/support-directory/organisation-export.ts. `sourceNotes` and
 * `internalNotes` are admin-only and excluded; `publicDisclaimer` is kept
 * verbatim (never softened or summarised), matching Rights & Legal
 * Information's export policy.
 */
export interface PublishedDestinationExport {
  id: string;
  name: string;
  destinationType: ReportingDestination["destinationType"];
  description?: string;
  fullDescription?: string;
  organisationId?: string;
  resourceCategoryIds: string[];
  incidentTypeIds: string[];
  jurisdictions: ReportingDestination["jurisdictions"];
  australiaWide: boolean;
  audienceGroups: string[];
  languages: string[];
  tags: string[];
  reportingMethods: ReportingDestination["reportingMethods"];
  phone?: string;
  email?: string;
  website?: string;
  onlineReportingUrl?: string;
  bookingUrl?: string;
  address?: string;
  openingHours?: string;
  reportingInstructions?: string;
  evidenceGuidance?: string;
  eligibilityInformation?: string;
  costInformation?: string;
  anonymousReporting: ReportingDestination["anonymousReporting"];
  confidentialityInformation?: string;
  emergencySuitability: ReportingDestination["emergencySuitability"];
  responseExpectations?: string;
  publicDisclaimer?: string;
  reviewDueDate?: string;
  publishedDate?: string;
  status: ReportingDestination["status"];
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export function toPublishedDestinationExport(record: ReportingDestination): PublishedDestinationExport {
  return {
    id: record.id,
    name: record.name,
    destinationType: record.destinationType,
    description: record.description,
    fullDescription: record.fullDescription,
    organisationId: record.organisationId,
    resourceCategoryIds: record.resourceCategoryIds,
    incidentTypeIds: record.incidentTypeIds,
    jurisdictions: record.jurisdictions,
    australiaWide: record.australiaWide,
    audienceGroups: record.audienceGroups,
    languages: record.languages,
    tags: record.tags,
    reportingMethods: record.reportingMethods,
    phone: record.phone,
    email: record.email,
    website: record.website,
    onlineReportingUrl: record.onlineReportingUrl,
    bookingUrl: record.bookingUrl,
    address: record.address,
    openingHours: record.openingHours,
    reportingInstructions: record.reportingInstructions,
    evidenceGuidance: record.evidenceGuidance,
    eligibilityInformation: record.eligibilityInformation,
    costInformation: record.costInformation,
    anonymousReporting: record.anonymousReporting,
    confidentialityInformation: record.confidentialityInformation,
    emergencySuitability: record.emergencySuitability,
    responseExpectations: record.responseExpectations,
    publicDisclaimer: record.publicDisclaimer,
    reviewDueDate: record.reviewDueDate,
    publishedDate: record.publishedDate,
    status: record.status,
    isDemo: record.isDemo,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version,
  };
}
