import type { AssistantTopicKey } from "@/lib/models/assistant-topic";
import type { AustralianJurisdiction } from "@/lib/jurisdictions";
import type { MatchingRule } from "@/lib/models/matching-rule";
import type { TriageUrgencyLevel } from "@/lib/models/triage-label";

/**
 * Public export shape for Matching Rules — a field allow-list (not
 * "everything minus a few keys"), mirroring lib/taxonomy/export-transform.ts
 * and lib/microcards/export-transform.ts. `machineKey` is kept (taxonomy's
 * own public exports keep theirs too — see toPublishedIncidentTypeExport).
 * `internalNotes`, `createdBy`, and `updatedBy` are deliberately excluded:
 * never appropriate for a frontend consumer. See README "Published Content
 * Bundle vs Admin Backup."
 */
export interface PublishedMatchingRuleExport {
  id: string;
  name: string;
  machineKey: string;
  description?: string;
  priority: number;
  enabled: boolean;
  topicKeys: AssistantTopicKey[];
  incidentTypeIds: string[];
  triageLabelIds: string[];
  resourceCategoryIds: string[];
  jurisdictions: AustralianJurisdiction[];
  urgencyLevels: TriageUrgencyLevel[];
  supportNeeds: string[];
  legislationIds: string[];
  microcardIds: string[];
  rightsContentIds: string[];
  supportOrganisationIds: string[];
  supportProfessionalIds: string[];
  reportingDestinationIds: string[];
  publishedDate?: string;
  status: MatchingRule["status"];
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export function toPublishedMatchingRuleExport(record: MatchingRule): PublishedMatchingRuleExport {
  return {
    id: record.id,
    name: record.name,
    machineKey: record.machineKey,
    description: record.description,
    priority: record.priority,
    enabled: record.enabled,
    topicKeys: record.topicKeys,
    incidentTypeIds: record.incidentTypeIds,
    triageLabelIds: record.triageLabelIds,
    resourceCategoryIds: record.resourceCategoryIds,
    jurisdictions: record.jurisdictions,
    urgencyLevels: record.urgencyLevels,
    supportNeeds: record.supportNeeds,
    legislationIds: record.legislationIds,
    microcardIds: record.microcardIds,
    rightsContentIds: record.rightsContentIds,
    supportOrganisationIds: record.supportOrganisationIds,
    supportProfessionalIds: record.supportProfessionalIds,
    reportingDestinationIds: record.reportingDestinationIds,
    publishedDate: record.publishedDate,
    status: record.status,
    isDemo: record.isDemo,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version,
  };
}
