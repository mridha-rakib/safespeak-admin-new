import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <EmptyState
        title="Page not found"
        description="This admin page doesn't exist, or it moved. Head back to the dashboard to keep going."
        action={
          <Link href="/dashboard" className={buttonVariants()}>
            Back to Dashboard
          </Link>
        }
      />
    </div>
  );
}
