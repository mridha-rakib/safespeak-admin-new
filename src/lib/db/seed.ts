import { createAuditEvent, type AuditEvent } from "@/lib/models/audit-event";
import { LOCAL_ADMIN_ACTOR } from "@/lib/models/base";
import { documentSchema, type DocumentRecord } from "@/lib/models/document";
import { incidentTypeSchema } from "@/lib/models/incident-type";
import { matchingRuleSchema } from "@/lib/models/matching-rule";
import { microcardSchema } from "@/lib/models/microcard";
import { reportingDestinationSchema } from "@/lib/models/reporting-destination";
import { resourceCategorySchema } from "@/lib/models/resource-category";
import { rightsContentSchema } from "@/lib/models/rights-content";
import { supportOrganisationSchema } from "@/lib/models/support-organisation";
import { supportProfessionalSchema } from "@/lib/models/support-professional";
import { triageLabelSchema } from "@/lib/models/triage-label";

/**
 * Every seed array below is parsed through its Zod schema before being
 * exported, both so schema defaults fill in any field a literal omits and so
 * a typo in demo data is caught at module load time rather than silently
 * stored — the same "validate seed data" rule that applies to persisted and
 * imported data (see lib/db/validation.ts).
 */

/**
 * Every id below is fixed (not randomly generated) so that "Reset demo data"
 * produces the exact same dataset every time. Fictional names, `example.org`
 * emails/websites (reserved for documentation use by RFC 2606), and
 * `0000 000 000`-style phone numbers are used throughout — nothing here is a
 * real phone number, booking link, registration number, or legal claim.
 */
const SEED_TIMESTAMP = "2026-06-01T09:00:00.000Z";

function demoBase(id: string, status: DocumentRecord["status"] = "draft") {
  return {
    id,
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP,
    createdBy: LOCAL_ADMIN_ACTOR,
    updatedBy: LOCAL_ADMIN_ACTOR,
    isDemo: true as const,
    status,
    version: 1,
  };
}

const seedIncidentTypesRaw = [
  {
    ...demoBase("demo-incident-online-harassment", "published"),
    name: "Online harassment",
    description: "Repeated unwanted contact, threats, or abuse through digital platforms.",
    category: "Digital safety",
  },
  {
    ...demoBase("demo-incident-workplace-discrimination", "published"),
    name: "Workplace discrimination",
    description: "Unequal or unfair treatment connected to race, ethnicity, or background.",
    category: "Workplace",
  },
  {
    ...demoBase("demo-incident-hate-speech", "published"),
    name: "Hate speech incident",
    description: "Public or targeted speech that vilifies a person or group.",
    category: "Community",
  },
  {
    ...demoBase("demo-incident-domestic-violence", "draft"),
    name: "Domestic and family violence",
    description: "Placeholder demo category — content review still in progress.",
    category: "Home and family",
  },
];
export const seedIncidentTypes = seedIncidentTypesRaw.map((r) => incidentTypeSchema.parse(r));

const seedTriageLabelsRaw = [
  {
    ...demoBase("demo-triage-urgent-safety-risk", "published"),
    name: "Urgent safety risk",
    description: "Immediate risk to physical safety.",
    urgencyLevel: "critical",
  },
  {
    ...demoBase("demo-triage-escalate-authority", "published"),
    name: "Escalate to authority",
    description: "Should be routed toward a formal reporting destination.",
    urgencyLevel: "high",
  },
  {
    ...demoBase("demo-triage-needs-follow-up", "published"),
    name: "Needs follow-up",
    description: "Not urgent, but should not be left without a next step.",
    urgencyLevel: "moderate",
  },
  {
    ...demoBase("demo-triage-information-only", "published"),
    name: "Information only",
    description: "Person is seeking information rather than immediate support.",
    urgencyLevel: "low",
  },
];
export const seedTriageLabels = seedTriageLabelsRaw.map((r) => triageLabelSchema.parse(r));

