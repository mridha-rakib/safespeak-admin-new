"use client";

import { ModuleFoundationPage } from "@/components/layout/module-foundation-page";
import { useCrudList } from "@/hooks/use-crud-list";

export default function MatchingRulesPage() {
  const records = useCrudList((repo) => repo.matchingRules);

  return (
    <ModuleFoundationPage
      title="Matching Rules"
      description="How incident context (type, jurisdiction, urgency) connects to the content and support that should surface. No rule-builder or matching engine in this phase — data contract and demo records only."
      recordCount={records?.length}
      fieldsPrepared={[
        "incidentTypeId",
        "jurisdictions",
        "urgencyLevels",
        "triageLabelIds",
        "legislationIds / microcardIds / rightsContentIds",
        "supportOrganisationIds / supportProfessionalIds",
        "reportingDestinationIds",
        "priority",
        "active",
      ]}
    />
  );
}
