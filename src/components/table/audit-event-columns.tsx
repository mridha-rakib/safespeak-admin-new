import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import type { AuditEvent } from "@/lib/models/audit-event";

export const AUDIT_ACTION_LABEL: Record<AuditEvent["action"], string> = {
  created: "Created",
  updated: "Updated",
  status_changed: "Status changed",
  deleted: "Deleted",
  demo_data_seeded: "Demo data seeded",
  demo_data_reset: "Demo data reset",
  bundle_exported: "Bundle exported",
};

export const AUDIT_ENTITY_LABEL: Record<AuditEvent["entityType"], string> = {
  document: "Document",
  microcard: "Microcard",
  rights_content: "Rights content",
  support_organisation: "Support organisation",
  support_professional: "Advocate/Counsellor",
  reporting_destination: "Reporting destination",
  incident_type: "Incident type",
  triage_label: "Triage label",
  resource_category: "Resource category",
  matching_rule: "Matching rule",
  app_settings: "Settings",
  content_bundle: "Content bundle",
};

/** Shared by both the Dashboard "Recent activity" table and the full Audit History table. */
export const auditEventColumns: ColumnDef<AuditEvent, unknown>[] = [
  {
    accessorKey: "timestamp",
    header: "When",
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap text-xs text-muted-foreground">
        {new Date(getValue<string>()).toLocaleString()}
      </span>
    ),
  },
  {
    accessorKey: "entityType",
    header: "Entity",
    cell: ({ getValue }) => AUDIT_ENTITY_LABEL[getValue<AuditEvent["entityType"]>()],
  },
  {
    accessorKey: "action",
    header: "Action",
    cell: ({ getValue }) => <Badge tone="primary">{AUDIT_ACTION_LABEL[getValue<AuditEvent["action"]>()]}</Badge>,
  },
  {
    accessorKey: "summary",
    header: "Summary",
    cell: ({ getValue }) => <span className="text-sm text-foreground">{getValue<string>()}</span>,
  },
  {
    accessorKey: "actor",
    header: "Actor",
  },
  {
    accessorKey: "isDemo",
    header: "Demo",
    cell: ({ getValue }) => (getValue<boolean>() ? <Badge tone="neutral">Demo</Badge> : null),
  },
];
