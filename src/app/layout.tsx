import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { AdminShell } from "@/components/layout/admin-shell";
import { RepositoryProvider } from "@/components/providers/repository-provider";

import "./globals.css";

/** Reused from safespeak-frontend's dashboard shell font (src/components/dashboard/dashboard-layout.tsx). */
const pageFont = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-admin",
});

export const metadata: Metadata = {
  title: {
    default: "SafeSpeak Admin",
    template: "%s · SafeSpeak Admin",
  },
  description:
    "Local, browser-only admin dashboard for managing SafeSpeak content, taxonomy, and publishing.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={pageFont.variable}>
      <body className="font-sans">
        <RepositoryProvider>
          <AdminShell>{children}</AdminShell>
        </RepositoryProvider>
      </body>
    </html>
  );
}
