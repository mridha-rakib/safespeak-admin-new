"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { IconMenu2, IconX } from "@tabler/icons-react";
import Link from "next/link";
import { useState } from "react";

import { SafeSpeakLogo } from "@/components/brand/safespeak-logo";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-secondary lg:hidden"
          aria-label="Open navigation menu"
        >
          <IconMenu2 size={22} />
        </button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[1px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 lg:hidden" />
        <DialogPrimitive.Content
          className="fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-xs flex-col overflow-y-auto bg-card px-4 py-6 shadow-panel data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left lg:hidden"
        >
          <DialogPrimitive.Title className="sr-only">Admin navigation</DialogPrimitive.Title>
          <div className="flex items-center justify-between px-2">
            <Link href="/dashboard" onClick={() => setOpen(false)}>
              <SafeSpeakLogo size="sm" />
            </Link>
            <DialogPrimitive.Close
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary"
              aria-label="Close navigation menu"
            >
              <IconX size={20} />
            </DialogPrimitive.Close>
          </div>
          <div className="mt-6">
            <SidebarNav onNavigate={() => setOpen(false)} />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
