import { IconCheck } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export interface WizardStep {
  step: number;
  label: string;
}

export function WizardStepper({ steps, currentStep }: { steps: WizardStep[]; currentStep: number }) {
  return (
    <ol aria-label="Document steps" className="flex flex-wrap items-center gap-2 sm:gap-3">
      {steps.map(({ step, label }) => {
        const isCurrent = step === currentStep;
        const isComplete = step < currentStep;
        return (
          <li key={step} className="flex items-center gap-2">
            <span
              aria-current={isCurrent ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold",
                isCurrent
                  ? "border-primary bg-primary/10 text-primary"
                  : isComplete
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-border bg-secondary/40 text-muted-foreground"
              )}
            >
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[11px]",
                  isCurrent ? "bg-primary text-primary-foreground" : isComplete ? "bg-success text-success-foreground" : "bg-card"
                )}
              >
                {isComplete ? <IconCheck size={12} aria-hidden="true" /> : step}
              </span>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