const seedResourceCategoriesRaw = [
  {
    ...demoBase("demo-category-legal-rights", "published"),
    name: "Legal rights",
    description: "Content explaining rights in plain language.",
  },
  {
    ...demoBase("demo-category-emotional-support", "published"),
    name: "Emotional support",
    description: "Wellbeing and counselling-oriented resources.",
  },
  {
    ...demoBase("demo-category-reporting-pathways", "draft"),
    name: "Reporting pathways",
    description: "Draft category describing how and where to report an incident.",
  },
];
export const seedResourceCategories = seedResourceCategoriesRaw.map((r) => resourceCategorySchema.parse(r));

const seedDocumentsRaw = [
  {
    ...demoBase("demo-doc-discrimination-act-guide", "published"),
    title: "Racial Discrimination Act — Plain-Language Summary (Demo)",
    legislationName: "Racial Discrimination Act (Demo)",
    file: { fileName: "racial-discrimination-act-summary-demo.pdf", fileSizeBytes: 482_133, fileType: "application/pdf", pageCount: 6 },
    sourceType: "legislation",
    sourceCategory: "Federal legislation",
    authorityOrPublisher: "Demo Legal Reference Library",
    jurisdiction: "Demo Jurisdiction",
    language: "en",
    actNumber: "DEMO-1975-52",
    documentVersionLabel: "1.0",
    sourceUrl: "https://example.org/legislation/demo-discrimination-act",
    effectiveDate: "2025-01-01",
    lastUpdatedDate: "2026-05-01",
    nextReviewDate: "2027-01-01",
    licenseStatus: "government_open_license",
    relevantSections: ["Part II — Prohibition of racial discrimination"],
    topic: "Discrimination law",
    tags: ["legislation", "discrimination", "rights"],
    incidentTypeIds: ["demo-incident-workplace-discrimination", "demo-incident-hate-speech"],
    priority: "high",
    aiUsagePermission: true,
    legalReviewComplete: true,
    reviewNotes: "Reviewed against the demo legal reference library on 2026-05-01.",
    processingStatus: "ready_for_ai_processing",
    extractionStatus: "extracted",
    localPreviewStatus: "available",
    extractedTextPreview:
      "This demo excerpt stands in for the opening section of the Act, describing the prohibition of racial discrimination in employment, education, and access to services.",
  },
  {
    ...demoBase("demo-doc-workplace-harassment-policy", "ready_for_review"),
    title: "Workplace Harassment Policy Template (Demo)",
    file: { fileName: "workplace-harassment-policy-template-demo.pdf", fileSizeBytes: 210_552, fileType: "application/pdf", pageCount: 3 },
    sourceType: "policy",
    sourceCategory: "Organisational policy",
    authorityOrPublisher: "Demo Workplace Standards Office",
    jurisdiction: "Demo Jurisdiction",
    language: "en",
    licenseStatus: "restricted_internal_use",
    relevantSections: [],
    topic: "Workplace conduct",
    tags: ["policy", "workplace"],
    incidentTypeIds: ["demo-incident-workplace-discrimination"],
    priority: "medium",
    aiUsagePermission: false,
    legalReviewComplete: false,
    reviewNotes: "Awaiting legal/governance sign-off before this can be published.",
    processingStatus: "not_processed",
    extractionStatus: "not_extracted",
    localPreviewStatus: "unavailable",
  },
  {
    ...demoBase("demo-doc-community-reporting-guidelines", "draft"),
    title: "Draft Community Reporting Guidelines (Demo)",
    file: { fileName: "community-reporting-guidelines-demo.pdf", fileSizeBytes: 88_004, fileType: "application/pdf" },
    sourceType: "guideline",
    sourceCategory: "Community guidance",
    jurisdiction: "Demo Jurisdiction",
    language: "en",
    licenseStatus: "unknown",
    relevantSections: [],
    tags: ["guideline", "draft"],
    incidentTypeIds: [],
    priority: "low",
    aiUsagePermission: false,
    legalReviewComplete: false,
    processingStatus: "processing_issue",
    extractionStatus: "extraction_failed",
    localPreviewStatus: "unavailable",
    processingIssue:
      "This demo file could not be read locally — it stands in for a password-protected or corrupted upload.",
  },
];
export const seedDocuments: DocumentRecord[] = seedDocumentsRaw.map((r) => documentSchema.parse(r));

