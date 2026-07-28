import * as React from "react";

import { cn } from "@/lib/utils";

type BadgeTone = "neutral" | "primary" | "success" | "warning" | "destructive";

const toneStyles: Record<BadgeTone, string> = {
  neutral: "border-border bg-secondary text-secondary-foreground",
  primary: "border-transparent bg-primary/10 text-primary",
  success: "border-transparent bg-success/10 text-success",
  warning: "border-transparent bg-warning/15 text-warning",
  destructive: "border-transparent bg-destructive/10 text-destructive",
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

function Badge({ className, tone = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        toneStyles[tone],
        className
      )}
      {...props}
    />
  );
}

export { Badge };
export type { BadgeTone };
