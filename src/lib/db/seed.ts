import { createAuditEvent, type AuditEvent } from "@/lib/models/audit-event";
import { LOCAL_ADMIN_ACTOR } from "@/lib/models/base";
import { documentChunkSchema, documentSchema, type DocumentChunk, type DocumentRecord } from "@/lib/models/document";
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

/**
 * Incident type ids are referenced from seedDocuments/seedMicrocards/
 * seedRightsContent/seedSupportOrganisations/seedSupportProfessionals/
 * seedReportingDestinations/seedMatchingRules below — the first three
 * records keep their original ids and referenced status on purpose so
 * existing Phase 1/2 seed relationships keep working. `demo-incident-
 * domestic-violence` was already unreferenced and stays that way so it can
 * demonstrate an unreferenced-draft delete.
 */
const seedIncidentTypesRaw = [
  {
    ...demoBase("demo-incident-online-harassment", "published"),
    name: "Online harassment",
    description: "Repeated unwanted contact, threats, or abuse through digital platforms.",
    category: "Digital safety",
    machineKey: "online_harassment",
    displayOrder: 0,
    defaultUrgency: "high",
    adminGuidance: "Use for incidents primarily conducted through messaging apps, social media, or other digital channels.",
    relatedResourceCategoryIds: ["demo-category-legal-rights"],
  },
  {
    ...demoBase("demo-incident-workplace-discrimination", "published"),
    name: "Workplace discrimination",
    description: "Unequal or unfair treatment connected to race, ethnicity, or background.",
    category: "Workplace",
    machineKey: "workplace_discrimination",
    displayOrder: 1,
    defaultUrgency: "medium",
    relatedResourceCategoryIds: ["demo-category-legal-rights", "demo-category-emotional-support"],
  },
  {
    ...demoBase("demo-incident-hate-speech", "published"),
    name: "Hate speech incident",
    description: "Public or targeted speech that vilifies a person or group.",
    category: "Community",
    machineKey: "hate_speech",
    displayOrder: 2,
    defaultUrgency: "high",
  },
  {
    ...demoBase("demo-incident-domestic-violence", "draft"),
    name: "Domestic and family violence",
    description: "Placeholder demo category — content review still in progress.",
    category: "Home and family",
    machineKey: "domestic_family_violence",
    displayOrder: 3,
    defaultUrgency: "critical",
  },
  {
    ...demoBase("demo-incident-online-abuse", "ready_for_review"),
    name: "Online abuse",
    description: "Sustained abusive contact or content targeting one person online.",
    machineKey: "online_abuse",
    displayOrder: 4,
    defaultUrgency: "medium",
  },
  {
    ...demoBase("demo-incident-housing-crisis", "needs_update"),
    name: "Housing crisis",
    description: "Demo category flagged for a wording review after a policy update.",
    machineKey: "housing_crisis",
    displayOrder: 5,
    defaultUrgency: "high",
  },
  {
    ...demoBase("demo-incident-physical-assault-legacy", "archived"),
    name: "Physical assault (legacy)",
    description: "Superseded demo classification, kept only for local historical reference.",
    machineKey: "physical_assault_legacy",
    displayOrder: 6,
    defaultUrgency: "critical",
  },
];
export const seedIncidentTypes = seedIncidentTypesRaw.map((r) => incidentTypeSchema.parse(r));

/**
 * `demo-triage-needs-follow-up` and `demo-triage-escalate-authority` are
 * referenced by seedMatchingRules and seedSupportProfessionals below and
 * keep their ids; `demo-triage-information-only` was already unreferenced
 * and its status is changed to draft here to demonstrate the unreferenced-
 * draft delete path.
 */
const seedTriageLabelsRaw = [
  {
    ...demoBase("demo-triage-urgent-safety-risk", "published"),
    name: "Urgent safety risk",
    description: "Immediate risk to physical safety.",
    urgencyLevel: "critical",
    machineKey: "immediate_danger",
    labelGroup: "safety",
    displayOrder: 0,
  },
  {
    ...demoBase("demo-triage-escalate-authority", "published"),
    name: "Escalate to authority",
    description: "Should be routed toward a formal reporting destination.",
    urgencyLevel: "high",
    machineKey: "escalate_to_authority",
    labelGroup: "urgency",
    displayOrder: 1,
  },
  {
    ...demoBase("demo-triage-needs-follow-up", "published"),
    name: "Needs follow-up",
    description: "Not urgent, but should not be left without a next step.",
    urgencyLevel: "moderate",
    machineKey: "needs_follow_up",
    labelGroup: "support_need",
    displayOrder: 2,
  },
  {
    ...demoBase("demo-triage-information-only", "draft"),
    name: "Information only",
    description: "Person is seeking information rather than immediate support.",
    urgencyLevel: "low",
    machineKey: "information_only",
    labelGroup: "other",
    displayOrder: 3,
  },
  {
    ...demoBase("demo-triage-religious-bias", "published"),
    name: "Religious bias indicator",
    description: "Contextual indicator only — never a confirmed hate crime or legal finding.",
    urgencyLevel: "moderate",
    machineKey: "religious_bias_indicator",
    labelGroup: "bias_indicator",
    displayOrder: 4,
  },
  {
    ...demoBase("demo-triage-racial-discrimination-indicator", "needs_update"),
    name: "Racial discrimination indicator",
    description: "Contextual indicator only — never a confirmed hate crime or legal finding.",
    urgencyLevel: "moderate",
    machineKey: "racial_discrimination_indicator",
    labelGroup: "bias_indicator",
    displayOrder: 5,
  },
  {
    ...demoBase("demo-triage-accessibility-support", "ready_for_review"),
    name: "Needs accessibility support",
    description: "Person may need an accessible format, interpreter, or support person.",
    urgencyLevel: "low",
    machineKey: "accessibility_support_needed",
    labelGroup: "accessibility_need",
    displayOrder: 6,
  },
  {
    ...demoBase("demo-triage-legacy-high-priority", "archived"),
    name: "Legacy high priority (superseded)",
    description: "Superseded demo label, kept only for local historical reference.",
    urgencyLevel: "high",
    machineKey: "legacy_high_priority",
    labelGroup: "urgency",
    displayOrder: 7,
  },
];
export const seedTriageLabels = seedTriageLabelsRaw.map((r) => triageLabelSchema.parse(r));

/**
 * `demo-category-legal-rights` and `demo-category-emotional-support` keep
 * their original ids and become referenced (via the new
 * `incidentTypes.relatedResourceCategoryIds` field) so the usage viewer has
 * something real to show; `demo-category-reporting-pathways` was already
 * unreferenced and demonstrates an unreferenced-draft delete.
 */
