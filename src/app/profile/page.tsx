"use client";

import { IconCheck, IconDatabase, IconEdit, IconShieldLock, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { useAdminRepository } from "@/components/providers/repository-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Alert } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminAccount } from "@/hooks/use-admin-account";
import { ADMIN_ACCOUNT_EVENT, type AdminAccount } from "@/lib/models/admin-account";
import { getPersonInitials } from "@/lib/person-identity";

/**
 * Phase 8.4 — the canonical Admin self-profile route. This is the logged-in
 * Admin's own profile only: there is no Admin registration, no Admin
 * directory, and no way to browse or manage other admins or SafeSpeak users
 * here (there is exactly one local administrator identity in this phase —
 * see `LOCAL_ADMIN_ACTOR` in `lib/models/base.ts`). Editable fields are
 * limited to how this admin is addressed in this browser; role is a fixed,
 * read-only summary, never editable here.
 */
export default function AdminProfilePage() {
  const { repository, isReady } = useAdminRepository();
  const account = useAdminAccount();

  const [isEditing, setIsEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isEditing && account) {
      setDraftName(account.displayName);
      setDraftEmail(account.contactEmail ?? "");
    }
  }, [account, isEditing]);

  function startEditing() {
    if (!account) return;
    setDraftName(account.displayName);
    setDraftEmail(account.contactEmail ?? "");
    setErrorMessage(null);
    setSavedMessage(null);
    setIsEditing(true);
  }

  function cancelEditing() {
    if (account) {
      setDraftName(account.displayName);
      setDraftEmail(account.contactEmail ?? "");
    }
    setErrorMessage(null);
    setIsEditing(false);
  }

  async function saveChanges() {
    if (!repository) return;

    const trimmedName = draftName.trim();
    if (!trimmedName) {
      setErrorMessage("Display name can't be empty.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const patch: Partial<AdminAccount> = {
        displayName: trimmedName,
        contactEmail: draftEmail.trim() || undefined,
      };
      await repository.adminAccount.update(patch);
      window.dispatchEvent(new CustomEvent(ADMIN_ACCOUNT_EVENT));
      setIsEditing(false);
      setSavedMessage("Profile saved on this device.");
    } catch {
      setErrorMessage("Profile could not be saved. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const displayName = account?.displayName ?? "Local Administrator";

  return (
    <>
      <PageHeader title="My Profile" description="Your own local administrator profile for this browser." />

      {!isReady || account === undefined ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback className="text-lg">{getPersonInitials(displayName)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-lg font-bold text-foreground">{displayName}</p>
                  <p className="text-sm text-muted-foreground">Local Administrator</p>
                </div>
              </div>
              {!isEditing ? (
                <Button variant="outline" onClick={startEditing}>
                  <IconEdit size={16} aria-hidden="true" />
                  Edit profile
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card aria-live="polite">
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
              <div>
                <CardTitle>Editable info</CardTitle>
                <CardDescription>Only what you can genuinely edit — how you&apos;re addressed in this browser.</CardDescription>
              </div>
              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={cancelEditing} disabled={isSaving}>
                    <IconX size={14} aria-hidden="true" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={() => void saveChanges()} disabled={isSaving}>
                    <IconCheck size={14} aria-hidden="true" />
                    {isSaving ? "Saving…" : "Save"}
                  </Button>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMessage ? (
                <Alert tone="destructive" title="Couldn't save" role="alert">
                  {errorMessage}
                </Alert>
              ) : null}
              {savedMessage && !isEditing ? (
                <Alert tone="success" title="Saved">
                  {savedMessage}
                </Alert>
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="admin-display-name">Display name</Label>
                {isEditing ? (
                  <Input
                    id="admin-display-name"
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    maxLength={80}
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground">{displayName}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="admin-contact-email">Contact email (optional, for your own reference)</Label>
                {isEditing ? (
                  <Input
                    id="admin-contact-email"
                    type="email"
                    value={draftEmail}
                    onChange={(event) => setDraftEmail(event.target.value)}
                    placeholder="you@example.org"
                  />
                ) : (
                  <p className="text-sm font-medium text-foreground">{account.contactEmail || "Not set"}</p>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                This is not used to sign in — this app has no login. It&apos;s stored only in this
                browser, the same way every other record in safespeak-admin is.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Role summary</CardTitle>
              <CardDescription>Fixed for this phase — not editable here.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-start gap-3">
              <IconShieldLock size={20} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">Local Administrator</span> — full access
                to this browser&apos;s local content. There is no Admin directory, no Admin sign-up, and
                no other administrator accounts in this phase; this app tracks a single local
                administrator identity for audit metadata.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account actions</CardTitle>
            </CardHeader>
            <CardContent>
              <Link
                href="/settings"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                <IconDatabase size={16} aria-hidden="true" />
                Open local data status
              </Link>
              <p className="mt-3 text-xs text-muted-foreground">
                Password changes, sign-out, and multi-admin management aren&apos;t available — this
                app has no authentication to manage.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </>
  );
}
