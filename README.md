# SafeSpeak Admin

A standalone, local-first admin dashboard for managing SafeSpeak content, taxonomy, and publishing. It is a **separate Next.js application** from `safespeak-frontend` — it does not import from it at runtime, does not share a build, and does not depend on any backend.

> **Phase 1 foundation.** This app implements the admin shell, navigation, local data architecture, and a working proof of the PDF-preview and content-bundle-export pipelines. Full create/edit/delete workflows for each content module are a later phase — see [Phase boundary](#phase-boundary).

## Contents

- [Installation](#installation)
- [Commands](#commands)
- [Standalone repository structure](#standalone-repository-structure)
- [Design system relationship to safespeak-frontend](#design-system-relationship-to-safespeak-frontend)
- [Local data architecture](#local-data-architecture)
- [IndexedDB limitations](#indexeddb-limitations)
- [Local PDF extraction — why this is not production RAG indexing](#local-pdf-extraction--why-this-is-not-production-rag-indexing)
- [Content bundle export](#content-bundle-export)
- [Demo data and reset](#demo-data-and-reset)
- [No authentication, no backend](#no-authentication-no-backend)
- [Future migration path](#future-migration-path)
- [Advocates/Counsellors verification and publication policy](#advocatescounsellors-verification-and-publication-policy)
- [Phase boundary](#phase-boundary)

## Installation

Requires Node.js 20+ and [pnpm](https://pnpm.io) (the same package manager `safespeak-frontend` uses).

```bash
pnpm install
```

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the dev server at `http://localhost:3100` |
| `pnpm build` | Production build |
| `pnpm start` | Serve the production build (port 3100) |
| `pnpm lint` | `next lint` (ESLint, same rule set family as `safespeak-frontend`) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Unit tests (`node:test`, run through `tsx`) |
| `pnpm test:e2e` | Playwright end-to-end tests (spins up its own dev server on port 3199) |

## Standalone repository structure

```
safespeak-admin/
├── public/
│   ├── brand/                 # tick-sign.svg copied from safespeak-frontend
│   └── pdfjs/standard_fonts/  # pdfjs-dist standard font metrics, served statically
├── src/
│   ├── app/                   # Next.js App Router routes (see Navigation below)
│   ├── components/
│   │   ├── brand/             # SafeSpeakLogo
│   │   ├── dashboard/         # Dashboard-specific widgets (StatCard)
│   │   ├── layout/            # AdminShell, Sidebar, Header, MobileNav, Breadcrumbs, ModuleFoundationPage
│   │   ├── pdf/                # PdfUploadPanel
│   │   ├── providers/         # RepositoryProvider (Dexie repository context)
│   │   ├── settings/          # ResetDemoDataDialog, ExportBundlePanel
│   │   └── ui/                 # Button, Card, Badge, Input, Dialog, Tabs, Avatar, Alert, EmptyState, Skeleton, StatusBadge
│   ├── hooks/                  # useAdminRepository-backed data hooks (live-query via dexie-react-hooks)
│   └── lib/
│       ├── bundle/              # Content-bundle manifest, JSON/ZIP serializers, download helper
│       ├── db/                  # Dexie schema, seed data, persisted-data validation
│       ├── models/              # Zod schemas + TS types, one file per content domain
│       ├── pdf/                  # PDF validation, text extraction, deterministic chunking
│       ├── publishing/           # Status-transition graph and domain-specific publish guards
│       ├── repositories/         # AdminContentRepository interface + IndexedDB implementation
│       ├── contact-capabilities.ts
│       ├── navigation.ts         # Single source of truth for sidebar/mobile nav/breadcrumbs
│       └── utils.ts
├── tests/
│   ├── unit/                    # node:test — pure logic, schemas, seed data, bundle export
│   └── e2e/                     # Playwright — shell, navigation, tables, PDF upload, settings
├── package.json / pnpm-lock.yaml
├── next.config.mjs / tailwind.config.ts / tsconfig.json / .eslintrc.json
└── .env.example
```

It is independently installable, runnable, testable, and buildable, and is ready to become its own Git repository.

## Design system relationship to safespeak-frontend

`safespeak-frontend` was audited first (Next.js 15.5 / React 19.2 App Router, TypeScript 5.9 strict, Tailwind CSS 3.4 with a shadcn "new-york" CSS-variable token set, `@tabler/icons-react` as the dominant icon library, a `Plus_Jakarta_Sans` dashboard font, and a `SafeSpeakLogo` component backed by `tickSign.svg`). safespeak-admin reuses that identity rather than inventing a new one:

- **Logo** — `SafeSpeakLogo` is recreated (not imported) in `src/components/brand/safespeak-logo.tsx`, with `tickSign.svg` copied to `public/brand/tick-sign.svg`.
- **Brand colour** — the frontend's brand blue (`#0b5fa6` on the logo, `#01579b` design token) is used as `--primary`.
- **Font** — `Plus_Jakarta_Sans`, the font `safespeak-frontend`'s own dashboard shell uses (`src/components/dashboard/dashboard-layout.tsx`), loaded via `next/font/google`.
- **Radius / shadow / focus** — shadcn's `--radius: 0.5rem` token convention is reused; the frontend's `*:focus-visible` outline pattern is reused (recoloured to the admin's `--ring` token).
- **Primitives** — Button/Card/Badge/Input are recreated using the same shape language (pill buttons, `rounded-xl` cards) but driven by CSS-variable tokens rather than the frontend's hard-coded hex utility classes, since the frontend's own tokens (`--primary`, `--destructive`, etc.) were defined but never actually wired into those components.
- **New primitives** (Dialog, Tabs, Avatar, DataTable) — `safespeak-frontend` has no table, tabs, dialog, or drawer component to reuse (its `components.json` only ever generated `avatar`, `badge`, `button`, `card`, `input`). These are built for the admin app using Radix UI primitives (`@radix-ui/react-dialog`, `-tabs`, `-avatar`), the same unstyled/accessible primitive vendor the frontend already depends on for its own `Avatar`, styled with the shared token set.
- **Deliberately not reused**: NextUI, Framer Motion/`motion`, `@react-three/*`, Leaflet, and the frontend's Quick Exit / covert-mode safety experience. Those exist to protect a survivor using the public-facing app; they have no meaning for a single trusted administrator and would only add confusion and bundle weight here.

**No runtime dependency on `safespeak-frontend` exists** — nothing in `safespeak-admin/src` imports a path under `../safespeak-frontend`.

## Local data architecture

All content lives in the browser's IndexedDB, accessed through [Dexie](https://dexie.org). See `src/lib/db/db.ts` for the versioned schema (`DB_SCHEMA_VERSION`).

- Every managed record shares base fields (`id`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `isDemo`, `status`, `version`) defined once in `src/lib/models/base.ts`.
- Every domain has its own typed Dexie table (`documents`, `documentChunks`, `microcards`, `rightsContent`, `supportOrganisations`, `supportProfessionals`, `reportingDestinations`, `incidentTypes`, `triageLabels`, `resourceCategories`, `matchingRules`, `auditEvents`, `appSettings`, `contentBundleHistory`) — there is no single untyped generic table.
- **Boolean fields are never indexed** (`isDemo`, `verified`, `active`, ...) — IndexedDB does not accept `boolean` as a valid key type. Those fields are filtered in application code after `.toArray()`.
- Pages and components never call Dexie directly. They go through `AdminContentRepository` (`src/lib/repositories/admin-content-repository.ts`), implemented today by `IndexedDbAdminContentRepository`. A future API-backed implementation of the same interface can replace it without touching UI code — see [Future migration path](#future-migration-path).
- Every record read back from IndexedDB is validated with its Zod schema (`src/lib/db/validation.ts`). An invalid record is dropped from the result set (never crashes the app, never discards every other record); detailed validation errors are logged to the dev console only and never shown as a raw stack trace in the UI. `RepositoryProvider` surfaces a plain-language recovery notice if seeding hits a validation failure.
- To add a schema change: add a new `.version(n + 1).stores({...})` block in `db.ts` with an `.upgrade()` callback if data needs transforming. Never edit an existing `.version()` block in place.

## IndexedDB limitations

- Data is **per-browser, per-origin, per-device**. It is not synced, not backed up, and is not visible from a different browser or machine.
- Clearing site data, using a private/incognito window, or using a different browser will make this data appear to have disappeared.
- There is no multi-user concurrency story — this phase assumes exactly one local administrator.

## Local PDF extraction — why this is not production RAG indexing

`src/lib/pdf/extract-pdf.ts` uses `pdfjs-dist` **entirely in the browser** to:

1. Validate the selected file is a reasonably-sized PDF (`src/lib/pdf/validate-pdf-file.ts`).
2. Extract text per page, yielding to the main thread between pages so a large document doesn't freeze the UI.
3. Generate a short local text preview and a deterministic set of local chunk-preview records (`src/lib/pdf/chunk-text.ts` — same input always produces the same chunk boundaries).
4. Store the PDF blob and chunk-preview records in IndexedDB (`documents.fileBlob`, the `documentChunks` table).

**Exact wording used to distinguish this from production RAG:** the UI only ever says *"Local text preview"*, *"Local chunk preview"*, *"Ready for AI processing"*, and *"Not indexed in a production RAG system"*. It never says "Embedded successfully," "Added to production vector database," "Live in AI knowledge," or "Production indexing complete" — those phrases do not appear anywhere in this codebase. Nothing in this pipeline calls a server, computes embeddings, or writes to a vector store.

Failure modes are handled explicitly (`PdfExtractionError` with a `kind` of `encrypted`, `corrupted`, or `empty`), and a document that fails shows up on the **Processing issues** tab with a plain-language reason instead of silently disappearing.

## Content bundle export

`src/lib/bundle/export-bundle.ts` builds a versioned, JSON-serializable snapshot of local content (`BUNDLE_SCHEMA_VERSION`, currently `1.0.0`):

- A **manifest** (schema version, bundle version/timestamp, source application, record counts, a SHA-256 checksum per domain file, and any export warnings).
- One array per approved domain (`legislation`, `documentChunks`, `microcards`, `rightsContent`, `supportOrganisations`, `supportProfessionals`, `reportingDestinations`, `incidentTypes`, `triageLabels`, `resourceCategories`, `matchingRules`).
- Every record is re-validated against its Zod schema before export; a record that fails validation is **excluded with a warning**, not silently dropped and not allowed to block the rest of the export.
- Blob fields (`fileBlob`, profile photos) are never present in the JSON — they're stripped automatically because they aren't part of the Zod schema `.parse()` output.
- **JSON export** excludes uploaded PDF files. **ZIP export** (`src/lib/bundle/export-bundle-zip.ts`, via `jszip`) adds a `manifest.json`, one `data/<domain>.json` per domain, and a `documents/` folder with the raw PDF bytes for any document that has one.
- The download itself uses a transient `URL.createObjectURL` purely to trigger the browser's save dialog (`src/lib/bundle/download-bundle.ts`) — that object URL is never written into the exported content.
- **This does not update `safespeak-frontend` automatically.** Exporting only produces a file on your computer; building the frontend's import/consumption step is explicitly a later phase, and the Settings page says so.

A minimal export panel lives on the **Settings** page and is exercised by `tests/e2e/settings.spec.ts` and `tests/unit/export-bundle.test.ts`.

## Demo data and reset

- Seed data (`src/lib/db/seed.ts`) is small, clearly fictional, and every record carries `isDemo: true`.
- Contact details use `example.org` (reserved for documentation by RFC 2606) and placeholder `0000 000 0XX` phone numbers — nothing is a real phone number, booking link, registration number, or legal claim. Demo legislation is explicitly not presented as legal advice.
- All seed data is parsed through its Zod schema at module load (`schema.parse(...)`), so a malformed seed record fails fast in development rather than being silently stored.
- Seed ids are **fixed strings**, not randomly generated, so **Settings → Reset demo data** is deterministic: it deletes every `isDemo: true` record (not the whole database — a future phase may have real, non-demo content alongside it) and re-inserts the same seed set, then records a `demo_data_reset` audit event.
- Reset requires a confirmation dialog that explains what will be replaced, and reports success/failure back to the user.

## No authentication, no backend

- There is no login screen and no fake authentication of any kind. The app assumes a single local administrator, and audit metadata (`createdBy`/`updatedBy`/`actor`) is attributed to `LOCAL_ADMIN_ACTOR`.
- No API route, remote database, or backend of any kind is created or simulated. `.env.example` documents this — there is nothing to configure today.
- The `AdminContentRepository` interface exists specifically so this limitation is temporary by design, not baked into the UI layer.

## Future migration path

Because every page/component talks to `AdminContentRepository` rather than Dexie directly, introducing a real backend later means:

1. Write `ApiAdminContentRepository implements AdminContentRepository` (or per-domain equivalents) alongside `IndexedDbAdminContentRepository`.
2. Swap which implementation `RepositoryProvider` constructs (e.g. behind a feature flag, or per-domain during a phased migration).
3. UI code, hooks, and the content-bundle export logic do not need to change, because they only depend on the interface's method signatures — none of it imports Dexie.

## Advocates/Counsellors verification and publication policy

- **A profile may be published while unverified.** Publication and verification are independent — a published-but-unverified profile can later appear in AI recommendations and the user Explorer, but it must carry a visible **"Not verified"** warning at all times (`src/components/ui/status-badge.tsx` → `VerificationBadge`), communicated through icon **and** text, never colour alone.
- A profile never silently inherits a "verified" status from its organisation — `verificationStatus` lives on the professional record itself.
- Verification status round-trips unchanged through content-bundle export.
- Contact actions (`src/lib/contact-capabilities.ts`) are derived only from fields that are actually populated — a missing phone/email/booking link/website never produces a fake or misleadingly-enabled contact button. No automatic contact, incident-data transmission, referral confirmation, or booking simulation happens anywhere in this phase.

## Phase boundary

**Implemented in Phase 1:** project/brand foundation, admin shell and full navigation (every destination is a real route), Dexie database + repository interface, Zod schemas for every content domain, demo seed data + deterministic reset, a reusable TanStack Table foundation (used by Recent Activity, Audit History, Review Queue, and the Knowledge & Legislation document list), a working local PDF text/chunk preview, a working JSON/ZIP content-bundle export, and the Settings foundation.

**Deliberately not implemented (later phases):** create/edit/delete screens for Knowledge & Legislation, Microcards, Rights & Legal Information, Support Organisations, Advocates & Counsellors, Reporting Destinations, Incident Types, Triage Labels, Resource Categories, or Matching Rules; a matching-rule builder or matching engine; real authentication/roles; a backend of any kind; production RAG/embeddings/retrieval; and frontend consumption of the exported content bundle. Every module without a full workflow shows an honest "foundation in place, full management coming in a later phase" state (`ModuleFoundationPage`) instead of a fake completed feature.
