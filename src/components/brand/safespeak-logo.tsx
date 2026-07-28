import Image from "next/image";

import { cn } from "@/lib/utils";

/**
 * Recreated from safespeak-frontend/src/components/ui/safe-speak-logo.tsx.
 * The wordmark markup and the "#0b5fa6" brand tone are reused verbatim; the
 * tick asset was copied to public/brand/tick-sign.svg (see README) since the
 * admin app must not import files from safespeak-frontend at runtime.
 */
type LogoVariant = "full" | "mark";
type LogoTone = "brand" | "light";
type LogoSize = "sm" | "md" | "lg";

const logoSizeMap: Record<LogoSize, { text: string; tick: number }> = {
  sm: { text: "text-[1.5rem]", tick: 20 },
  md: { text: "text-[1.75rem]", tick: 23 },
  lg: { text: "text-[2rem]", tick: 26 },
};

export function SafeSpeakLogo({
  variant = "full",
  tone = "brand",
  size = "md",
  className,
}: {
  variant?: LogoVariant;
  tone?: LogoTone;
  size?: LogoSize;
  className?: string;
}) {
  const { tick, text } = logoSizeMap[size];
  const toneClass = tone === "brand" ? "text-[#0b5fa6]" : "text-white";

  if (variant === "mark") {
    return (
      <Image
        src="/brand/tick-sign.svg"
        alt="SafeSpeak"
        width={tick}
        height={tick}
        className={cn("shrink-0", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "inline-flex flex-col font-extrabold leading-none tracking-normal",
        text,
        toneClass,
        className
      )}
    >
      <div className="flex items-start gap-0.5 leading-none">
        <span>Safe</span>
        <Image
          src="/brand/tick-sign.svg"
          alt=""
          width={tick}
          height={tick}
          className="shrink-0"
        />
      </div>
      <span className="leading-none">Speak</span>
    </div>
  );
}