const seedMicrocardsRaw = [
  {
    ...demoBase("demo-microcard-know-your-right-to-a-safe-workplace", "published"),
    title: "Know your right to a safe workplace",
    summary: "A short explainer on what a safe workplace legally means (demo content).",
    body: "Demo body copy — a real card would give a short, plain-language explanation with a link to fuller rights content.",
    topic: "Workplace rights",
    tags: ["rights", "workplace"],
    incidentTypeIds: ["demo-incident-workplace-discrimination"],
  },
  {
    ...demoBase("demo-microcard-what-counts-as-racial-harassment", "published"),
    title: "What counts as racial harassment?",
    summary: "Plain-language examples to help someone recognise racial harassment (demo content).",
    topic: "Understanding harassment",
    tags: ["harassment", "education"],
    incidentTypeIds: ["demo-incident-hate-speech"],
  },
  {
    ...demoBase("demo-microcard-document-an-incident-safely", "draft"),
    title: "How to document an incident safely",
    summary: "Draft guidance on keeping a safe, private record of what happened (demo content).",
    topic: "Evidence and documentation",
    tags: ["documentation"],
    incidentTypeIds: [],
  },
];
export const seedMicrocards = seedMicrocardsRaw.map((r) => microcardSchema.parse(r));

const seedRightsContentRaw = [
  {
    ...demoBase("demo-rights-report-anonymously", "published"),
    title: "Your right to report anonymously",
    summary: "An overview of anonymous reporting options (demo content, not legal advice).",
    jurisdiction: "Demo Jurisdiction",
    relatedLegislationIds: ["demo-doc-discrimination-act-guide"],
    incidentTypeIds: ["demo-incident-online-harassment"],
    tags: ["reporting", "privacy"],
  },
  {
    ...demoBase("demo-rights-reasonable-adjustments", "draft"),
    title: "Understanding reasonable adjustments",
    summary: "Draft explainer on reasonable adjustments at work (demo content, not legal advice).",
    jurisdiction: "Demo Jurisdiction",
    relatedLegislationIds: [],
    incidentTypeIds: ["demo-incident-workplace-discrimination"],
    tags: ["workplace"],
  },
];
export const seedRightsContent = seedRightsContentRaw.map((r) => rightsContentSchema.parse(r));

const seedSupportOrganisationsRaw = [
  {
    ...demoBase("demo-org-harborlight-community-support", "published"),
    name: "Harborlight Community Support (Demo)",
    shortDescription: "Fictional demo organisation offering general community support.",
    servicesOffered: ["Counselling referral", "Peer support groups"],
    incidentTypeIds: ["demo-incident-online-harassment", "demo-incident-hate-speech"],
    jurisdictions: ["Demo Jurisdiction"],
    phone: "0000 000 001",
    email: "contact@example.org",
    website: "https://example.org/harborlight-demo",
    address: "1 Demo Street, Sample City",
    verified: true,
  },
  {
    ...demoBase("demo-org-northside-cultural-wellbeing", "draft"),
    name: "Northside Cultural Wellbeing Centre (Demo)",
    shortDescription: "Fictional demo organisation — profile still being drafted.",
    servicesOffered: ["Cultural support"],
    incidentTypeIds: ["demo-incident-hate-speech"],
    jurisdictions: ["Demo Jurisdiction"],
    email: "hello@example.org",
    verified: false,
  },
  {
    ...demoBase("demo-org-coastal-legal-aid-clinic", "published"),
    name: "Coastal Legal Aid Clinic (Demo)",
    shortDescription: "Fictional demo legal aid clinic used to exercise verified-organisation display.",
    servicesOffered: ["Free legal advice", "Discrimination complaints support"],
    incidentTypeIds: ["demo-incident-workplace-discrimination"],
    jurisdictions: ["Demo Jurisdiction"],
    phone: "0000 000 002",
    website: "https://example.org/coastal-legal-aid-demo",
    verified: true,
  },
];
export const seedSupportOrganisations = seedSupportOrganisationsRaw.map((r) => supportOrganisationSchema.parse(r));

