import * as React from "react";

import { cn } from "@/lib/utils";

type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "success";
type ButtonSize = "default" | "sm" | "lg" | "icon";

const variantStyles: Record<ButtonVariant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-safe-blue-dark",
  secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
  outline: "border border-border bg-card text-foreground hover:bg-secondary",
  ghost: "bg-transparent text-foreground hover:bg-secondary",
  destructive: "bg-destructive text-destructive-foreground hover:opacity-90",
  success: "bg-success text-success-foreground hover:opacity-90",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "h-10 px-4 py-2 text-sm",
  sm: "h-8 px-3 py-1.5 text-xs",
  lg: "h-11 px-6 py-2.5 text-sm",
  icon: "h-10 w-10",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

/** Exported so link-based "buttons" (e.g. `<Link className={buttonVariants(...)}>`) stay visually identical without nesting an <a> inside a <button>. */
function buttonVariants({
  variant = "default",
  size = "default",
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:pointer-events-none disabled:opacity-50",
    variantStyles[variant],
    sizeStyles[size],
    className
  );
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "default", size = "default", type = "button", ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={buttonVariants({ variant, size, className })}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

export { Button, buttonVariants };
export type { ButtonVariant, ButtonSize };
