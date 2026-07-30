import { createBaseFields } from "../../../src/lib/models/base";
import type { IncidentType } from "../../../src/lib/models/incident-type";
import type { ResourceCategory } from "../../../src/lib/models/resource-category";
import type { TriageLabel } from "../../../src/lib/models/triage-label";

export function makeTestIncidentType(overrides: Partial<IncidentType> = {}): IncidentType {
  return {
    ...createBaseFields({ status: "published" }),
    name: "Test Incident Type",
    machineKey: "test_incident_type",
    description: "A short description.",
    displayOrder: 0,
    defaultUrgency: "not_set",
    relatedResourceCategoryIds: [],
    category: undefined,
    ...overrides,
  };
}

export function makeTestTriageLabel(overrides: Partial<TriageLabel> = {}): TriageLabel {
  return {
    ...createBaseFields({ status: "published" }),
    name: "Test Triage Label",
    machineKey: "test_triage_label",
    description: "A short description.",
    labelGroup: "other",
    displayOrder: 0,
    urgencyLevel: "moderate",
    ...overrides,
  };
}

export function makeTestResourceCategory(overrides: Partial<ResourceCategory> = {}): ResourceCategory {
  return {
    ...createBaseFields({ status: "published" }),
    name: "Test Resource Category",
    machineKey: "test_resource_category",
    description: "A short description.",
    displayOrder: 0,
    parentCategoryId: undefined,
    ...overrides,
  };
}