const seedSupportProfessionalsRaw = [
  {
    ...demoBase("demo-advocate-amina-farouk", "published"),
    fullName: "Amina Farouk",
    displayName: "Amina F.",
    professionalType: "counsellor",
    organisation: "Harborlight Community Support (Demo)",
    jobTitle: "Senior Counsellor",
    shortIntroduction: "Fictional demo counsellor used to exercise a verified, published profile.",
    areasOfSupport: ["Trauma-informed counselling"],
    incidentTypeIds: ["demo-incident-online-harassment"],
    triageLabelIds: ["demo-triage-needs-follow-up"],
    specialisations: ["Racial trauma"],
    communitiesSupported: ["Multicultural communities"],
    ageGroupsSupported: ["Adults"],
    jurisdictions: ["Demo Jurisdiction"],
    serviceLocations: ["Sample City"],
    supportModes: ["video", "phone"],
    availability: "Weekdays, demo hours only",
    timeZone: "Demo/Local",
    languages: ["en"],
    accessibilitySupport: ["Captioned video calls"],
    costType: "sliding_scale",
    acceptingNewReferrals: true,
    phone: "0000 000 010",
    email: "amina.demo@example.org",
    bookingUrl: "https://example.org/book/amina-demo",
    verificationStatus: "verified",
    credentials: ["Demo Counselling Registration #DEMO-001"],
    dataSource: "Manually entered demo record",
    lastReviewedDate: "2026-05-15",
  },
  {
    ...demoBase("demo-advocate-daniel-osei", "published"),
    fullName: "Daniel Osei",
    professionalType: "advocate",
    organisation: "Independent (Demo)",
    jobTitle: "Community Advocate",
    shortIntroduction:
      "Fictional demo advocate — deliberately published while unverified to exercise the 'Not verified' warning.",
    areasOfSupport: ["Incident reporting support"],
    incidentTypeIds: ["demo-incident-hate-speech"],
    triageLabelIds: ["demo-triage-escalate-authority"],
    jurisdictions: ["Demo Jurisdiction"],
    supportModes: ["email"],
    languages: ["en"],
    costType: "free",
    acceptingNewReferrals: false,
    email: "daniel.demo@example.org",
    verificationStatus: "not_verified",
    dataSource: "Manually entered demo record",
  },
  {
    ...demoBase("demo-advocate-priya-chandran", "draft"),
    fullName: "Priya Chandran",
    professionalType: "legal_advocate",
    organisation: "Coastal Legal Aid Clinic (Demo)",
    jobTitle: "Legal Advocate",
    shortIntroduction: "Fictional demo legal advocate whose verification review is in progress.",
    areasOfSupport: ["Legal information", "Complaint drafting support"],
    incidentTypeIds: ["demo-incident-workplace-discrimination"],
    jurisdictions: ["Demo Jurisdiction"],
    supportModes: ["in_person", "video"],
    languages: ["en"],
    costType: "free",
    acceptingNewReferrals: true,
    verificationStatus: "pending_review",
    dataSource: "Manually entered demo record",
  },
  {
    ...demoBase("demo-advocate-sam-whitfield", "draft"),
    fullName: "Sam Whitfield",
    professionalType: "support_worker",
    shortIntroduction: "Fictional demo support worker profile, still in draft.",
    areasOfSupport: [],
    supportModes: [],
    languages: ["en"],
    costType: "unknown",
    acceptingNewReferrals: false,
    verificationStatus: "verified",
    dataSource: "Manually entered demo record",
  },
];
export const seedSupportProfessionals = seedSupportProfessionalsRaw.map((r) => supportProfessionalSchema.parse(r));

const seedReportingDestinationsRaw = [
  {
    ...demoBase("demo-destination-local-police-non-emergency", "published"),
    name: "Local Police Non-Emergency Line (Demo)",
    agencyType: "Law enforcement",
    description: "Fictional demo entry standing in for a real non-emergency reporting line.",
    jurisdiction: "Demo Jurisdiction",
    incidentTypeIds: ["demo-incident-hate-speech"],
    phone: "0000 000 020",
    reportingInstructions: "Demo instructions — replace with a verified real destination before publishing.",
  },
  {
    ...demoBase("demo-destination-workplace-ombudsperson", "draft"),
    name: "Workplace Ombudsperson Office (Demo)",
    agencyType: "Workplace regulator",
    description: "Fictional demo entry for a workplace complaints office.",
    jurisdiction: "Demo Jurisdiction",
    incidentTypeIds: ["demo-incident-workplace-discrimination"],
    website: "https://example.org/ombudsperson-demo",
  },
];
export const seedReportingDestinations = seedReportingDestinationsRaw.map((r) =>
  reportingDestinationSchema.parse(r)
);

