import type { SupportProfessional } from "@/lib/models/support-professional";

/**
 * Public export shape for Advocates & Counsellors — a field allow-list,
 * mirroring lib/support-directory/organisation-export.ts.
 * `verificationNotes`/`internalReviewNotes`/`dataSource`/`contactNotes` are
 * admin-only and excluded. `verificationStatus` is always preserved — a
 * Published but Not Verified professional must remain visibly Not Verified
 * to a frontend consumer. `profilePhoto` (metadata only, never the Blob) is
 * kept so a consumer knows an image exists; see
 * lib/bundle/export-bundle-zip.ts for how the ZIP export attaches the
 * actual image bytes at a stable, bundle-relative path.
 */
export interface PublishedProfessionalExport {
  id: string;
  fullName: string;
  displayName?: string;
  professionalType: SupportProfessional["professionalType"];
  profilePhoto?: SupportProfessional["profilePhoto"];
  organisationId?: string;
  jobTitle?: string;
  shortIntroduction?: string;
  fullBiography?: string;
  areasOfSupport: string[];
  resourceCategoryIds: string[];
  incidentTypeIds: string[];
  triageLabelIds: string[];
  specialisations: string[];
  communitiesSupported: string[];
  ageGroupsSupported: string[];
  jurisdictions: SupportProfessional["jurisdictions"];
  australiaWide: boolean;
  serviceLocations: string[];
  supportModes: SupportProfessional["supportModes"];
  availability?: string;
  timeZone?: string;
  languages: string[];
  accessibilitySupport: string[];
  costType: SupportProfessional["costType"];
  feeInformation?: string;
  acceptingNewReferrals: boolean;
  phone?: string;
  email?: string;
  bookingUrl?: string;
  organisationWebsite?: string;
  referralInstructions?: string;
  verificationStatus: SupportProfessional["verificationStatus"];
  verifiedDate?: string;
  verificationExpiryDate?: string;
  credentials: string[];
  registrationOrMembershipDetails?: string;
  nextReviewDate?: string;
  publishedDate?: string;
  status: SupportProfessional["status"];
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export function toPublishedProfessionalExport(record: SupportProfessional): PublishedProfessionalExport {
  return {
    id: record.id,
    fullName: record.fullName,
    displayName: record.displayName,
    professionalType: record.professionalType,
    profilePhoto: record.profilePhoto,
    organisationId: record.organisationId,
    jobTitle: record.jobTitle,
    shortIntroduction: record.shortIntroduction,
    fullBiography: record.fullBiography,
    areasOfSupport: record.areasOfSupport,
    resourceCategoryIds: record.resourceCategoryIds,
    incidentTypeIds: record.incidentTypeIds,
    triageLabelIds: record.triageLabelIds,
    specialisations: record.specialisations,
    communitiesSupported: record.communitiesSupported,
    ageGroupsSupported: record.ageGroupsSupported,
    jurisdictions: record.jurisdictions,
    australiaWide: record.australiaWide,
    serviceLocations: record.serviceLocations,
    supportModes: record.supportModes,
    availability: record.availability,
    timeZone: record.timeZone,
    languages: record.languages,
    accessibilitySupport: record.accessibilitySupport,
    costType: record.costType,
    feeInformation: record.feeInformation,
    acceptingNewReferrals: record.acceptingNewReferrals,
    phone: record.phone,
    email: record.email,
    bookingUrl: record.bookingUrl,
    organisationWebsite: record.organisationWebsite,
    referralInstructions: record.referralInstructions,
    verificationStatus: record.verificationStatus,
    verifiedDate: record.verifiedDate,
    verificationExpiryDate: record.verificationExpiryDate,
    credentials: record.credentials,
    registrationOrMembershipDetails: record.registrationOrMembershipDetails,
    nextReviewDate: record.nextReviewDate,
    publishedDate: record.publishedDate,
    status: record.status,
    isDemo: record.isDemo,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version,
  };
}
