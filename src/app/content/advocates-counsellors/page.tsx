"use client";

import { ModuleFoundationPage } from "@/components/layout/module-foundation-page";
import { Card, CardContent } from "@/components/ui/card";
import { ContentStatusBadge, VerificationBadge } from "@/components/ui/status-badge";
import { Alert } from "@/components/ui/alert";
import { deriveContactCapabilities } from "@/lib/contact-capabilities";
import { useCrudList } from "@/hooks/use-crud-list";
import { initialsForName } from "@/lib/models/support-professional";

export default function AdvocatesCounsellorsPage() {
  const records = useCrudList((repo) => repo.supportProfessionals);

  return (
    <>
      <ModuleFoundationPage
        title="Advocates & Counsellors"
        description="Individual support professionals. A profile may be published while its verification is still incomplete."
        recordCount={records?.length}
        fieldsPrepared={[
          "fullName",
          "professionalType",
          "areasOfSupport",
          "supportModes",
          "verificationStatus",
          "phone / email / bookingUrl / organisationWebsite",
          "status",
        ]}
      />

      <Alert tone="warning" title="Publication does not imply verification">
        A published profile can still be unverified. The badge below always states the verification
        status in words — color is never the only signal.
      </Alert>

      <div className="grid gap-3 sm:grid-cols-2">
        {records?.map((professional) => {
          const capabilities = deriveContactCapabilities(professional);
          return (
            <Card key={professional.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary"
                >
                  {initialsForName(professional.fullName)}
                </span>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{professional.fullName}</p>
                    <ContentStatusBadge status={professional.status} />
                  </div>
                  <p className="text-xs capitalize text-muted-foreground">
                    {professional.professionalType.replace(/_/g, " ")}
                  </p>
                  <VerificationBadge status={professional.verificationStatus} />
                  <p className="text-xs text-muted-foreground">
                    {[
                      capabilities.canCall && "Phone",
                      capabilities.canEmail && "Email",
                      capabilities.canBook && "Booking link",
                      capabilities.canVisitWebsite && "Website",
                    ]
                      .filter(Boolean)
                      .join(" · ") || "No contact methods on file"}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </>
  );
}