const seedMatchingRulesRaw = [
  {
    ...demoBase("demo-rule-online-harassment-support", "published"),
    name: "Online harassment → community support (demo)",
    incidentTypeId: "demo-incident-online-harassment",
    jurisdictions: ["Demo Jurisdiction"],
    urgencyLevels: ["moderate", "high"],
    triageLabelIds: ["demo-triage-needs-follow-up"],
    microcardIds: ["demo-microcard-what-counts-as-racial-harassment"],
    supportOrganisationIds: ["demo-org-harborlight-community-support"],
    supportProfessionalIds: ["demo-advocate-amina-farouk"],
    priority: 1,
    required: false,
    active: true,
    internalMatchReason: "Demo rule illustrating how a matching rule connects incident context to content.",
  },
  {
    ...demoBase("demo-rule-workplace-discrimination-legal", "draft"),
    name: "Workplace discrimination → legal aid (demo)",
    incidentTypeId: "demo-incident-workplace-discrimination",
    jurisdictions: ["Demo Jurisdiction"],
    urgencyLevels: ["high", "critical"],
    triageLabelIds: ["demo-triage-escalate-authority"],
    legislationIds: ["demo-doc-discrimination-act-guide"],
    supportOrganisationIds: ["demo-org-coastal-legal-aid-clinic"],
    supportProfessionalIds: ["demo-advocate-priya-chandran"],
    reportingDestinationIds: ["demo-destination-workplace-ombudsperson"],
    priority: 2,
    required: false,
    active: false,
    internalMatchReason: "Draft demo rule, not yet active.",
  },
];
export const seedMatchingRules = seedMatchingRulesRaw.map((r) => matchingRuleSchema.parse(r));

interface SeedEntity {
  entityType: AuditEvent["entityType"];
  id: string;
  status: AuditEvent["nextStatus"];
  summary: string;
}

function seedEntities(): SeedEntity[] {
  return [
    ...seedDocuments.map((d) => ({ entityType: "document" as const, id: d.id, status: d.status, summary: `Seeded demo document "${d.title}"` })),
    ...seedMicrocards.map((d) => ({ entityType: "microcard" as const, id: d.id, status: d.status, summary: `Seeded demo microcard "${d.title}"` })),
    ...seedRightsContent.map((d) => ({ entityType: "rights_content" as const, id: d.id, status: d.status, summary: `Seeded demo rights content "${d.title}"` })),
    ...seedSupportOrganisations.map((d) => ({ entityType: "support_organisation" as const, id: d.id, status: d.status, summary: `Seeded demo support organisation "${d.name}"` })),
    ...seedSupportProfessionals.map((d) => ({ entityType: "support_professional" as const, id: d.id, status: d.status, summary: `Seeded demo profile "${d.fullName}" (${d.verificationStatus})` })),
    ...seedReportingDestinations.map((d) => ({ entityType: "reporting_destination" as const, id: d.id, status: d.status, summary: `Seeded demo reporting destination "${d.name}"` })),
  ];
}

/** Deterministic audit trail describing the seed operation itself. */
export function buildSeedAuditEvents(seededAt: string): AuditEvent[] {
  const entityEvents = seedEntities().map((entity) =>
    createAuditEvent({
      entityType: entity.entityType,
      entityId: entity.id,
      action: "demo_data_seeded",
      actor: LOCAL_ADMIN_ACTOR,
      nextStatus: entity.status,
      summary: entity.summary,
      isDemo: true,
    })
  );

  const summaryEvent = createAuditEvent({
    entityType: "app_settings",
    entityId: "app-settings",
    action: "demo_data_seeded",
    actor: LOCAL_ADMIN_ACTOR,
    summary: `Local demo dataset seeded (${entityEvents.length} demo records).`,
    isDemo: true,
  });

  return [...entityEvents, summaryEvent].map((event) => ({ ...event, timestamp: seededAt }));
}
