import type { ReactNode } from "react";

import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-background">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Sidebar />
      <div className="flex min-h-screen flex-col lg:pl-64">
        <Header />
        <main id="main-content" tabIndex={-1} className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
