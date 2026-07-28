import { IconAlertTriangle, IconCircleCheck, IconInfoCircle } from "@tabler/icons-react";
import * as React from "react";

import { cn } from "@/lib/utils";

type AlertTone = "info" | "success" | "warning" | "destructive";

const toneStyles: Record<AlertTone, string> = {
  info: "border-primary/20 bg-primary/5 text-foreground",
  success: "border-success/20 bg-success/5 text-foreground",
  warning: "border-warning/25 bg-warning/10 text-foreground",
  destructive: "border-destructive/25 bg-destructive/10 text-foreground",
};

const toneIcon: Record<AlertTone, React.ReactNode> = {
  info: <IconInfoCircle size={18} className="text-primary" aria-hidden="true" />,
  success: <IconCircleCheck size={18} className="text-success" aria-hidden="true" />,
  warning: <IconAlertTriangle size={18} className="text-warning" aria-hidden="true" />,
  destructive: <IconAlertTriangle size={18} className="text-destructive" aria-hidden="true" />,
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  role = "status",
}: {
  tone?: AlertTone;
  title: string;
  children?: React.ReactNode;
  className?: string;
  role?: "status" | "alert";
}) {
  return (
    <div
      role={role}
      className={cn("flex items-start gap-3 rounded-xl border p-4 text-sm", toneStyles[tone], className)}
    >
      <span className="mt-0.5 shrink-0">{toneIcon[tone]}</span>
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        {children ? <div className="text-muted-foreground">{children}</div> : null}
      </div>
    </div>
  );
}
