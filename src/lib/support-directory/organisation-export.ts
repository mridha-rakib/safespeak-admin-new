import type { SupportOrganisation } from "@/lib/models/support-organisation";

/**
 * Public export shape for Support Organisations — a field allow-list,
 * mirroring lib/microcards/export-transform.ts. `internalNotes` and
 * `verificationNotes` are admin-only and deliberately excluded.
 * `verificationStatus` itself is preserved (never stripped) — a Published
 * but Not Verified organisation must remain visibly Not Verified to a
 * frontend consumer, never silently upgraded to "verified" by omission.
 */
export interface PublishedOrganisationExport {
  id: string;
  name: string;
  organisationType: SupportOrganisation["organisationType"];
  shortDescription?: string;
  fullDescription?: string;
  servicesOffered: string[];
  resourceCategoryIds: string[];
  incidentTypeIds: string[];
  jurisdictions: SupportOrganisation["jurisdictions"];
  australiaWide: boolean;
  audienceGroups: string[];
  languages: string[];
  serviceDeliveryModes: SupportOrganisation["serviceDeliveryModes"];
  tags: string[];
  eligibilityInformation?: string;
  costInformation?: string;
  openingHours?: string;
  accessibilityInformation?: string;
  emergencyService: boolean;
  phone?: string;
  email?: string;
  website?: string;
  bookingUrl?: string;
  referralUrl?: string;
  address?: string;
  postalAddress?: string;
  verificationStatus: SupportOrganisation["verificationStatus"];
  verifiedDate?: string;
  verificationExpiryDate?: string;
  reviewDueDate?: string;
  publishedDate?: string;
  status: SupportOrganisation["status"];
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export function toPublishedOrganisationExport(record: SupportOrganisation): PublishedOrganisationExport {
  return {
    id: record.id,
    name: record.name,
    organisationType: record.organisationType,
    shortDescription: record.shortDescription,
    fullDescription: record.fullDescription,
    servicesOffered: record.servicesOffered,
    resourceCategoryIds: record.resourceCategoryIds,
    incidentTypeIds: record.incidentTypeIds,
    jurisdictions: record.jurisdictions,
    australiaWide: record.australiaWide,
    audienceGroups: record.audienceGroups,
    languages: record.languages,
    serviceDeliveryModes: record.serviceDeliveryModes,
    tags: record.tags,
    eligibilityInformation: record.eligibilityInformation,
    costInformation: record.costInformation,
    openingHours: record.openingHours,
    accessibilityInformation: record.accessibilityInformation,
    emergencyService: record.emergencyService,
    phone: record.phone,
    email: record.email,
    website: record.website,
    bookingUrl: record.bookingUrl,
    referralUrl: record.referralUrl,
    address: record.address,
    postalAddress: record.postalAddress,
    verificationStatus: record.verificationStatus,
    verifiedDate: record.verifiedDate,
    verificationExpiryDate: record.verificationExpiryDate,
    reviewDueDate: record.reviewDueDate,
    publishedDate: record.publishedDate,
    status: record.status,
    isDemo: record.isDemo,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version,
  };
}
