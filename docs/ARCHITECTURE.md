# Architecture

Technical reference for how safespeak-admin is put together. For setup/commands and the product-level "why," see the root [README](../README.md).

## Layering

```
app/ (routes)
  -> hooks/ (useLiveQuery-backed data hooks)
    -> components/providers/repository-provider.tsx (React context)
      -> lib/repositories/admin-content-repository.ts (interface)
        -> lib/repositories/indexeddb-admin-content-repository.ts (implementation)
          -> lib/db/db.ts (Dexie schema)
            -> lib/models/*.ts (Zod schema + TS type per domain)
```

Rule: **page and component code never imports `lib/db/db.ts` or Dexie directly.** It goes through a hook, which goes through the repository interface. This is what makes `lib/repositories/indexeddb-admin-content-repository.ts` swappable later.

## Dexie schema (`DB_SCHEMA_VERSION = 1`)

| Table | Indexed fields | Notes |
| --- | --- | --- |
| `documents` | `id, status, sourceType, processingStatus, createdAt, updatedAt` | May carry a `fileBlob` (raw PDF bytes), written outside the Zod-validated path — see below. |
| `documentChunks` | `id, documentId, chunkIndex, createdAt` | Local chunk-preview records, see `lib/pdf/chunk-text.ts`. |
| `microcards` | `id, status, topic, createdAt, updatedAt` | |
| `rightsContent` | `id, status, jurisdiction, createdAt, updatedAt` | |
| `supportOrganisations` | `id, status, createdAt, updatedAt` | |
| `supportProfessionals` | `id, status, professionalType, verificationStatus, createdAt, updatedAt` | |
| `reportingDestinations` | `id, status, jurisdiction, createdAt, updatedAt` | |
| `incidentTypes` | `id, name, createdAt` | |
| `triageLabels` | `id, urgencyLevel, createdAt` | |
| `resourceCategories` | `id, parentCategoryId, createdAt` | |
| `matchingRules` | `id, incidentTypeId, createdAt` | Data contract + demo records only — no rule-builder UI. |
| `auditEvents` | `id, entityType, entityId, action, timestamp` | Append-only. |
| `appSettings` | `id` | Single row, `id: "app-settings"`. |
| `contentBundleHistory` | `id, generatedAt` | One row per completed export. |

**Boolean fields (`isDemo`, `verified`, `active`, ...) are never indexed.** IndexedDB does not accept `boolean` as an index key type — attempting to index one throws at the browser level. Where a query needs to filter on a boolean, the repository loads with `.toArray()` (or an indexed prefilter on another field) and filters in JS. Given the seeded/demo dataset sizes involved (tens of records per table), this has no meaningful performance cost.

**Migrating the schema:** add a new `.version(N).stores({...})` block to `AdminDatabase` in `lib/db/db.ts`; do not edit an existing version block. Dexie applies versions in order and runs any `.upgrade()` callback attached to the new version against existing data.

## Repository interface

`AdminContentRepository` (`lib/repositories/admin-content-repository.ts`) exposes:

- One `CrudRepository<T>` (`list/get/create/update/remove`) per content domain.
- `documents` additionally exposes `setFileBlob`/`getFileBlob` — **outside** the Zod-validated `create`/`update` path, because `Blob` is not JSON-serializable and therefore not part of the persisted-data contract used for bundle export. Writing it through `documentSchema.parse()` would silently strip it.
- `documentChunks.listForDocument` / `replaceForDocument`.
- `auditEvents.list` / `append` (append-only; there is no `update`/`remove`).
- `settings.get` / `update` (lazily creates the single settings row on first read).
- `bundleHistory.list` / `append`.
- `getDashboardSummary()` — aggregates counts across domains for the Dashboard page.
- `ensureSeeded()` — idempotent; seeds demo data once, no-ops afterward.
- `resetDemoData()` — deletes every `isDemo: true` row per table, then re-seeds, then records an audit event.

