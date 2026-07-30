import type { IncidentType } from "@/lib/models/incident-type";
import type { ResourceCategory } from "@/lib/models/resource-category";
import type { TriageLabel } from "@/lib/models/triage-label";

/**
 * Public export shapes for the three taxonomy entities — field allow-lists
 * (not "everything minus a few keys"), mirroring
 * lib/legislation/export-transform.ts. `internalNotes` and (for incident
 * types) the admin-only `adminGuidance` field are deliberately excluded:
 * neither is appropriate for a frontend consumer. See README "Published
 * Content Bundle vs Admin Backup."
 */
export interface PublishedIncidentTypeExport {
  id: string;
  name: string;
  machineKey: string;
  description?: string;
  displayOrder: number;
  defaultUrgency: IncidentType["defaultUrgency"];
  userFacingLabel?: string;
  relatedResourceCategoryIds: string[];
  status: IncidentType["status"];
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export function toPublishedIncidentTypeExport(record: IncidentType): PublishedIncidentTypeExport {
  return {
    id: record.id,
    name: record.name,
    machineKey: record.machineKey,
    description: record.description,
    displayOrder: record.displayOrder,
    defaultUrgency: record.defaultUrgency,
    userFacingLabel: record.userFacingLabel,
    relatedResourceCategoryIds: record.relatedResourceCategoryIds,
    status: record.status,
    isDemo: record.isDemo,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version,
  };
}

export interface PublishedTriageLabelExport {
  id: string;
  name: string;
  machineKey: string;
  description?: string;
  labelGroup: TriageLabel["labelGroup"];
  displayOrder: number;
  status: TriageLabel["status"];
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export function toPublishedTriageLabelExport(record: TriageLabel): PublishedTriageLabelExport {
  return {
    id: record.id,
    name: record.name,
    machineKey: record.machineKey,
    description: record.description,
    labelGroup: record.labelGroup,
    displayOrder: record.displayOrder,
    status: record.status,
    isDemo: record.isDemo,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version,
  };
}

export interface PublishedResourceCategoryExport {
  id: string;
  name: string;
  machineKey: string;
  description?: string;
  displayOrder: number;
  iconKey?: ResourceCategory["iconKey"];
  accentToken?: ResourceCategory["accentToken"];
  status: ResourceCategory["status"];
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export function toPublishedResourceCategoryExport(record: ResourceCategory): PublishedResourceCategoryExport {
  return {
    id: record.id,
    name: record.name,
    machineKey: record.machineKey,
    description: record.description,
    displayOrder: record.displayOrder,
    iconKey: record.iconKey,
    accentToken: record.accentToken,
    status: record.status,
    isDemo: record.isDemo,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    version: record.version,
  };
}
