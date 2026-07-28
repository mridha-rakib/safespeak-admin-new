"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[safespeak-admin] Unhandled page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        title="Something went wrong"
        description="This page hit an unexpected error. Your local data has not been affected. You can try again, or go back to the dashboard."
        action={
          <Button onClick={reset} variant="outline">
            Try again
          </Button>
        }
      />
    </div>
  );
}
