"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProfileImageUrl } from "@/hooks/use-profile-image-url";
import { initialsForName } from "@/lib/models/support-professional";
import { PROFILE_PHOTO_ACCEPTED_TYPES } from "@/lib/models/support-professional";
import { validateProfileImageFile } from "@/lib/support-directory/profile-image";

/**
 * Local-only until the form is saved: a newly-picked file is held as a
 * `File` (previewed via a local, revoked-on-change object URL) and only
 * actually written through the repository — as one Blob-plus-metadata
 * transaction, alongside a factual audit event — when the form calls
 * `repository.supportProfessionals.setProfileImage()` at save time. A
 * failed *new* selection (wrong type/too large) never touches the
 * previously stored valid image.
 */
export function ProfileImageField({
  professionalId,
  fullName,
  hasStoredImage,
  pendingFile,
  markedForRemoval,
  onFileSelected,
  onRemove,
  onUndoRemove,
}: {
  professionalId: string | undefined;
  fullName: string;
  hasStoredImage: boolean;
  pendingFile: File | null;
  markedForRemoval: boolean;
  onFileSelected: (file: File) => void;
  onRemove: () => void;
  onUndoRemove: () => void;
}) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | undefined>(undefined);
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false);

  const storedImageUrl = useProfileImageUrl(professionalId, hasStoredImage && !markedForRemoval);

  useEffect(() => {
    if (!pendingFile) {
      setLocalPreviewUrl(undefined);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setLocalPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const displayUrl = localPreviewUrl ?? storedImageUrl;
  const showRemove = Boolean(pendingFile) || (hasStoredImage && !markedForRemoval);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const result = validateProfileImageFile(file);
    if (!result.valid) {
      setError(result.reason ?? "This image could not be used.");
      return;
    }
    setError(null);
    onFileSelected(file);
  }

  return (
    <div className="space-y-2">
      <span className="text-sm font-semibold text-foreground">Profile image (optional)</span>
      <div className="flex items-center gap-4">
        {displayUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a locally-managed object URL, not an optimizable remote/static asset
          <img src={displayUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary"
          >
            {initialsForName(fullName || "?")}
          </span>
        )}
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <label
              htmlFor={inputId}
              className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-secondary"
            >
              {showRemove ? "Replace image" : "Upload image"}
            </label>
            <input
              ref={fileInputRef}
              id={inputId}
              type="file"
              accept={PROFILE_PHOTO_ACCEPTED_TYPES.join(",")}
              onChange={handleFileChange}
              className="sr-only"
            />
            {showRemove ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setRemoveConfirmOpen(true)}>
                Remove
              </Button>
            ) : null}
            {markedForRemoval ? (
              <Button type="button" variant="ghost" size="sm" onClick={onUndoRemove}>
                Undo remove
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP. No image shows initials instead.</p>
          {markedForRemoval ? <p className="text-xs text-warning">The stored image will be removed when you save.</p> : null}
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </div>

      <Dialog open={removeConfirmOpen} onOpenChange={setRemoveConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this profile image?</DialogTitle>
            <DialogDescription>
              {pendingFile
                ? "This discards the image you just selected."
                : "The stored image will be removed when you save this record."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoveConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                onRemove();
                setRemoveConfirmOpen(false);
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
