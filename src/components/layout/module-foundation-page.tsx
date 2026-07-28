"use client";

import { IconFlask2 } from "@tabler/icons-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared shell for every content/taxonomy module that has a data model and a
 * seeded demo dataset, but no CRUD screen yet — see README "Phase boundary".
 * The record count is read live from the repository so this never overstates
 * what exists.
 */
export function ModuleFoundationPage({
  title,
  description,
  recordCount,
  fieldsPrepared,
}: {
  title: string;
  description: string;
  recordCount: number | undefined;
  fieldsPrepared: string[];
}) {
  return (
    <>
      <PageHeader title={title} description={description} />

      <Card className="border-dashed">
        <CardHeader className="flex flex-row items-start gap-3 space-y-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <IconFlask2 size={20} aria-hidden="true" />
          </span>
          <div>
            <CardTitle>Foundation in place — full management coming in a later phase</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              The data model, validation, local storage, and demo records for this module already
              exist. Creating, editing, and publishing records here is planned for a later phase and
              is not implemented yet.
            </p>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-semibold text-foreground">Local demo records:</span>
            {recordCount === undefined ? (
              <Skeleton className="h-5 w-10" />
            ) : (
              <Badge tone="primary">{recordCount}</Badge>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">Fields already modelled</p>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {fieldsPrepared.map((field) => (
                <li key={field}>
                  <Badge tone="neutral">{field}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
