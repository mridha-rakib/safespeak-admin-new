"use client";

import { PageHeader } from "@/components/layout/page-header";
import { ExportBundlePanel } from "@/components/settings/export-bundle-panel";
import { ResetDemoDataDialog } from "@/components/settings/reset-demo-data-dialog";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppSettings } from "@/hooks/use-app-settings";
import { DB_SCHEMA_VERSION } from "@/lib/db/db";
import { BUNDLE_SCHEMA_VERSION } from "@/lib/models/content-bundle";

export default function SettingsPage() {
  const settings = useAppSettings();

  return (
    <>
      <PageHeader title="Settings" description="Local data status, demo data reset, and content bundle export." />

      <Card>
        <CardHeader>
          <CardTitle>Local data status</CardTitle>
          <CardDescription>Everything below lives only in this browser&apos;s IndexedDB store.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Database schema version</dt>
              <dd className="font-medium text-foreground">{DB_SCHEMA_VERSION}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Bundle schema version</dt>
              <dd className="font-medium text-foreground">{BUNDLE_SCHEMA_VERSION}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Demo data status</dt>
              <dd>
                {settings === undefined ? (
                  <Skeleton className="h-5 w-24" />
                ) : settings.demoDataSeededAt ? (
                  <Badge tone="success">Seeded {new Date(settings.demoDataSeededAt).toLocaleString()}</Badge>
                ) : (
                  <Badge tone="neutral">Not seeded yet</Badge>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-muted-foreground">Last demo reset</dt>
              <dd className="font-medium text-foreground">
                {settings?.demoDataLastResetAt ? new Date(settings.demoDataLastResetAt).toLocaleString() : "Never"}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Alert tone="warning" title="This data is stored in this browser only">
          Clearing this browser&apos;s site data, using a different browser, or using a private/incognito
          window will remove or hide everything you see in this admin app. Nothing is backed up
          automatically.
        </Alert>
        <Alert tone="info" title="No backend is connected">
          safespeak-admin does not call any API or remote database in this phase. There is no
          authentication beyond a single local administrator identity used for audit metadata.
        </Alert>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reset demo data</CardTitle>
          <CardDescription>Restore the deterministic demo dataset used throughout this admin app.</CardDescription>
        </CardHeader>
        <CardContent>
          <ResetDemoDataDialog />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Export content bundle</CardTitle>
          <CardDescription>
            Download a versioned snapshot of local content. Importing it into safespeak-frontend is a
            future phase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ExportBundlePanel />
        </CardContent>
      </Card>
    </>
  );
}
