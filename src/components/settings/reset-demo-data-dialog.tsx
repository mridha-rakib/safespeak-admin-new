"use client";

import { IconRefresh } from "@tabler/icons-react";
import { useState } from "react";

import { useAdminRepository } from "@/components/providers/repository-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert } from "@/components/ui/alert";

export function ResetDemoDataDialog() {
  const { repository } = useAdminRepository();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "working" | "done" | "error">("idle");

  async function handleConfirm() {
    if (!repository) return;
    setStatus("working");
    try {
      await repository.resetDemoData();
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setStatus("idle");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <IconRefresh size={16} aria-hidden="true" />
          Reset demo data
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset local demo data?</DialogTitle>
          <DialogDescription>
            This replaces every record marked as demo data in this browser with the original,
            deterministic demo dataset. It does not affect a production system — there is no backend
            connected to this admin app.
          </DialogDescription>
        </DialogHeader>

        {status === "done" ? (
          <Alert tone="success" title="Demo data reset">
            The local demo dataset has been restored to its starting state.
          </Alert>
        ) : status === "error" ? (
          <Alert tone="destructive" title="Reset failed" role="alert">
            Something went wrong resetting local demo data. Your existing data has not been changed.
          </Alert>
        ) : null}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {status === "done" ? "Close" : "Cancel"}
          </Button>
          {status !== "done" ? (
            <Button onClick={handleConfirm} disabled={status === "working"}>
              {status === "working" ? "Resetting…" : "Reset demo data"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
