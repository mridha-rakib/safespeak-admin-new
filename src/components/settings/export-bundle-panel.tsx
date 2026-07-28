"use client";

import { IconDownload } from "@tabler/icons-react";
import { useState } from "react";

import { useAdminRepository } from "@/components/providers/repository-provider";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { buildContentBundle, serializeBundleAsJson } from "@/lib/bundle/export-bundle";
import { buildZipBundle } from "@/lib/bundle/export-bundle-zip";
import { downloadBlob } from "@/lib/bundle/download-bundle";
import { BUNDLE_SCHEMA_VERSION, contentBundleHistorySchema } from "@/lib/models/content-bundle";
import { createAuditEvent } from "@/lib/models/audit-event";
import { LOCAL_ADMIN_ACTOR, newId, nowIso } from "@/lib/models/base";

type ExportFormat = "json" | "zip";

export function ExportBundlePanel() {
  const { repository } = useAdminRepository();
  const [includeDemoData, setIncludeDemoData] = useState(true);
  const [format, setFormat] = useState<ExportFormat>("json");
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");
  const [warnings, setWarnings] = useState<string[]>([]);

  async function handleExport() {
    if (!repository) return;
    setStatus("working");
    setWarnings([]);

    try {
      const bundle = await buildContentBundle(repository, { includeDemoData });
      const timestampSlug = nowIso().replace(/[:.]/g, "-");

      if (format === "zip") {
        const { blob, manifest } = await buildZipBundle(repository, bundle);
        downloadBlob(blob, `safespeak-content-bundle-${timestampSlug}.zip`);
        setWarnings(manifest.warnings);
        await repository.bundleHistory.append(
          contentBundleHistorySchema.parse({
            id: newId(),
            generatedAt: manifest.generatedAt,
            bundleVersion: manifest.bundleVersion,
            format: "zip",
            fileName: `safespeak-content-bundle-${timestampSlug}.zip`,
            includesDemoData: manifest.includesDemoData,
            recordCounts: manifest.recordCounts,
            warningCount: manifest.warnings.length,
          })
        );
      } else {
        const json = serializeBundleAsJson(bundle);
        downloadBlob(new Blob([json], { type: "application/json" }), `safespeak-content-bundle-${timestampSlug}.json`);
        setWarnings(bundle.manifest.warnings);
        await repository.bundleHistory.append(
          contentBundleHistorySchema.parse({
            id: newId(),
            generatedAt: bundle.manifest.generatedAt,
            bundleVersion: bundle.manifest.bundleVersion,
            format: "json",
            fileName: `safespeak-content-bundle-${timestampSlug}.json`,
            includesDemoData: bundle.manifest.includesDemoData,
            recordCounts: bundle.manifest.recordCounts,
            warningCount: bundle.manifest.warnings.length,
          })
        );
      }

      await repository.auditEvents.append(
        createAuditEvent({
          entityType: "content_bundle",
          entityId: "content-bundle-export",
          action: "bundle_exported",
          actor: LOCAL_ADMIN_ACTOR,
          summary: `Exported a ${format.toUpperCase()} content bundle (schema v${BUNDLE_SCHEMA_VERSION}).`,
          isDemo: false,
        })
      );

      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="space-y-4">
      <Alert tone="info" title="This does not update safespeak-frontend automatically">
        Exporting downloads a versioned bundle file to your computer. Importing it into the user-facing
        frontend is a separate step that will be implemented in a later phase.
      </Alert>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-semibold text-foreground">Format</legend>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="bundle-format"
            checked={format === "json"}
            onChange={() => setFormat("json")}
          />
          JSON only (no document files)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="radio"
            name="bundle-format"
            checked={format === "zip"}
            onChange={() => setFormat("zip")}
          />
          ZIP (includes uploaded PDF files)
        </label>
      </fieldset>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={includeDemoData}
          onChange={(event) => setIncludeDemoData(event.target.checked)}
        />
        Include demo data
      </label>

      <div className="flex items-center gap-3">
        <Button onClick={handleExport} disabled={!repository || status === "working"}>
          <IconDownload size={16} aria-hidden="true" />
          {status === "working" ? "Preparing export…" : "Export content bundle"}
        </Button>
        <Badge tone="neutral">Bundle schema v{BUNDLE_SCHEMA_VERSION}</Badge>
      </div>

      {status === "done" ? (
        <Alert tone="success" title="Bundle exported">
          Your download should start automatically.
          {warnings.length > 0 ? ` ${warnings.length} warning(s) were recorded — see below.` : ""}
        </Alert>
      ) : null}
      {status === "error" ? (
        <Alert tone="destructive" title="Export failed" role="alert">
          Something went wrong while preparing the bundle. No file was downloaded.
        </Alert>
      ) : null}
      {warnings.length > 0 ? (
        <ul className="space-y-1 text-xs text-muted-foreground">
          {warnings.map((warning, index) => (
            <li key={index}>• {warning}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
