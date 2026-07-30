"use client";

import { MatchingRuleForm } from "@/components/matching-rules/matching-rule-form";
import { PageHeader } from "@/components/layout/page-header";

export default function NewMatchingRulePage() {
  return (
    <>
      <PageHeader
        title="Add matching rule"
        description="Create a new rule connecting incident context to the content and support that should surface."
      />
      <MatchingRuleForm mode="create" />
    </>
  );
}