`createCrudRepository<T>()` (private to `indexeddb-admin-content-repository.ts`) implements the generic CRUD boundary once and is reused for every domain rather than hand-writing ten near-identical repositories.

## Validation boundary

Every record that crosses the IndexedDB boundary — read from storage, seeded, or exported into a bundle — passes through its domain's Zod schema:

- **Read path** (`lib/db/validation.ts`): `filterValidRecords` drops individually-invalid rows and returns the rest; `parseStoredRecord` is the single-record version. In development, dropped records log their Zod issues to the console (`console.warn`); production never surfaces a raw stack trace.
- **Seed path** (`lib/db/seed.ts`): every seed array is `.map(schema.parse)`'d at module load, so a malformed literal fails immediately during development rather than being silently stored.
- **Export path** (`lib/bundle/export-bundle.ts`): `validateDomain()` re-validates every record before inclusion; failures are excluded with a warning appended to the manifest rather than aborting the whole export.

## Publishing workflow

`lib/publishing/workflow.ts` defines one status graph shared by every domain:

```
draft ──────────────► ready_for_review ──────────────► published
  │                        │  ▲                            │
  └────────► archived ◄────┘  └──────── needs_update ◄──────┘
                 │                           │
                 └──────────► draft ◄────────┘
```

`canTransitionStatus(from, to, guard?)` checks the graph first, then runs an optional domain-specific `guard`. Two guards exist today:

- `legislationPublishGuard(legalReviewComplete)` — blocks `-> published` unless legal/governance review is complete.
- `supportProfessionalPublishGuard()` — always allows `-> published`; verification is a separate axis (see README's verification policy section) and is never used to gate publication.

There is deliberately **no single universal publish rule** — each domain supplies its own guard function.

## PDF pipeline

`lib/pdf/validate-pdf-file.ts` → `lib/pdf/extract-pdf.ts` → `lib/pdf/chunk-text.ts`, orchestrated by `components/pdf/pdf-upload-panel.tsx`:

1. **Validate**: type/extension + size against `AppSettings.pdfMaxFileSizeBytes`.
2. **Extract**: `pdfjs-dist`, loaded dynamically in the browser, with its worker resolved via `new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)` (bundler-resolved static asset) and `standardFontDataUrl: "/pdfjs/standard_fonts/"` pointing at a copy of `pdfjs-dist`'s standard font metrics under `public/pdfjs/standard_fonts/` (copied at setup time — without it, text using a PDF's built-in/non-embedded base fonts can extract incorrectly). Extraction yields to the main thread between pages via `requestIdleCallback`/`setTimeout` so large documents don't freeze the UI.
3. **Chunk**: `chunkExtractedPages()` concatenates page text in order and splits once a running chunk crosses ~900 characters — deterministic (same input → same chunk boundaries), verified by `tests/unit/chunk-text.test.ts`.
4. Failures (`PdfExtractionError`, kind `encrypted | corrupted | empty`) update the document's `processingStatus`/`extractionStatus`/`processingIssue` instead of throwing past the UI — the **Processing issues** tab reads directly off those fields.

## Content bundle format

See the README's [Content bundle export](../README.md#content-bundle-export) section for the full manifest shape and JSON-vs-ZIP distinction. Checksums are SHA-256 over each domain's `JSON.stringify`'d array, computed via `crypto.subtle.digest` (available in both the browser and Node's `node:test` runner, which is what `tests/unit/export-bundle.test.ts` exercises without a browser).

## Navigation as data

`lib/navigation.ts` is the single source of truth for the sidebar, the mobile drawer, and breadcrumbs (`components/layout/sidebar-nav.tsx`, `mobile-nav.tsx`, `breadcrumbs.tsx` all read `NAV_SECTIONS`). `tests/unit/navigation.test.ts` asserts every required destination is present with a unique href, and `tests/e2e/shell-navigation.spec.ts` asserts every one of those hrefs actually resolves to a page with the expected `<h1>` — so a route can't silently go missing from one surface without both suites catching it.