const seedResourceCategoriesRaw = [
  {
    ...demoBase("demo-category-legal-rights", "published"),
    name: "Legal rights",
    description: "Content explaining rights in plain language.",
    machineKey: "legal",
    displayOrder: 0,
    iconKey: "legal",
    accentToken: "primary",
  },
  {
    ...demoBase("demo-category-emotional-support", "published"),
    name: "Emotional support",
    description: "Wellbeing and counselling-oriented resources.",
    machineKey: "mental_health",
    displayOrder: 1,
    iconKey: "mental_health",
    accentToken: "success",
  },
  {
    ...demoBase("demo-category-reporting-pathways", "draft"),
    name: "Reporting pathways",
    description: "Draft category describing how and where to report an incident.",
    machineKey: "reporting_pathways",
    displayOrder: 2,
    iconKey: "general",
    accentToken: "neutral",
  },
  {
    ...demoBase("demo-category-safety", "published"),
    name: "Safety",
    description: "Immediate personal safety information and planning.",
    machineKey: "safety",
    displayOrder: 3,
    iconKey: "safety",
    accentToken: "destructive",
  },
  {
    ...demoBase("demo-category-housing", "ready_for_review"),
    name: "Housing",
    description: "Housing crisis and emergency accommodation resources.",
    machineKey: "housing",
    displayOrder: 4,
    iconKey: "housing",
    accentToken: "warning",
  },
  {
    ...demoBase("demo-category-financial", "needs_update"),
    name: "Financial",
    description: "Financial hardship and support resources, flagged for a review.",
    machineKey: "financial",
    displayOrder: 5,
    iconKey: "financial",
    accentToken: "neutral",
  },
  {
    ...demoBase("demo-category-workplace-legacy", "archived"),
    name: "Workplace (legacy)",
    description: "Superseded demo category, kept only for local historical reference.",
    machineKey: "workplace_legacy",
    displayOrder: 6,
    iconKey: "workplace",
    accentToken: "neutral",
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
    jurisdiction: "commonwealth",
    language: "en",
    actNumber: "DEMO-1975-52",
    documentVersionLabel: "1.0",
    sourceUrl: "https://example.org/legislation/demo-discrimination-act",
    effectiveDate: "2025-01-01",
    lastUpdatedDate: "2026-05-01",
    nextReviewDate: "2027-01-01",
    licenseStatus: "government_open_license",
    relevantSections: ["Part II — Prohibition of racial discrimination", "Section 18C — Offensive behaviour"],
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
    jurisdiction: "nsw",
    language: "en",
    licenseStatus: "restricted_internal_use",
    relevantSections: ["Section 4 — Reporting a complaint"],
    topic: "Workplace conduct",
    tags: ["policy", "workplace"],
    incidentTypeIds: ["demo-incident-workplace-discrimination"],
    priority: "medium",
    nextReviewDate: "2026-12-01",
    aiUsagePermission: false,
    legalReviewComplete: false,
    reviewNotes: "Awaiting legal/governance sign-off before this can be published — extraction already succeeded.",
    processingStatus: "ready_for_ai_processing",
    extractionStatus: "extracted",
    localPreviewStatus: "available",
    extractedTextPreview:
      "This demo excerpt stands in for a workplace harassment policy template, describing how to raise and escalate a complaint.",
  },
  {
    ...demoBase("demo-doc-community-reporting-guidelines", "draft"),
    title: "Draft Community Reporting Guidelines (Demo)",
    file: { fileName: "community-reporting-guidelines-demo.pdf", fileSizeBytes: 88_004, fileType: "application/pdf" },
    sourceType: "guideline",
    sourceCategory: "Community guidance",
    jurisdiction: "vic",
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
  {
    ...demoBase("demo-doc-workplace-safety-guidance", "published"),
    title: "Workplace Health and Safety Guidance Summary (Demo)",
    file: { fileName: "workplace-health-safety-guidance-demo.pdf", fileSizeBytes: 156_204, fileType: "application/pdf", pageCount: 4 },
    sourceType: "guideline",
    sourceCategory: "Regulatory guidance",
    authorityOrPublisher: "Demo Workplace Standards Office",
    jurisdiction: "qld",
    language: "en",
    licenseStatus: "government_open_license",
    relevantSections: ["Section 2 — Employer duties"],
    topic: "Workplace safety",
    tags: ["policy", "safety"],
    incidentTypeIds: ["demo-incident-workplace-discrimination"],
    priority: "medium",
    nextReviewDate: "2027-03-01",
    aiUsagePermission: false,
    legalReviewComplete: true,
    reviewNotes: "Published for administrative reference; AI usage deliberately not enabled for this source yet.",
    processingStatus: "ready_for_ai_processing",
    extractionStatus: "extracted",
    localPreviewStatus: "available",
    extractedTextPreview: "This demo excerpt describes employer duties under general workplace health and safety guidance.",
  },
  {
    ...demoBase("demo-doc-consumer-notice-overdue", "published"),
    title: "Consumer Protection Notice Summary (Demo)",
    file: { fileName: "consumer-protection-notice-demo.pdf", fileSizeBytes: 97_310, fileType: "application/pdf", pageCount: 2 },
    sourceType: "regulation",
    sourceCategory: "Consumer protection",
    authorityOrPublisher: "Demo Fair Trading Office",
    jurisdiction: "wa",
    language: "en",
    licenseStatus: "government_open_license",
    relevantSections: ["Section 1 — Scope"],
    topic: "Consumer protection",
    tags: ["regulation"],
    incidentTypeIds: [],
    priority: "low",
    // Deliberately in the past relative to SEED_TIMESTAMP (2026-06-01) to demo the "Overdue for review" indicator.
    nextReviewDate: "2026-01-15",
    aiUsagePermission: true,
    legalReviewComplete: true,
    processingStatus: "ready_for_ai_processing",
    extractionStatus: "extracted",
    localPreviewStatus: "available",
    extractedTextPreview: "This demo excerpt stands in for a short consumer protection notice.",
  },
  {
    ...demoBase("demo-doc-superseded-circular", "archived"),
    title: "Superseded Reporting Circular (Demo)",
    file: { fileName: "superseded-reporting-circular-demo.pdf", fileSizeBytes: 61_442, fileType: "application/pdf", pageCount: 2 },
    sourceType: "guideline",
    sourceCategory: "Internal circular",
    authorityOrPublisher: "Demo Workplace Standards Office",
    jurisdiction: "sa",
    language: "en",
    licenseStatus: "restricted_internal_use",
    relevantSections: [],
    topic: "Reporting pathways",
    tags: ["archived"],
    incidentTypeIds: [],
    priority: "low",
    aiUsagePermission: false,
    legalReviewComplete: true,
    reviewNotes: "Superseded by newer guidance; kept only for local historical reference.",
    processingStatus: "ready_for_ai_processing",
    extractionStatus: "extracted",
    localPreviewStatus: "available",
    extractedTextPreview: "This demo excerpt stands in for a since-superseded internal reporting circular.",
  },
];
export const seedDocuments: DocumentRecord[] = seedDocumentsRaw.map((r) => documentSchema.parse(r));

/**
 * Local chunk-preview records for the one seeded document with a fully
 * "extracted" status — gives the local retrieval test tab something
 * deterministic to actually match against.
 */
const seedDocumentChunksRaw = [
  {
    id: "demo-chunk-discrimination-act-1",
    documentId: "demo-doc-discrimination-act-guide",
    pageStart: 1,
    pageEnd: 1,
    chunkIndex: 0,
    text: "Part II of this demo Act prohibits racial discrimination in employment, including hiring, promotion, and workplace conduct. It is unlawful to treat a person unfavourably because of race, colour, descent, or national or ethnic origin.",
    characterCount: 0,
    localOnly: true as const,
    createdAt: SEED_TIMESTAMP,
  },
  {
    id: "demo-chunk-discrimination-act-2",
    documentId: "demo-doc-discrimination-act-guide",
    pageStart: 2,
    pageEnd: 2,
    chunkIndex: 1,
    text: "Section 18C addresses offensive behaviour based on racial hatred, including public acts likely to offend, insult, humiliate, or intimidate a person or group because of race or ethnicity.",
    characterCount: 0,
    localOnly: true as const,
    createdAt: SEED_TIMESTAMP,
  },
  {
    id: "demo-chunk-discrimination-act-3",
    documentId: "demo-doc-discrimination-act-guide",
    pageStart: 3,
    pageEnd: 4,
    chunkIndex: 2,
    text: "This demo section describes access to services and education, explaining that racial discrimination is also prohibited when providing goods, services, and access to educational institutions.",
    characterCount: 0,
    localOnly: true as const,
    createdAt: SEED_TIMESTAMP,
  },
  {
    // This document is "ready_for_review" (not published/AI-eligible), so its
    // chunk only ever surfaces in the local retrieval test's admin-testing
    // scope — exercises the "included for admin testing only" reason.
    id: "demo-chunk-workplace-harassment-policy-1",
    documentId: "demo-doc-workplace-harassment-policy",
    pageStart: 1,
    pageEnd: 1,
    chunkIndex: 0,
    text: "This demo workplace harassment policy explains how to raise a complaint, who to contact, and what support is available while a workplace harassment complaint is reviewed.",
    characterCount: 0,
    localOnly: true as const,
    createdAt: SEED_TIMESTAMP,
  },
].map((chunk) => ({ ...chunk, characterCount: chunk.text.length }));
export const seedDocumentChunks: DocumentChunk[] = seedDocumentChunksRaw.map((r) => documentChunkSchema.parse(r));

/**
 * Covers every status, several card types/jurisdictions/priorities, and the
 * three delete/dependency scenarios exercised by tests: card 3 is a draft
 * that a matching rule references below (blocks hard delete), card 8 is a
 * fully-eligible unreferenced draft (safe to hard-delete), and card 4
 * demonstrates an overdue review date on a published record. "Critical"
 * priority (card 4) is deliberately worded as distribution/attention only —
 * see the wording rule in lib/microcards/eligibility.ts.
 */
const seedMicrocardsRaw = [
  {
    ...demoBase("demo-microcard-know-your-right-to-a-safe-workplace", "published"),
    title: "Know your right to a safe workplace",
    summary: "A short explainer on what a safe workplace legally means (demo content).",
    body: "Demo body copy — a real card would give a short, plain-language explanation with a link to fuller rights content.",
    topic: "Workplace rights",
    tags: ["rights", "workplace"],
    incidentTypeIds: ["demo-incident-workplace-discrimination"],
    cardType: "rights_summary",
    jurisdiction: "nsw",
    priority: "normal",
    displayOrder: 0,
    reviewDueDate: "2027-01-01",
    resourceCategoryId: "demo-category-legal-rights",
    relatedLegislationIds: ["demo-doc-discrimination-act-guide"],
    relatedSupportOrganisationIds: ["demo-org-harborlight-community-support"],
    cta: { type: "start_report" },
    publishedDate: SEED_TIMESTAMP,
  },
  {
    ...demoBase("demo-microcard-what-counts-as-racial-harassment", "published"),
    title: "What counts as racial harassment?",
    summary: "Plain-language examples to help someone recognise racial harassment (demo content).",
    body: "Demo body copy — a real card would give short, plain-language examples of racially harassing behaviour, with a link to fuller rights information.",
    topic: "Understanding harassment",
    tags: ["harassment", "education"],
    incidentTypeIds: ["demo-incident-hate-speech"],
    cardType: "quick_guidance",
    jurisdiction: "commonwealth",
    priority: "high",
    displayOrder: 1,
    // Deliberately within 30 days of SEED_TIMESTAMP (2026-06-01) to demo "Review due soon".
    reviewDueDate: "2026-06-20",
    resourceCategoryId: "demo-category-legal-rights",
    relatedLegislationIds: ["demo-doc-discrimination-act-guide"],
    cta: { type: "view_rights_information", target: "demo-rights-report-anonymously", label: "Learn about your reporting rights" },
    publishedDate: SEED_TIMESTAMP,
  },
  {
    // Draft, and referenced by demo-rule-online-harassment-support below —
    // demonstrates dependency protection blocking an otherwise-eligible draft delete.
    ...demoBase("demo-microcard-document-an-incident-safely", "draft"),
    title: "How to document an incident safely",
    summary: "Draft guidance on keeping a safe, private record of what happened (demo content).",
    topic: "Evidence and documentation",
    tags: ["documentation"],
    incidentTypeIds: [],
    cardType: "evidence_tip",
    // Deliberately distinct from every other card's displayOrder (most of
    // which start at 0) — ties would make reorder-list ordering depend on
    // IndexedDB's primary-key (id) sort rather than the intended order.
    displayOrder: 7,
  },
  {
    ...demoBase("demo-microcard-safety-planning-quick-tip", "published"),
    title: "Quick safety planning tip",
    summary: "A short, practical safety planning idea (demo content).",
    body: "Critical priority here reflects distribution and attention priority only — it is never an emergency determination. If there is immediate danger, contact emergency services.",
    tags: ["safety"],
    incidentTypeIds: [],
    cardType: "safety_tip",
    jurisdiction: "vic",
    priority: "critical",
    displayOrder: 2,
    // Deliberately in the past relative to SEED_TIMESTAMP to demo "Review overdue" on a published record.
    reviewDueDate: "2026-04-15",
    resourceCategoryId: "demo-category-safety",
    cta: { type: "open_internal_route", target: "/emergency", label: "Get emergency help" },
    publishedDate: SEED_TIMESTAMP,
  },
  {
    ...demoBase("demo-microcard-need-support-now", "ready_for_review"),
    title: "Need support right now?",
    summary: "Points to a support service that can help immediately (demo content).",
    body: "Demo body copy — a real card would briefly describe what the linked support service offers before someone reaches out.",
    tags: ["support"],
    incidentTypeIds: [],
    cardType: "support_option",
    jurisdiction: "qld",
    priority: "high",
    displayOrder: 3,
    reviewDueDate: "2026-06-15",
    resourceCategoryId: "demo-category-emotional-support",
    relatedSupportOrganisationIds: ["demo-org-harborlight-community-support"],
    cta: { type: "view_support_service", target: "demo-org-harborlight-community-support", label: "Find support now" },
  },
  {
    ...demoBase("demo-microcard-preparing-for-a-conversation", "needs_update"),
    title: "Preparing for a difficult conversation",
    summary: "Guidance on preparing to talk with someone about what happened (demo content).",
    body: "Demo body copy — a real card would offer a few short, practical points to consider before that conversation.",
    tags: ["preparation"],
    incidentTypeIds: [],
    cardType: "preparation_tip",
    jurisdiction: "nsw",
    priority: "normal",
    displayOrder: 4,
    reviewDueDate: "2027-03-01",
    resourceCategoryId: "demo-category-legal-rights",
    cta: { type: "open_safe_external_link", target: "https://example.org/preparing-for-a-conversation", label: "Read more (demo, external)" },
    publishedDate: SEED_TIMESTAMP,
  },
  {
    ...demoBase("demo-microcard-retired-seasonal-guidance", "archived"),
    title: "Retired seasonal guidance card",
    summary: "Superseded guidance kept only for local historical reference (demo content).",
    body: "Demo body copy — superseded content kept only for local historical reference, not shown to users.",
    tags: ["archived"],
    incidentTypeIds: [],
    cardType: "other",
    jurisdiction: "sa",
    priority: "low",
    displayOrder: 5,
    reviewDueDate: "2026-01-01",
    resourceCategoryId: "demo-category-safety",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    // Draft, fully eligible (every required field set) and unreferenced —
    // demonstrates a draft that CAN be safely hard-deleted, in contrast with
    // demo-microcard-document-an-incident-safely above.
    ...demoBase("demo-microcard-next-steps-after-reporting", "draft"),
    title: "Next steps after making a report",
    summary: "What typically happens after a report is made (demo content).",
    body: "Demo body copy describing typical next steps after a report is made.",
    tags: ["next-steps"],
    incidentTypeIds: [],
    cardType: "next_step",
    jurisdiction: "wa",
    priority: "normal",
    displayOrder: 6,
    reviewDueDate: "2027-06-01",
    // Deliberately references a draft-status resource category to demonstrate that
    // eligibility does not retroactively block on a related record's own status —
    // only a true dangling (nonexistent) reference blocks. See lib/microcards/eligibility.ts.
    resourceCategoryId: "demo-category-reporting-pathways",
    cta: { type: "start_report" },
  },
  {
    // Phase 6.1: a genuinely neutral orientation card — none of the other
    // published microcards fit "no specific incident assumed yet", which the
    // General Assistant topic's matching rule needs. See
    // demo-rule-general-assistant-support-navigation below.
    ...demoBase("demo-microcard-general-next-steps-guide", "published"),
    title: "Not sure where to start?",
    summary: "A few safe first steps if you're not sure what kind of help you need yet (demo content).",
    body: "Demo body copy — a real card would explain that it's okay not to have all the details yet, and offer a few safe, low-commitment first steps (e.g. exploring support options, saving notes privately, or learning about rights) without assuming any specific incident has occurred.",
    tags: ["orientation", "general"],
    incidentTypeIds: [],
    cardType: "next_step",
    jurisdiction: "commonwealth",
    priority: "normal",
    displayOrder: 7,
    reviewDueDate: "2027-04-01",
    resourceCategoryId: "demo-category-emotional-support",
    cta: { type: "none" },
    publishedDate: SEED_TIMESTAMP,
  },
];
export const seedMicrocards = seedMicrocardsRaw.map((r) => microcardSchema.parse(r));

/**
 * Covers every status, both legal-claim and informational content types, and
 * the legal-source-complete-vs-incomplete contrast (item 1 is fully governed;
 * item 2 is a legal-claim type still missing its source and disclaimer).
 * Item 2 is also referenced by a matching rule below, so it demonstrates
 * dependency protection *and* incomplete-eligibility blockers together.
 */
const seedRightsContentRaw = [
  {
    ...demoBase("demo-rights-report-anonymously", "published"),
    title: "Your right to report anonymously",
    summary: "An overview of anonymous reporting options (demo content, not legal advice).",
    body: "Demo body copy — a real record would explain, in plain language, what anonymous reporting options exist and what to expect from each.",
    jurisdiction: "commonwealth",
    relatedLegislationIds: ["demo-doc-discrimination-act-guide"],
    incidentTypeIds: ["demo-incident-online-harassment"],
    tags: ["reporting", "privacy"],
    contentType: "reporting_rights",
    resourceCategoryIds: ["demo-category-legal-rights"],
    priority: "high",
    reviewDueDate: "2027-01-01",
    effectiveFromDate: "2025-01-01",
    publishedDate: SEED_TIMESTAMP,
    publicDisclaimer: "This information is general and educational only — it is not personalised legal advice.",
  },
  {
    // Legal-claim content type, but still missing a governed legislation
    // source and a disclaimer — demonstrates the "incomplete legal source"
    // publish blocker. Also referenced by demo-rule-online-harassment-support
    // below, so it also demonstrates dependency protection on a draft.
    ...demoBase("demo-rights-reasonable-adjustments", "draft"),
    title: "Understanding reasonable adjustments",
    summary: "Draft explainer on reasonable adjustments at work (demo content, not legal advice).",
    body: "Demo body copy — a real record would explain what a reasonable adjustment at work can look like and how to ask for one.",
    jurisdiction: "nsw",
    relatedLegislationIds: [],
    incidentTypeIds: ["demo-incident-workplace-discrimination"],
    tags: ["workplace"],
    contentType: "workplace_rights",
    resourceCategoryIds: ["demo-category-legal-rights"],
    priority: "normal",
  },
  {
    ...demoBase("demo-rights-privacy-and-your-information", "published"),
    title: "Privacy and your personal information",
    summary: "An overview of privacy protections that may apply (demo content, not legal advice).",
    body: "Demo body copy — a real record would explain, in plain language, how personal information is generally protected and what options exist if it is mishandled.",
    jurisdiction: "vic",
    relatedLegislationIds: ["demo-doc-discrimination-act-guide"],
    incidentTypeIds: [],
    tags: ["privacy"],
    contentType: "privacy_rights",
    resourceCategoryIds: ["demo-category-legal-rights"],
    priority: "normal",
    reviewDueDate: "2026-06-18",
    publishedDate: SEED_TIMESTAMP,
    publicDisclaimer: "This information is general and educational only — it is not personalised legal advice.",
  },
  {
    ...demoBase("demo-rights-emotional-support-options", "published"),
    title: "Emotional support options explained",
    summary: "An overview of the kinds of emotional support available (demo content).",
    body: "Demo body copy — a real record would describe, in plain language, the kinds of emotional support available and how to access them.",
    jurisdiction: "qld",
    relatedLegislationIds: [],
    incidentTypeIds: [],
    tags: ["support"],
    contentType: "support_access",
    resourceCategoryIds: ["demo-category-emotional-support"],
    relatedSupportOrganisationIds: ["demo-org-harborlight-community-support"],
    priority: "normal",
    reviewDueDate: "2027-02-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    ...demoBase("demo-rights-workplace-discrimination-overview", "needs_update"),
    title: "Workplace discrimination: an overview",
    summary: "An overview of workplace discrimination protections (demo content, not legal advice).",
    body: "Demo body copy — a real record would explain, in plain language, what workplace discrimination protections generally cover.",
    jurisdiction: "commonwealth",
    relatedLegislationIds: ["demo-doc-discrimination-act-guide"],
    incidentTypeIds: ["demo-incident-workplace-discrimination"],
    tags: ["workplace", "discrimination"],
    contentType: "discrimination_rights",
    resourceCategoryIds: ["demo-category-legal-rights"],
    priority: "high",
    // Deliberately in the past relative to SEED_TIMESTAMP to demo "Review overdue" alongside "needs_update".
    reviewDueDate: "2026-04-01",
    publishedDate: SEED_TIMESTAMP,
    publicDisclaimer: "This information is general and educational only — it is not personalised legal advice.",
  },
  {
    // Deliberately still missing a resource category, so this record shows a
    // real "Blocking issues" entry in the Review Queue and on its own detail
    // page, despite otherwise being ready for review.
    ...demoBase("demo-rights-evidence-and-documentation-basics", "ready_for_review"),
    title: "Evidence and documentation basics",
    summary: "Non-legal, practical information about keeping records (demo content).",
    body: "Demo body copy — a real record would give practical, non-legal tips on keeping a safe, private record of what happened.",
    jurisdiction: "nsw",
    relatedLegislationIds: [],
    incidentTypeIds: [],
    tags: ["evidence"],
    contentType: "evidence_information",
    resourceCategoryIds: [],
    priority: "normal",
    reviewDueDate: "2026-06-10",
  },
  {
    ...demoBase("demo-rights-archived-superseded-overview", "archived"),
    title: "Superseded process overview (archived)",
    summary: "Kept only for local historical reference (demo content).",
    body: "Demo body copy — superseded content kept only for local historical reference, not shown to users.",
    jurisdiction: "sa",
    relatedLegislationIds: [],
    incidentTypeIds: [],
    tags: ["archived"],
    contentType: "process_explanation",
    resourceCategoryIds: ["demo-category-workplace-legacy"],
    priority: "low",
    reviewDueDate: "2025-12-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    // Phase 6.1: general community/language service-access information for
    // the Migrant Challenges topic — informational only (contentType
    // "support_access", so no governed legislation source is required), and
    // deliberately never framed as personalised immigration advice. See
    // demo-rule-migrant-challenges-community-support below.
    ...demoBase("demo-rights-community-and-language-support", "published"),
    title: "Community and language support services",
    summary: "General information about interpreter services and community organisations that can help (demo content, not immigration advice).",
    body: "Demo body copy — a real record would explain, in plain language, that free interpreter services and community organisations exist to help someone understand their options and access services, and that this is general information only, not personalised immigration or legal advice.",
    jurisdiction: "commonwealth",
    relatedLegislationIds: [],
    incidentTypeIds: [],
    tags: ["community", "language-support", "migrant"],
    contentType: "support_access",
    resourceCategoryIds: ["demo-category-emotional-support"],
    relatedSupportOrganisationIds: ["demo-org-harborlight-community-support"],
    priority: "normal",
    reviewDueDate: "2027-05-01",
    publishedDate: SEED_TIMESTAMP,
    publicDisclaimer: "This is general information only, not personalised immigration or legal advice.",
  },
];
export const seedRightsContent = seedRightsContentRaw.map((r) => rightsContentSchema.parse(r));

/**
 * Covers every content status, several organisation types, single/multi/
 * Australia-wide jurisdiction settings, verified and not-verified published
 * organisations, and the same delete/dependency contrast established for
 * Microcards/Rights Content: demo-org-northside-cultural-wellbeing is an
 * incomplete draft referenced by a matching rule (blocks hard delete);
 * demo-org-fully-eligible-unreferenced-draft is a complete, unreferenced
 * draft (safe to hard-delete).
 */
const seedSupportOrganisationsRaw = [
  {
    ...demoBase("demo-org-harborlight-community-support", "published"),
    name: "Harborlight Community Support (Demo)",
    organisationType: "community_support",
    shortDescription: "Fictional demo organisation offering general community support.",
    fullDescription: "Demo body copy — a real record would describe the full range of community support services offered, who they are for, and how to get started.",
    servicesOffered: ["Counselling referral", "Peer support groups"],
    resourceCategoryIds: ["demo-category-emotional-support"],
    incidentTypeIds: ["demo-incident-online-harassment", "demo-incident-hate-speech"],
    jurisdictions: ["nsw", "vic"],
    languages: ["en"],
    serviceDeliveryModes: ["phone", "video", "in_person"],
    phone: "0000 000 001",
    email: "contact@example.org",
    website: "https://example.org/harborlight-demo",
    bookingUrl: "https://example.org/book/harborlight-demo",
    address: "1 Demo Street, Sample City",
    verificationStatus: "verified",
    verificationNotes: "Demo note — a real record would summarise the local evidence an administrator reviewed.",
    verifiedDate: "2026-05-01",
    verificationExpiryDate: "2027-05-01",
    reviewDueDate: "2027-01-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    // Incomplete draft, and referenced by demo-rule-online-harassment-support
    // below — demonstrates dependency protection blocking an otherwise-
    // eligible draft delete, alongside its blockers.
    ...demoBase("demo-org-northside-cultural-wellbeing", "draft"),
    name: "Northside Cultural Wellbeing Centre (Demo)",
    shortDescription: "Fictional demo organisation — profile still being drafted.",
    servicesOffered: ["Cultural support"],
    incidentTypeIds: ["demo-incident-hate-speech"],
    email: "hello@example.org",
    verificationStatus: "not_verified",
  },
  {
    ...demoBase("demo-org-coastal-legal-aid-clinic", "published"),
    name: "Coastal Legal Aid Clinic (Demo)",
    organisationType: "legal_service",
    shortDescription: "Fictional demo legal aid clinic used to exercise verified-organisation display.",
    fullDescription: "Demo body copy — a real record would describe eligibility for free legal advice and how a discrimination complaint can be raised.",
    servicesOffered: ["Free legal advice", "Discrimination complaints support"],
    resourceCategoryIds: ["demo-category-legal-rights"],
    incidentTypeIds: ["demo-incident-workplace-discrimination"],
    jurisdictions: ["nsw"],
    languages: ["en"],
    serviceDeliveryModes: ["phone", "in_person"],
    phone: "0000 000 002",
    website: "https://example.org/coastal-legal-aid-demo",
    verificationStatus: "verified",
    verifiedDate: "2026-04-01",
    verificationExpiryDate: "2027-04-01",
    reviewDueDate: "2027-02-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    ...demoBase("demo-org-riverside-crisis-line", "published"),
    name: "Riverside Crisis Line (Demo)",
    organisationType: "crisis_support",
    shortDescription: "Fictional demo crisis line, deliberately published while unverified.",
    fullDescription: "Demo body copy — a real record would describe what the crisis line offers and how quickly someone can expect to be connected.",
    servicesOffered: ["Crisis phone line"],
    resourceCategoryIds: ["demo-category-safety"],
    incidentTypeIds: [],
    australiaWide: true,
    languages: ["en"],
    serviceDeliveryModes: ["phone"],
    phone: "0000 000 003",
    email: "crisisline.demo@example.org",
    verificationStatus: "not_verified",
    // Deliberately within 30 days of SEED_TIMESTAMP (2026-06-01) to demo "Review due soon".
    reviewDueDate: "2026-06-18",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    ...demoBase("demo-org-westside-housing-support", "ready_for_review"),
    name: "Westside Housing Support Service (Demo)",
    organisationType: "housing_service",
    shortDescription: "Fictional demo housing support service.",
    fullDescription: "Demo body copy — a real record would describe housing support services, eligibility, and how to make a first appointment.",
    servicesOffered: ["Tenancy advice", "Emergency housing referral"],
    resourceCategoryIds: ["demo-category-housing"],
    incidentTypeIds: ["demo-incident-housing-crisis"],
    jurisdictions: ["qld"],
    languages: ["en"],
    serviceDeliveryModes: ["phone", "in_person"],
    phone: "0000 000 004",
    verificationStatus: "verification_pending",
    reviewDueDate: "2027-03-01",
  },
  {
    // Deliberately in the past relative to SEED_TIMESTAMP to demo "Review overdue" alongside "needs_update".
    ...demoBase("demo-org-eastgate-financial-counselling", "needs_update"),
    name: "Eastgate Financial Counselling (Demo)",
    organisationType: "financial_support",
    shortDescription: "Fictional demo financial counselling service.",
    fullDescription: "Demo body copy — a real record would describe free financial counselling services and how to book an appointment.",
    servicesOffered: ["Financial counselling", "Debt support"],
    resourceCategoryIds: ["demo-category-financial"],
    incidentTypeIds: [],
    jurisdictions: ["wa"],
    languages: ["en"],
    serviceDeliveryModes: ["phone", "video"],
    email: "financial.demo@example.org",
    website: "https://example.org/eastgate-financial-demo",
    verificationStatus: "verified",
    verifiedDate: "2025-06-01",
    verificationExpiryDate: "2026-06-01",
    reviewDueDate: "2026-03-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    ...demoBase("demo-org-old-regional-outreach", "archived"),
    name: "Old Regional Outreach Program (Demo)",
    organisationType: "advocacy_service",
    shortDescription: "Superseded demo organisation, kept only for local historical reference.",
    fullDescription: "Demo body copy — superseded content kept only for local historical reference, not shown to users.",
    servicesOffered: ["Regional advocacy (discontinued)"],
    resourceCategoryIds: ["demo-category-legal-rights"],
    incidentTypeIds: [],
    jurisdictions: ["sa"],
    languages: ["en"],
    phone: "0000 000 005",
    verificationStatus: "verification_expired",
    verifiedDate: "2024-01-01",
    verificationExpiryDate: "2025-01-01",
    reviewDueDate: "2025-06-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    // Draft, fully eligible (every required field set) and unreferenced —
    // demonstrates a draft that CAN be safely hard-deleted, in contrast with
    // demo-org-northside-cultural-wellbeing above.
    ...demoBase("demo-org-fully-eligible-unreferenced-draft", "draft"),
    name: "Fully Eligible Draft Organisation (Demo)",
    organisationType: "other",
    shortDescription: "Fictional demo organisation with every required field already complete.",
    fullDescription: "Demo body copy — every field required for Ready for review / Publish has already been filled in on this draft.",
    resourceCategoryIds: ["demo-category-safety"],
    jurisdictions: ["nt"],
    languages: ["en"],
    phone: "0000 000 006",
    // Demonstrates that a local verification rejection never blocks the
    // publishing workflow — verification and publication are independent axes.
    verificationStatus: "verification_rejected",
    verificationNotes: "Demo note — local review did not confirm the details provided.",
    reviewDueDate: "2027-06-01",
  },
];
export const seedSupportOrganisations = seedSupportOrganisationsRaw.map((r) => supportOrganisationSchema.parse(r));

/**
 * Covers every content status, advocate and counsellor types, both
 * independent and organisation-linked professionals, and all five
 * verification statuses. demo-advocate-priya-chandran is an incomplete
 * draft referenced by a matching rule (blocks hard delete);
 * demo-counsellor-fully-eligible-draft is a complete, unreferenced draft
 * (safe to hard-delete) — the same contrast established for Support
 * Organisations above.
 */
const seedSupportProfessionalsRaw = [
  {
    ...demoBase("demo-advocate-amina-farouk", "published"),
    fullName: "Amina Farouk",
    displayName: "Amina F.",
    professionalType: "counsellor",
    organisationId: "demo-org-harborlight-community-support",
    jobTitle: "Senior Counsellor",
    shortIntroduction: "Fictional demo counsellor used to exercise a verified, published profile.",
    fullBiography: "Demo body copy — a real profile would describe this counsellor's background, approach, and the communities they typically support.",
    areasOfSupport: ["Trauma-informed counselling"],
    resourceCategoryIds: ["demo-category-emotional-support"],
    incidentTypeIds: ["demo-incident-online-harassment"],
    triageLabelIds: ["demo-triage-needs-follow-up"],
    specialisations: ["Racial trauma"],
    communitiesSupported: ["Multicultural communities"],
    ageGroupsSupported: ["Adults"],
    jurisdictions: ["nsw", "vic"],
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
    verificationNotes: "Demo note — a real record would summarise the local evidence an administrator reviewed.",
    verifiedDate: "2026-05-01",
    verificationExpiryDate: "2027-05-01",
    credentials: ["Demo Counselling Registration #DEMO-001"],
    dataSource: "Manually entered demo record",
    lastReviewedDate: "2026-05-15",
    nextReviewDate: "2027-01-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    ...demoBase("demo-advocate-daniel-osei", "published"),
    fullName: "Daniel Osei",
    professionalType: "advocate",
    jobTitle: "Community Advocate",
    shortIntroduction:
      "Fictional demo advocate — deliberately published while unverified to exercise the 'Not verified' warning.",
    fullBiography: "Demo body copy — a real profile would describe this advocate's independent practice and how they typically support someone making a report.",
    areasOfSupport: ["Incident reporting support"],
    specialisations: ["Report preparation"],
    incidentTypeIds: ["demo-incident-hate-speech"],
    triageLabelIds: ["demo-triage-escalate-authority"],
    jurisdictions: ["nsw"],
    supportModes: ["email"],
    languages: ["en"],
    costType: "free",
    acceptingNewReferrals: false,
    email: "daniel.demo@example.org",
    verificationStatus: "not_verified",
    dataSource: "Manually entered demo record",
    nextReviewDate: "2027-02-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    // Draft, and referenced by demo-rule-workplace-discrimination-legal
    // below — demonstrates dependency protection blocking an otherwise-
    // eligible draft delete.
    ...demoBase("demo-advocate-priya-chandran", "draft"),
    fullName: "Priya Chandran",
    professionalType: "legal_advocate",
    organisationId: "demo-org-coastal-legal-aid-clinic",
    jobTitle: "Legal Advocate",
    shortIntroduction: "Fictional demo legal advocate whose verification review is in progress.",
    areasOfSupport: ["Legal information", "Complaint drafting support"],
    incidentTypeIds: ["demo-incident-workplace-discrimination"],
    jurisdictions: ["nsw"],
    supportModes: ["in_person", "video"],
    languages: ["en"],
    costType: "free",
    acceptingNewReferrals: true,
    verificationStatus: "verification_pending",
    dataSource: "Manually entered demo record",
  },
  {
    // Draft, minimal/incomplete and unreferenced — demonstrates the
    // Ready-for-review blockers list on a genuinely unfinished profile.
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
  {
    ...demoBase("demo-counsellor-jordan-blake", "published"),
    fullName: "Jordan Blake",
    professionalType: "counsellor",
    shortIntroduction: "Fictional demo independent counsellor whose verification has since expired.",
    fullBiography: "Demo body copy — a real profile would describe this counsellor's independent practice and languages spoken.",
    profilePhoto: { fileName: "jordan-blake-demo.jpg", fileSizeBytes: 182_400, fileType: "image/jpeg" },
    areasOfSupport: ["Grief and loss counselling"],
    specialisations: ["Bilingual counselling"],
    incidentTypeIds: [],
    jurisdictions: ["vic"],
    supportModes: ["video", "chat"],
    languages: ["en", "ar"],
    costType: "sliding_scale",
    acceptingNewReferrals: true,
    email: "jordan.blake.demo@example.org",
    verificationStatus: "verification_expired",
    verifiedDate: "2024-06-01",
    // Deliberately in the past relative to SEED_TIMESTAMP to demo an expired verification that hasn't been auto-changed.
    verificationExpiryDate: "2025-06-01",
    nextReviewDate: "2027-01-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    ...demoBase("demo-advocate-morgan-lee", "ready_for_review"),
    fullName: "Morgan Lee",
    professionalType: "advocate",
    organisationId: "demo-org-harborlight-community-support",
    jobTitle: "Intake Advocate",
    shortIntroduction: "Fictional demo advocate whose local verification review was not confirmed.",
    fullBiography: "Demo body copy — a real profile would explain this advocate's role and how to request support through the linked organisation.",
    areasOfSupport: ["Intake support"],
    incidentTypeIds: ["demo-incident-online-harassment"],
    jurisdictions: ["nsw"],
    supportModes: ["phone"],
    languages: ["en"],
    costType: "free",
    acceptingNewReferrals: true,
    // Deliberately "rejected" while still Ready for review, to demonstrate
    // that verification status never blocks the publishing workflow either way.
    verificationStatus: "verification_rejected",
    verificationNotes: "Demo note — local review did not confirm the details provided.",
    nextReviewDate: "2026-12-01",
  },
  {
    // Deliberately in the past relative to SEED_TIMESTAMP to demo "Review overdue" alongside "needs_update".
    ...demoBase("demo-counsellor-taylor-reyes", "needs_update"),
    fullName: "Taylor Reyes",
    professionalType: "counsellor",
    jobTitle: "Senior Counsellor",
    shortIntroduction: "Fictional demo counsellor flagged for a profile update.",
    fullBiography: "Demo body copy — a real profile would describe this counsellor's current availability and specialisations.",
    areasOfSupport: ["Workplace stress counselling"],
    incidentTypeIds: ["demo-incident-workplace-discrimination"],
    jurisdictions: ["qld"],
    supportModes: ["phone", "video"],
    languages: ["en"],
    costType: "fee_for_service",
    feeInformation: "Demo fee information — a real record would state actual session costs.",
    acceptingNewReferrals: false,
    phone: "0000 000 011",
    verificationStatus: "verified",
    verifiedDate: "2025-05-01",
    verificationExpiryDate: "2026-05-01",
    nextReviewDate: "2026-04-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    ...demoBase("demo-advocate-casey-nguyen", "archived"),
    fullName: "Casey Nguyen",
    professionalType: "advocate",
    shortIntroduction: "Superseded demo advocate profile, kept only for local historical reference.",
    areasOfSupport: ["Regional advocacy (discontinued)"],
    jurisdictions: ["sa"],
    supportModes: ["phone"],
    languages: ["en"],
    costType: "free",
    acceptingNewReferrals: false,
    verificationStatus: "verification_expired",
    verifiedDate: "2023-01-01",
    verificationExpiryDate: "2024-01-01",
    nextReviewDate: "2025-01-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    // Draft, fully eligible (every required field set) and unreferenced —
    // demonstrates a draft that CAN be safely hard-deleted, in contrast with
    // demo-advocate-priya-chandran above.
    ...demoBase("demo-counsellor-fully-eligible-draft", "draft"),
    fullName: "Fully Eligible Draft Counsellor (Demo)",
    professionalType: "counsellor",
    shortIntroduction: "Fictional demo counsellor with every required field already complete.",
    fullBiography: "Demo body copy — every field required for Ready for review / Publish has already been filled in on this draft.",
    resourceCategoryIds: ["demo-category-emotional-support"],
    jurisdictions: ["nt"],
    supportModes: ["phone"],
    languages: ["en"],
    costType: "unknown",
    acceptingNewReferrals: false,
    phone: "0000 000 012",
    verificationStatus: "not_verified",
    nextReviewDate: "2027-06-01",
  },
];
export const seedSupportProfessionals = seedSupportProfessionalsRaw.map((r) => supportProfessionalSchema.parse(r));

/**
 * Covers every content status, several destination types, all three
 * anonymous-reporting/emergency-suitability tri-state values, and the same
 * delete/dependency contrast established above:
 * demo-destination-workplace-ombudsperson is a draft referenced by a
 * matching rule (blocks hard delete); demo-destination-incomplete-draft
 * demonstrates a reporting method selected without its backing contact data
 * (a Ready-for-review/Publish blocker); demo-destination-fully-eligible-draft
 * is complete and unreferenced (safe to hard-delete).
 */
const seedReportingDestinationsRaw = [
  {
    ...demoBase("demo-destination-local-police-non-emergency", "published"),
    name: "Local Police Non-Emergency Line (Demo)",
    destinationType: "police",
    description: "Fictional demo entry standing in for a real non-emergency reporting line.",
    jurisdictions: ["nsw", "vic"],
    incidentTypeIds: ["demo-incident-hate-speech"],
    reportingMethods: ["phone"],
    phone: "0000 000 020",
    reportingInstructions: "Demo instructions — replace with a verified real destination before publishing.",
    anonymousReporting: "no",
    emergencySuitability: "no",
    confidentialityInformation: "Demo text — a real record would state this line's actual confidentiality practice.",
    reviewDueDate: "2027-01-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    // Draft, and referenced by demo-rule-workplace-discrimination-legal
    // below — demonstrates dependency protection blocking an otherwise-
    // eligible draft delete.
    ...demoBase("demo-destination-workplace-ombudsperson", "draft"),
    name: "Workplace Ombudsperson Office (Demo)",
    destinationType: "ombudsman",
    description: "Fictional demo entry for a workplace complaints office.",
    incidentTypeIds: ["demo-incident-workplace-discrimination"],
    reportingMethods: ["website"],
    website: "https://example.org/ombudsperson-demo",
    anonymousReporting: "unknown",
    emergencySuitability: "unknown",
  },
  {
    ...demoBase("demo-destination-state-legal-aid-commission", "published"),
    name: "State Legal Aid Commission (Demo)",
    destinationType: "legal_aid",
    description: "Fictional demo legal aid commission intake line.",
    fullDescription: "Demo body copy — a real record would describe intake hours and what to bring to a first appointment.",
    resourceCategoryIds: ["demo-category-legal-rights"],
    jurisdictions: ["nsw"],
    reportingMethods: ["phone", "email", "website"],
    phone: "0000 000 021",
    email: "legalaid.demo@example.org",
    website: "https://example.org/legal-aid-demo",
    reportingInstructions: "Demo instructions — call or email during business hours to arrange an intake appointment.",
    anonymousReporting: "no",
    emergencySuitability: "no",
    reviewDueDate: "2027-02-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    ...demoBase("demo-destination-discrimination-commission", "published"),
    name: "Discrimination Complaints Commission (Demo)",
    destinationType: "discrimination_body",
    description: "Fictional demo discrimination complaints body with an online form.",
    resourceCategoryIds: ["demo-category-legal-rights"],
    incidentTypeIds: ["demo-incident-workplace-discrimination", "demo-incident-hate-speech"],
    australiaWide: true,
    reportingMethods: ["online_form"],
    onlineReportingUrl: "https://example.org/report/discrimination-demo",
    reportingInstructions: "Demo instructions — complete the online form; a case officer will follow up.",
    anonymousReporting: "yes",
    emergencySuitability: "no",
    // Deliberately within 30 days of SEED_TIMESTAMP (2026-06-01) to demo "Review due soon".
    reviewDueDate: "2026-06-20",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    ...demoBase("demo-destination-workplace-safety-body", "ready_for_review"),
    name: "Workplace Safety Reporting Body (Demo)",
    destinationType: "workplace_body",
    description: "Fictional demo workplace safety regulator.",
    jurisdictions: ["qld"],
    reportingMethods: ["phone", "appointment"],
    phone: "0000 000 022",
    bookingUrl: "https://example.org/book/workplace-safety-demo",
    reportingInstructions: "Demo instructions — phone first; an appointment can be booked online for a longer discussion.",
    anonymousReporting: "unknown",
    emergencySuitability: "unknown",
    reviewDueDate: "2027-03-01",
  },
  {
    // Deliberately in the past relative to SEED_TIMESTAMP to demo "Review overdue" alongside "needs_update".
    ...demoBase("demo-destination-housing-tribunal", "needs_update"),
    name: "Housing Tribunal Intake (Demo)",
    destinationType: "housing_body",
    description: "Fictional demo housing tribunal intake desk.",
    resourceCategoryIds: ["demo-category-housing"],
    incidentTypeIds: ["demo-incident-housing-crisis"],
    jurisdictions: ["wa"],
    reportingMethods: ["in_person"],
    address: "2 Demo Avenue, Sample City",
    reportingInstructions: "Demo instructions — attend in person during listed opening hours; no appointment required.",
    anonymousReporting: "no",
    emergencySuitability: "no",
    reviewDueDate: "2026-03-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    ...demoBase("demo-destination-community-helpline", "published"),
    name: "Community Support Helpline (Demo)",
    destinationType: "community_organisation",
    description: "Fictional demo 24-hour community helpline.",
    australiaWide: true,
    reportingMethods: ["phone"],
    phone: "0000 000 023",
    reportingInstructions: "Demo instructions — call anytime; the line is staffed 24 hours in this fictional example.",
    anonymousReporting: "yes",
    // Administrator-declared, not inferred from destinationType — this fictional example is explicitly suitable.
    emergencySuitability: "yes",
    confidentialityInformation: "Demo text — a real record would state this helpline's actual confidentiality practice.",
    reviewDueDate: "2027-04-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    ...demoBase("demo-destination-report-it-online-platform", "archived"),
    name: "Report-It Online Platform (Demo, discontinued)",
    destinationType: "online_platform",
    description: "Superseded demo online reporting platform, kept only for local historical reference.",
    reportingMethods: ["online_form"],
    onlineReportingUrl: "https://example.org/report-it-demo",
    reportingInstructions: "Demo instructions — this platform is discontinued in this fictional example.",
    anonymousReporting: "unknown",
    emergencySuitability: "no",
    reviewDueDate: "2025-06-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    // Draft, unreferenced, with an incomplete reporting method: "online_form"
    // is selected but no onlineReportingUrl is set — demonstrates the
    // method/contact-field consistency blocker.
    ...demoBase("demo-destination-incomplete-draft", "draft"),
    name: "Incomplete Draft Destination (Demo)",
    destinationType: "other",
    reportingMethods: ["online_form"],
  },
  {
    // Draft, fully eligible (every required field set) and unreferenced —
    // demonstrates a draft that CAN be safely hard-deleted.
    ...demoBase("demo-destination-fully-eligible-draft", "draft"),
    name: "Fully Eligible Draft Destination (Demo)",
    destinationType: "other",
    description: "Fictional demo destination with every required field already complete.",
    jurisdictions: ["act"],
    reportingMethods: ["phone"],
    phone: "0000 000 024",
    reportingInstructions: "Demo instructions — every field required for Ready for review / Publish has already been filled in on this draft.",
    anonymousReporting: "unknown",
    emergencySuitability: "unknown",
    reviewDueDate: "2027-06-01",
  },
];
export const seedReportingDestinations = seedReportingDestinationsRaw.map((r) =>
  reportingDestinationSchema.parse(r)
);

/**
 * Covers every status, every Assistant Topic (general_assistant,
 * domestic_violence, racial_abuse, cyber_scam, migrant_challenges — at least
 * once each), a jurisdiction-specific rule and an Australia-wide one, a
 * multi-recommendation-type rule (microcards + rights content + orgs +
 * professionals + reporting destinations + legislation all at once), and a
 * broken-relationship draft (a resource category id that doesn't resolve to
 * any seeded record). Every published rule's recommendation ids resolve to a
 * `published` record in this same file — see lib/matching-rules/eligibility.ts
 * for why that's required for anything past draft.
 *
 * `demo-rule-online-harassment-support` and `demo-rule-workplace-discrimination-legal`
 * keep their original ids and stay in "draft" on purpose: they're what
 * demo-microcard-document-an-incident-safely, demo-rights-reasonable-adjustments,
 * demo-org-northside-cultural-wellbeing, demo-advocate-priya-chandran, and
 * demo-destination-workplace-ombudsperson are referenced by above — those
 * five are themselves drafts, so the referencing rule must stay draft too
 * (a published rule cannot recommend unpublished content). Both also mix in
 * one already-published recommendation alongside the draft one, to
 * demonstrate the "N recommended X(s) are not published" blocker without
 * being *entirely* broken.
 */
const seedMatchingRulesRaw = [
  {
    ...demoBase("demo-rule-general-assistant-orientation", "draft"),
    name: "General assistant → orientation (demo)",
    machineKey: "general_assistant_orientation",
    description: "Draft: connects a general assistant conversation (no specific incident context yet) to an orientation starting point.",
    topicKeys: ["general_assistant"],
    // Deliberately references a resource category that was never seeded — demonstrates
    // the dangling-condition-reference blocker. Status stays "draft" because of it.
    resourceCategoryIds: ["demo-category-does-not-exist"],
    priority: 6,
  },
  {
    ...demoBase("demo-rule-domestic-violence-safety-support", "published"),
    name: "Domestic violence → safety planning & support (demo)",
    machineKey: "domestic_violence_safety_support",
    description: "Surfaces safety planning guidance and crisis support for a domestic/family violence conversation.",
    topicKeys: ["domestic_violence"],
    jurisdictions: ["nsw", "vic"],
    urgencyLevels: ["high", "critical"],
    supportNeeds: ["safety_planning"],
    triageLabelIds: ["demo-triage-urgent-safety-risk"],
    resourceCategoryIds: ["demo-category-safety"],
    microcardIds: ["demo-microcard-safety-planning-quick-tip"],
    rightsContentIds: ["demo-rights-emotional-support-options"],
    supportOrganisationIds: ["demo-org-riverside-crisis-line"],
    reportingDestinationIds: ["demo-destination-community-helpline"],
    priority: 1,
    reviewDueDate: "2027-01-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    // Multi-recommendation-type demo: every recommendation field is non-empty
    // at once, to exercise the full matching/dedup path. Also demonstrates
    // an Australia-wide rule (no jurisdiction filter).
    ...demoBase("demo-rule-racial-abuse-know-your-rights", "published"),
    name: "Racial abuse → know your rights & report (demo)",
    machineKey: "racial_abuse_know_your_rights",
    description: "Connects a racial abuse or hate speech conversation to rights information, support, and reporting pathways.",
    topicKeys: ["racial_abuse"],
    incidentTypeIds: ["demo-incident-hate-speech"],
    triageLabelIds: ["demo-triage-religious-bias"],
    resourceCategoryIds: ["demo-category-legal-rights"],
    jurisdictions: [],
    urgencyLevels: ["moderate", "high"],
    legislationIds: ["demo-doc-discrimination-act-guide"],
    microcardIds: ["demo-microcard-what-counts-as-racial-harassment"],
    rightsContentIds: ["demo-rights-report-anonymously"],
    supportOrganisationIds: ["demo-org-harborlight-community-support"],
    supportProfessionalIds: ["demo-advocate-amina-farouk"],
    reportingDestinationIds: ["demo-destination-discrimination-commission"],
    priority: 2,
    reviewDueDate: "2027-02-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    // Published but disabled — demonstrates that a disabled published rule
    // stays in the Published Content Bundle for inspection/version parity
    // (only the matching engine skips it at execution time).
    ...demoBase("demo-rule-cyber-scam-report-and-protect", "published"),
    name: "Cyber scam → reporting & protection basics (demo)",
    machineKey: "cyber_scam_report_and_protect",
    description: "Connects a cyber scam conversation to privacy guidance and a reporting pathway. Currently disabled pending a wording review.",
    enabled: false,
    topicKeys: ["cyber_scam"],
    jurisdictions: [],
    urgencyLevels: ["moderate"],
    supportNeeds: ["financial_loss", "identity_theft"],
    resourceCategoryIds: ["demo-category-legal-rights"],
    rightsContentIds: ["demo-rights-privacy-and-your-information"],
    supportOrganisationIds: ["demo-org-coastal-legal-aid-clinic"],
    reportingDestinationIds: ["demo-destination-local-police-non-emergency"],
    priority: 3,
    reviewDueDate: "2027-03-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    ...demoBase("demo-rule-migrant-challenges-orientation", "ready_for_review"),
    name: "Migrant challenges → orientation & support (demo)",
    machineKey: "migrant_challenges_orientation",
    description: "Connects a migrant-challenges conversation to emotional support and community organisation options.",
    topicKeys: ["migrant_challenges"],
    jurisdictions: ["qld"],
    urgencyLevels: ["low", "moderate"],
    resourceCategoryIds: ["demo-category-emotional-support"],
    rightsContentIds: ["demo-rights-emotional-support-options"],
    supportOrganisationIds: ["demo-org-harborlight-community-support"],
    priority: 4,
    // Deliberately within 30 days of SEED_TIMESTAMP (2026-06-01) to demo "Review due soon".
    reviewDueDate: "2026-06-20",
  },
  {
    // Draft — see the file-level comment above for why this stays draft.
    ...demoBase("demo-rule-online-harassment-support", "draft"),
    name: "Online harassment → community support (demo)",
    machineKey: "online_harassment_support",
    description: "Draft: connects an online harassment conversation to community support and rights information.",
    incidentTypeIds: ["demo-incident-online-harassment"],
    triageLabelIds: ["demo-triage-needs-follow-up"],
    urgencyLevels: ["moderate", "high"],
    microcardIds: ["demo-microcard-what-counts-as-racial-harassment", "demo-microcard-document-an-incident-safely"],
    rightsContentIds: ["demo-rights-reasonable-adjustments"],
    supportOrganisationIds: ["demo-org-harborlight-community-support", "demo-org-northside-cultural-wellbeing"],
    supportProfessionalIds: ["demo-advocate-amina-farouk"],
    priority: 1,
    internalNotes: "Two of the recommended items above are still drafts — this rule cannot move to Ready for review until they publish.",
  },
  {
    // Draft — see the file-level comment above for why this stays draft.
    ...demoBase("demo-rule-workplace-discrimination-legal", "draft"),
    name: "Workplace discrimination → legal aid (demo)",
    machineKey: "workplace_discrimination_legal_aid",
    description: "Draft: connects a workplace discrimination conversation to legal aid and a formal reporting pathway.",
    incidentTypeIds: ["demo-incident-workplace-discrimination"],
    triageLabelIds: ["demo-triage-escalate-authority"],
    jurisdictions: ["nsw"],
    urgencyLevels: ["high", "critical"],
    legislationIds: ["demo-doc-discrimination-act-guide"],
    supportProfessionalIds: ["demo-advocate-priya-chandran"],
    reportingDestinationIds: ["demo-destination-workplace-ombudsperson"],
    priority: 2,
  },
  {
    // needs_update, and deliberately recommends two records that are no
    // longer published (a ready_for_review organisation, a needs_update
    // destination) — demonstrates the dashboard's "broken relationships"
    // metric on a rule that isn't a draft.
    ...demoBase("demo-rule-housing-support-referral", "needs_update"),
    name: "Housing crisis → referral pathway (demo, needs update)",
    machineKey: "housing_crisis_referral",
    description: "Connects a housing crisis conversation to a housing support referral. Flagged after the linked services changed status.",
    incidentTypeIds: ["demo-incident-housing-crisis"],
    resourceCategoryIds: ["demo-category-housing"],
    jurisdictions: ["wa"],
    urgencyLevels: ["high"],
    supportOrganisationIds: ["demo-org-westside-housing-support"],
    reportingDestinationIds: ["demo-destination-housing-tribunal"],
    priority: 3,
    // Deliberately in the past relative to SEED_TIMESTAMP to demo "Review overdue" alongside "needs_update".
    reviewDueDate: "2026-03-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    ...demoBase("demo-rule-legacy-superseded-triage", "archived"),
    name: "Legacy triage referral (superseded, demo)",
    machineKey: "legacy_superseded_triage",
    description: "Superseded demo rule, kept only for local historical reference.",
    incidentTypeIds: ["demo-incident-physical-assault-legacy"],
    triageLabelIds: ["demo-triage-legacy-high-priority"],
    urgencyLevels: ["critical"],
    microcardIds: ["demo-microcard-retired-seasonal-guidance"],
    reportingDestinationIds: ["demo-destination-report-it-online-platform"],
    priority: 5,
    reviewDueDate: "2025-01-01",
    publishedDate: SEED_TIMESTAMP,
  },
  // --- Phase 6.1: baseline Published + Enabled coverage for every one of the
  // five Assistant topics. Each of these three rules conditions ONLY on
  // `topicKeys` (every other dimension left empty/wildcard) so it reliably
  // triggers from the bare topic-only `MockIncidentContext` the Assistant
  // routes actually produce by default — unlike the richer, more specific
  // rules above (e.g. demo-rule-domestic-violence-safety-support's
  // jurisdiction/urgency/triage-label conditions), which only fire once a
  // conversation has supplied that additional structured detail. See
  // docs/ARCHITECTURE.md "Phase 6.1 — matching-rule/context parity."
  {
    ...demoBase("demo-rule-domestic-violence-baseline-support", "published"),
    name: "Domestic violence → baseline support (demo)",
    machineKey: "domestic_violence_baseline_support",
    description:
      "Baseline Domestic Violence coverage, topic-only (no jurisdiction/urgency condition), so it reliably triggers regardless of what the conversation has captured so far. demo-rule-domestic-violence-safety-support above remains the richer, jurisdiction/urgency-specific example.",
    topicKeys: ["domestic_violence"],
    microcardIds: ["demo-microcard-safety-planning-quick-tip"],
    rightsContentIds: ["demo-rights-emotional-support-options"],
    supportOrganisationIds: ["demo-org-riverside-crisis-line"],
    reportingDestinationIds: ["demo-destination-community-helpline"],
    priority: 5,
    reviewDueDate: "2027-07-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    ...demoBase("demo-rule-racial-abuse-baseline-support", "published"),
    name: "Racial abuse → baseline rights & support (demo)",
    machineKey: "racial_abuse_baseline_support",
    description:
      "Baseline Racial Abuse coverage, topic-only (no triage-label/urgency condition), so it reliably triggers regardless of what the conversation has captured so far. demo-rule-racial-abuse-know-your-rights above remains the richer, triage-label/urgency-specific example.",
    topicKeys: ["racial_abuse"],
    microcardIds: ["demo-microcard-what-counts-as-racial-harassment"],
    rightsContentIds: ["demo-rights-report-anonymously"],
    supportOrganisationIds: ["demo-org-harborlight-community-support"],
    supportProfessionalIds: ["demo-advocate-amina-farouk"],
    priority: 5,
    reviewDueDate: "2027-07-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    ...demoBase("demo-rule-general-assistant-support-navigation", "published"),
    name: "General assistant → support navigation (demo)",
    machineKey: "general_assistant_support_navigation",
    description:
      "Baseline General Assistant coverage: neutral orientation guidance and support-navigation content. Does not assume any specific incident occurred.",
    topicKeys: ["general_assistant"],
    microcardIds: ["demo-microcard-general-next-steps-guide"],
    rightsContentIds: ["demo-rights-emotional-support-options"],
    supportOrganisationIds: ["demo-org-harborlight-community-support"],
    priority: 5,
    reviewDueDate: "2027-07-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    ...demoBase("demo-rule-migrant-challenges-community-support", "published"),
    name: "Migrant challenges → community support (demo)",
    machineKey: "migrant_challenges_community_support",
    description:
      "Baseline Migrant Challenges coverage: general community support, language-access information, and a support helpline. Not personalised immigration advice.",
    topicKeys: ["migrant_challenges"],
    rightsContentIds: ["demo-rights-community-and-language-support"],
    supportOrganisationIds: ["demo-org-harborlight-community-support"],
    reportingDestinationIds: ["demo-destination-community-helpline"],
    priority: 5,
    reviewDueDate: "2027-07-01",
    publishedDate: SEED_TIMESTAMP,
  },
  {
    // A second, distinct Cyber Scam rule — deliberately not the same one as
    // demo-rule-cyber-scam-report-and-protect above, which stays Published
    // but Disabled on purpose (a valid fixture demonstrating "a disabled
    // published rule does not execute"). This one is enabled, so Cyber Scam
    // has real baseline coverage regardless of that other rule's status.
    ...demoBase("demo-rule-cyber-scam-evidence-and-support", "published"),
    name: "Cyber scam → evidence, protection & reporting (demo)",
    machineKey: "cyber_scam_evidence_and_support",
    description:
      "Baseline Cyber Scam coverage: privacy/evidence-preservation guidance, legal support, and a non-emergency reporting pathway.",
    topicKeys: ["cyber_scam"],
    rightsContentIds: ["demo-rights-privacy-and-your-information"],
    supportOrganisationIds: ["demo-org-coastal-legal-aid-clinic"],
    reportingDestinationIds: ["demo-destination-local-police-non-emergency"],
    priority: 4,
    reviewDueDate: "2027-07-01",
    publishedDate: SEED_TIMESTAMP,
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
    ...seedIncidentTypes.map((d) => ({ entityType: "incident_type" as const, id: d.id, status: d.status, summary: `Seeded demo incident type "${d.name}"` })),
    ...seedTriageLabels.map((d) => ({ entityType: "triage_label" as const, id: d.id, status: d.status, summary: `Seeded demo triage label "${d.name}"` })),
    ...seedResourceCategories.map((d) => ({ entityType: "resource_category" as const, id: d.id, status: d.status, summary: `Seeded demo resource category "${d.name}"` })),
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
