"use client";

import { IconHistory } from "@tabler/icons-react";

import { PageHeader } from "@/components/layout/page-header";
import { DataTable } from "@/components/table/data-table";
import { auditEventColumns } from "@/components/table/audit-event-columns";
import { Alert } from "@/components/ui/alert";
import { useAuditEvents } from "@/hooks/use-audit-events";

export default function AuditHistoryPage() {
  const events = useAuditEvents();

  return (
    <>
      <PageHeader
        title="Audit History"
        description="A local, append-only record of admin actions in this browser."
      />

      <Alert tone="info" title="Local browser history, not a tamper-proof audit trail">
        This log lives in this browser&apos;s IndexedDB store. It is not server-backed, not
        regulatory-grade, and can be cleared if the browser&apos;s site data is cleared.
      </Alert>

      <DataTable
        caption="Audit history"
        columns={auditEventColumns}
        data={events}
        searchPlaceholder="Search audit history..."
        emptyTitle="No audit events yet"
        emptyDescription="Actions you take in this admin app will appear here."
        pageSizeStorageKey="safespeak-admin:audit-history:page-size"
      />

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <IconHistory size={14} aria-hidden="true" />
        Showing every locally recorded event, most recent first.
      </p>
    </>
  );
}
