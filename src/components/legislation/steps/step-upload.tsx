"use client";

import { IconFileTypePdf, IconLoader2, IconUpload } from "@tabler/icons-react";
import { useId, useRef, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppSettings } from "@/hooks/use-app-settings";
import { createDocumentFromFile, replaceDocumentFile, type ExtractionOutcome } from "@/lib/legislation/document-extraction-service";
import type { DocumentRecord } from "@/lib/models/document";
import type { PdfExtractionProgress } from "@/lib/pdf/extract-pdf";
import { DEFAULT_PDF_MAX_BYTES, validatePdfFile } from "@/lib/pdf/validate-pdf-file";
import type { AdminContentRepository } from "@/lib/repositories/admin-content-repository";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StepUpload({
  repository,
  actor,
  mode,
  document,
  onCreated,
  onReplaced,
}: {
  repository: AdminContentRepository | null;
  actor: string;
  mode: "create" | "edit";
  document?: DocumentRecord | null;
  onCreated?: (outcome: ExtractionOutcome) => void;
  onReplaced?: (outcome: ExtractionOutcome) => void;
}) {
  const settings = useAppSettings();
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<"idle" | "extracting" | "done" | "error">("idle");
  const [progress, setProgress] = useState<PdfExtractionProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [confirmReplaceOpen, setConfirmReplaceOpen] = useState(false);
  const [pendingReplaceFile, setPendingReplaceFile] = useState<File | null>(null);

  const maxBytes = settings?.pdfMaxFileSizeBytes ?? DEFAULT_PDF_MAX_BYTES;
  const maxMb = Math.round(maxBytes / (1024 * 1024));

  async function runCreate(file: File) {
    if (!repository) return;
    const validation = validatePdfFile(file, maxBytes);
    if (!validation.valid) {
      setStage("error");
      setMessage(validation.reason ?? "This file can't be used.");
      return;
    }

    setStage("extracting");
    setMessage(null);
    setProgress({ pagesProcessed: 0, totalPages: 0 });

    const outcome = await createDocumentFromFile(
      repository,
      { file, metadata: { title: file.name.replace(/\.pdf$/i, "") }, actor },
      (p) => setProgress(p)
    );

    if (outcome.success) {
      setStage("done");
      setMessage("Local text preview ready. Not indexed in a production RAG system.");
    } else {
      setStage("error");
      setMessage(outcome.error ?? "Extraction failed.");
    }
    onCreated?.(outcome);
  }

  async function runReplace(file: File) {
    if (!repository || !document) return;
    const validation = validatePdfFile(file, maxBytes);
    if (!validation.valid) {
      setStage("error");
      setMessage(validation.reason ?? "This file can't be used.");
      return;
    }

    setStage("extracting");
    setMessage(null);
    setProgress({ pagesProcessed: 0, totalPages: 0 });

    const outcome = await replaceDocumentFile(repository, document.id, file, actor, (p) => setProgress(p));

    if (outcome.success) {
      setStage("done");
      setMessage("The file was replaced and local text/chunks were regenerated.");
    } else {
      setStage("error");
      setMessage(`${outcome.error ?? "Extraction failed."} The previous file and local chunks were kept.`);
    }
    onReplaced?.(outcome);
  }

  function handleFileSelected(file: File) {
    if (mode === "create") {
      void runCreate(file);
    } else {
      setPendingReplaceFile(file);
      setConfirmReplaceOpen(true);
    }
  }

  const isBusy = stage === "extracting";

  return (
    <div className="space-y-4">
      {mode === "edit" && document?.file ? (
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <IconFileTypePdf size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">{document.file.fileName}</p>
            <p className="text-xs text-muted-foreground">
              {formatBytes(document.file.fileSizeBytes)}
              {document.file.pageCount ? ` · ${document.file.pageCount} pages` : ""}
            </p>
          </div>
        </div>
      ) : null}

      <Alert tone="info" title="Local text preview only">
        Uploading extracts text and generates a local chunk preview in your browser. It does not create
        embeddings, does not call a server, and is not production RAG indexing.
      </Alert>

      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragOver(false);
          const file = event.dataTransfer.files?.[0];
          if (file) handleFileSelected(file);
        }}
        className={`rounded-xl border-2 border-dashed p-8 text-center transition ${
          isDragOver ? "border-primary bg-primary/5" : "border-border bg-secondary/20"
        }`}
      >
        <IconUpload size={28} className="mx-auto text-muted-foreground" aria-hidden="true" />
        <p className="mt-2 text-sm font-medium text-foreground">Drag and drop a PDF here, or choose a file</p>
        <p className="text-xs text-muted-foreground">PDF only, up to {maxMb}MB.</p>

        <label htmlFor={inputId} className="sr-only">
          Choose a PDF file
        </label>
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          accept="application/pdf,.pdf"
          disabled={isBusy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFileSelected(file);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }}
          className="sr-only"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-4"
          disabled={isBusy}
          onClick={() => fileInputRef.current?.click()}
        >
          {mode === "edit" ? "Choose replacement PDF" : "Choose PDF file"}
        </Button>
      </div>

      {stage === "extracting" ? (
        <div role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted-foreground">
          <IconLoader2 size={16} className="animate-spin" aria-hidden="true" />
          <span>
            Extracting text locally
            {progress && progress.totalPages > 0 ? ` — page ${progress.pagesProcessed} of ${progress.totalPages}` : "…"}
          </span>
        </div>
      ) : null}

      {stage === "done" && message ? (
        <Alert tone="success" title="Local preview ready">
          {message}
        </Alert>
      ) : null}
      {stage === "error" && message ? (
        <Alert tone="destructive" title="This file could not be locally processed" role="alert">
          {message}
        </Alert>
      ) : null}

      <Dialog open={confirmReplaceOpen} onOpenChange={setConfirmReplaceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Replace the current PDF?</DialogTitle>
            <DialogDescription>
              This will extract text from the new file and, once that succeeds, replace the current local
              text preview and local chunks. Metadata you have entered is preserved. If the new file fails
              to extract, the current file and chunks are kept unchanged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmReplaceOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmReplaceOpen(false);
                if (pendingReplaceFile) void runReplace(pendingReplaceFile);
              }}
            >
              Replace file
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
