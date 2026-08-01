# SafeSpeak Admin

A standalone, local-first admin dashboard for managing SafeSpeak content, taxonomy, and publishing. It is a **separate Next.js application** from `safespeak-frontend` — it does not import from it at runtime, does not share a build, and does not depend on any backend.

> **Phase 5: Support Organisations, Advocates & Counsellors, and Reporting Destinations are complete end to end**, alongside Phase 2's Knowledge & Legislation, Phase 3's taxonomy, and Phase 4's Microcards/Rights & Legal Information. Only Matching Rules remains a Phase 1 foundation — data model, repository, demo data, and an honest "coming in a later phase" placeholder screen, no rule-builder UI. See [Phase boundary](#phase-boundary).

## Contents

- [Installation](#installation)
- [Commands](#commands)
- [Standalone repository structure](#standalone-repository-structure)
- [Design system relationship to safespeak-frontend](#design-system-relationship-to-safespeak-frontend)
- [Local data architecture](#local-data-architecture)
- [IndexedDB limitations](#indexeddb-limitations)
- [Knowledge & Legislation](#knowledge--legislation)
- [Taxonomy: Incident Types, Triage Labels, Resource Categories](#taxonomy-incident-types-triage-labels-resource-categories)
- [Microcards and Rights & Legal Information](#microcards-and-rights--legal-information)
- [Support Directory: Support Organisations, Advocates & Counsellors, Reporting Destinations](#support-directory-support-organisations-advocates--counsellors-reporting-destinations)
- [Content bundle export: Published Content Bundle vs Admin Backup](#content-bundle-export-published-content-bundle-vs-admin-backup)
- [Demo data and reset](#demo-data-and-reset)
- [No authentication, no backend](#no-authentication-no-backend)
- [Future migration path](#future-migration-path)
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
| `pnpm test:e2e` | `scripts/e2e-runner.mjs` — builds, starts a **production** server on port 3199, runs the full Playwright suite, tears the server down (even on failure/interrupt), then exits with Playwright's real exit code |
| `pnpm test:e2e:clean` | Same, with `--force-clean` to clear a stale lock file left by a crashed previous run |
| `pnpm test:e2e:knowledge` / `:taxonomy` / `:shell` / `:content` / `:support-directory` | The runner scoped to one area's spec files (Knowledge & Legislation; taxonomy; shell/dashboard/settings/audit; Microcards + Rights & Legal Information; Support Organisations + Advocates & Counsellors + Reporting Destinations) |

**Why `test:e2e` builds first instead of using `next dev`:** dev mode compiles each route on first visit (several seconds per route), which made navigation assertions flaky. `playwright.config.ts` has **no** `webServer` block — `scripts/e2e-runner.mjs` owns the whole lifecycle itself (build → start `next start --port 3199` → poll for readiness → run Playwright → always tear the server down in a `finally`, including on SIGINT/SIGTERM). It also acquires a lock file (`.e2e-run.lock`, auto-reclaimed if the previous holder's process is confirmed dead) so two runs can't stomp on the same port, and only ever kills a process on port 3199 if its command line actually matches this project. Run `pnpm test:e2e` (or one of the scoped variants above), not `npx playwright test` directly — that would skip the build-and-serve step entirely and fail with a connection error.

## Standalone repository structure

```
safespeak-admin/
├── public/
│   ├── brand/                 # tick-sign.svg copied from safespeak-frontend
│   └── pdfjs/standard_fonts/  # pdfjs-dist standard font metrics, served statically
├── src/
│   ├── app/
│   │   ├── content/knowledge-legislation/
│   │   │   ├── page.tsx                  # Documents | RAG readiness
│   │   │   ├── new/page.tsx              # create wizard
│   │   │   └── [documentId]/
│   │   │       ├── page.tsx              # detail view
│   │   │       └── edit/page.tsx         # edit wizard (same component, populated)
│   │   ├── taxonomy/
│   │   │   ├── incident-types/           # list / new / [incidentTypeId] / [incidentTypeId]/edit
│   │   │   ├── triage-labels/            # same 4-route shape
│   │   │   └── resource-categories/      # same 4-route shape
│   │   ├── content/microcards/           # list / new / [microcardId] / [microcardId]/edit
│   │   └── content/rights-legal-information/  # same 4-route shape (no reorder mode)
│   ├── components/
│   │   ├── brand/             # SafeSpeakLogo
│   │   ├── content/           # PublishableStatusActions / PublishableRowActions — shared by Microcards + Rights & Legal Information
│   │   ├── dashboard/         # Dashboard-specific widgets (StatCard)
│   │   ├── layout/            # AdminShell, Sidebar, Header, MobileNav, Breadcrumbs, ModuleFoundationPage
│   │   ├── legislation/       # Knowledge & Legislation UI — wizard, steps, list/detail, tabs (see below)
│   │   ├── taxonomy/           # Shared list/form/detail building blocks + one subfolder per entity (columns, form) — see below
│   │   ├── microcards/         # columns, form, preview, reorder-panel adapter
│   │   ├── rights-content/     # columns, form, preview
│   │   ├── providers/         # RepositoryProvider (Dexie repository context)
│   │   ├── settings/          # ResetDemoDataDialog, ExportBundlePanel
│   │   └── ui/                # Button, Card, Badge, Input, Dialog, Tabs, DropdownMenu, Avatar, Alert, EmptyState, Skeleton, StatusBadge
│   ├── hooks/                 # useAdminRepository-backed data hooks (live-query via dexie-react-hooks)
│   └── lib/
│       ├── bundle/            # Content-bundle manifest, JSON/ZIP serializers, download helper
│       ├── content/            # review-due.ts, relationship-ids.ts — shared by Microcards + Rights & Legal Information
│       ├── db/                # Dexie schema, seed data, persisted-data validation
│       ├── legislation/       # Domain logic: readiness/eligibility, retrieval scoring, filters, export transform,
│       │                      # extraction orchestration, form schema — see "Knowledge & Legislation" below
│       ├── taxonomy/           # machine-key rules, validation, dependency/usage/dangling-reference service,
│       │                      # per-entity eligibility blockers, export transform, list filters — see below
│       ├── microcards/         # eligibility.ts, export-transform.ts
│       ├── rights-content/     # eligibility.ts, export-transform.ts
│       ├── models/            # Zod schemas + TS types, one file per content domain (incl. content-common.ts, microcard-cta.ts)
│       ├── pdf/                # PDF validation, text extraction, deterministic chunking
│       ├── publishing/         # Status-transition graph and domain-specific publish guards
│       ├── repositories/       # AdminContentRepository interface + IndexedDB implementation + typed errors
│       ├── contact-capabilities.ts
│       ├── jurisdictions.ts    # Canonical Australian jurisdiction list — the one place it's defined
│       ├── navigation.ts       # Single source of truth for sidebar/mobile nav/breadcrumbs
│       └── utils.ts
├── scripts/e2e-runner.mjs     # Build → serve → run Playwright → teardown, with a stale-lock-aware lock file
├── tests/
│   ├── unit/                  # node:test — pure logic, schemas, seed data, readiness, retrieval, bundle export,
│   │                          # taxonomy machine-key/validation/dependency-service/eligibility/export/seed data,
│   │                          # and the Phase 4 counterparts for Microcards + Rights & Legal Information
│   └── e2e/                   # Playwright — shell, navigation, tables, settings, full Knowledge & Legislation flow,
│                              # full taxonomy CRUD/dependency-protection/reorder/export flows, and critical smoke
│                              # coverage for Microcards + Rights & Legal Information
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
- **Primitives** — Button/Card/Badge/Input are recreated using the same shape language (pill buttons, `rounded-xl` cards) but driven by CSS-variable tokens rather than the frontend's hard-coded hex utility classes.
- **New primitives** (Dialog, Tabs, DropdownMenu, Avatar, DataTable) — `safespeak-frontend` has no table, tabs, dialog, dropdown, or drawer component to reuse. These are built using Radix UI primitives (`@radix-ui/react-dialog`, `-tabs`, `-dropdown-menu`, `-avatar`), the same unstyled/accessible primitive vendor the frontend already depends on, styled with the shared token set.
- The multi-step document wizard (Knowledge & Legislation) reuses these same primitives — Card, Badge, Alert, Dialog, Input — and does not introduce a separate visual language or copy an external admin dashboard's design.
- **Deliberately not reused**: NextUI, Framer Motion/`motion`, `@react-three/*`, Leaflet, and the frontend's Quick Exit / covert-mode safety experience — they protect a survivor using the public-facing app and have no meaning for a single trusted administrator.

**No runtime dependency on `safespeak-frontend` exists** — nothing in `safespeak-admin/src` imports a path under `../safespeak-frontend`.

## Local data architecture

All content lives in the browser's IndexedDB, accessed through [Dexie](https://dexie.org). See `src/lib/db/db.ts` for the versioned schema (`DB_SCHEMA_VERSION`, still `1` — Phase 2 added repository methods and Zod fields but no new Dexie table or index, so no migration was needed; see below).

- Every managed record shares base fields (`id`, `createdAt`, `updatedAt`, `createdBy`, `updatedBy`, `isDemo`, `status`, `version`) defined once in `src/lib/models/base.ts`.
- Every domain has its own typed Dexie table — there is no single untyped generic table.
- **Boolean fields are never indexed** (`isDemo`, `verified`, `active`, ...) — IndexedDB does not accept `boolean` as a valid key type. Those fields are filtered in application code after `.toArray()`.
- Pages and components never call Dexie directly. They go through `AdminContentRepository` (`src/lib/repositories/admin-content-repository.ts`), implemented by `IndexedDbAdminContentRepository`. Beyond the generic per-domain CRUD (`list/get/create/update/remove`), `documents` exposes domain-specific atomic operations used by Knowledge & Legislation:
  - `setFileBlob` / `getFileBlob` — Blob storage outside the Zod-validated path (Blob isn't JSON-serializable, so it can't be part of the persisted-data contract used for bundle export).
  - `applyExtractionResult(id, result, audit)` — one Dexie transaction that updates file metadata, replaces chunks, and appends an audit event together. Used for the initial upload, a successful file replacement, and a successful retry alike.
  - `transitionStatus(id, nextStatus, actor)` — validates the status graph + the legislation publish guard, updates status, and appends an audit event atomically. Throws `StatusTransitionError` when the move isn't allowed.
  - `updateWithVersionCheck(id, patch, expectedVersion, actor)` — throws `VersionConflictError` if the stored version has moved on since the caller last read it (another tab/session updated it first).
  - `deleteDraft(id, actor)` — throws `InvalidDeletionError` unless the record's status is `draft`; removes the document, its chunks, and its blob together.
  - `listOverdueForReview()` and the top-level `getRagReadinessSummary()`.
- Every record read back from IndexedDB is validated with its Zod schema (`src/lib/db/validation.ts`). An invalid record is dropped from the result set (never crashes the app, never discards every other record); detailed validation errors are logged to the dev console only and never shown as a raw stack trace in the UI.
- To add a schema change: add a new `.version(n + 1).stores({...})` block in `db.ts` with an `.upgrade()` callback if data needs transforming. Never edit an existing `.version()` block in place.

## IndexedDB limitations

- Data is **per-browser, per-origin, per-device**. It is not synced, not backed up, and is not visible from a different browser or machine.
- Clearing site data, using a private/incognito window, or using a different browser will make this data appear to have disappeared.
- There is no multi-user concurrency story beyond the single-tab `updateWithVersionCheck` conflict check described above — this phase assumes exactly one local administrator, most of the time in one tab.

## Knowledge & Legislation

The only content module with a complete CRUD workflow in this phase. Routes:

| Route | Purpose |
| --- | --- |
| `/content/knowledge-legislation` | Document list (search, filters, row actions) + RAG readiness tab |
| `/content/knowledge-legislation/new` | Create wizard |
| `/content/knowledge-legislation/[documentId]` | Detail view |
| `/content/knowledge-legislation/[documentId]/edit` | Edit wizard (same component as create, pre-populated) |

An invalid `documentId` renders a client-side "Document not found" state rather than crashing (data lives in IndexedDB, which only the browser can read, so this can't be a server-side 404).

### Create/edit wizard (5 steps)

`src/components/legislation/document-form-wizard.tsx`, steps in `src/components/legislation/steps/`:

1. **Upload** — drag-and-drop or file picker, PDF only. On selection: validates type/extension/non-empty/size (against `AppSettings.pdfMaxFileSizeBytes`), then extracts text locally. In **create** mode this immediately creates the document row (so a failed extraction still leaves a document you can see and retry) and stores the returned id for the rest of the wizard. In **edit** mode, replacing the file requires a confirmation dialog explaining that local text/chunks will be regenerated; the new extraction is only committed via `applyExtractionResult` if it succeeds — a failed replacement leaves the previous valid file and chunks completely untouched.
2. **Source information** — required: title/legislation name, source type, source category, authority or publisher, jurisdiction (see below), language. Optional: act number, version, source URL (validated).
3. **Legal scope and classification** — effective/last-updated/next-review dates (next review date validated to not precede the effective date), license status, relevant sections (repeatable list, duplicates rejected with an inline warning rather than silently added twice), topic, tags (trimmed, de-duplicated), incident categories (checkboxes sourced live from the `incidentTypes` repository — never hardcoded in the form), priority.
4. **AI and governance** — Legal review complete, AI use allowed, and internal review notes, with an explicit callout that these are independent of each other and of publication status.
5. **Review and save** — a read-only summary of every section, the RAG readiness checklist for the record as currently filled in, and the publication blockers (if any) in plain language. Actions: **Save as draft**, **Mark ready for review**, **Publish** (disabled with the specific reason shown when not yet eligible). All three go through `updateWithVersionCheck` for the metadata, then `transitionStatus` only if the target status differs from the current one — both calls are awaited before the buttons re-enable, so rapid repeated submission cannot create a duplicate document or double-fire a transition.

Cancelling with unsaved changes (`react-hook-form`'s `formState.isDirty`) shows a confirmation dialog; a `beforeunload` handler covers an accidental tab close/refresh too.

**Jurisdiction** is a single canonical typed list (`src/lib/jurisdictions.ts`, `AUSTRALIAN_JURISDICTIONS`) — Commonwealth/Australia, NSW, VIC, QLD, WA, SA, TAS, ACT, NT — used by the form, the list filters, and the local retrieval filter. It is defined once and imported everywhere, never duplicated.

### Publication eligibility ("Legislation publication rule")

`src/lib/legislation/readiness.ts` → `getPublicationBlockers(doc)` / `isPublishable(doc)`. A record may move to `published` only when:

- A local file exists.
- Local extraction succeeded.
- Required metadata is complete (title, source type, source category, authority/publisher, jurisdiction, language).
- Legal review is marked complete.
- No unresolved local processing issue remains.

This deliberately does **not** require AI usage permission, a selected license status, or a review date — those are not part of the publish gate. `legislationPublishGuard` in `src/lib/publishing/workflow.ts` wraps this same function so the status-transition graph (`transitionStatus`) and the wizard/detail-page checklist can never drift apart.

### AI eligibility ("AI eligibility rule")

`getAiEligibilityBlockers(doc)` / `isAiEligible(doc)` — independent of publication. A record is AI-eligible only when it is **published**, **not archived**, **AI Usage Permission** is enabled, **Legal Review Complete** is true, local extraction succeeded, and no blocking processing issue remains. **AI Usage Permission and Published are not the same thing** — a document can be published for reference without ever being AI-eligible (the seeded "Workplace Health and Safety Guidance Summary" demonstrates this).

### RAG readiness

`getRagReadinessChecklist(doc)` renders the same eight-point checklist (file available, text extracted, chunks generated, metadata complete, legal review complete, AI use allowed, published, no processing issue) on both the document detail page and the RAG Readiness tab's per-row "blocking reasons" column — one shared function, not reimplemented per screen. The RAG Readiness tab (`src/components/legislation/rag-readiness-tab.tsx`) additionally shows aggregate counts (`getRagReadinessSummary`) and filters (Ready / Blocked / Awaiting review / Processing issue / AI permission missing).

**Wording used everywhere this readiness is surfaced:** *"Ready for future AI processing"*, *"Local text preview"*, *"Local chunk preview"*, *"Not indexed in a production RAG system"*. The UI never says "Live in AI," "Indexed in production," or "Available to the production assistant."

### Local PDF extraction and chunk preview

Unchanged from Phase 1's foundation (`src/lib/pdf/`), now orchestrated by `src/lib/legislation/document-extraction-service.ts` — one shared `commitExtraction()` helper used by all three entry points (`createDocumentFromFile`, `replaceDocumentFile`, `retryExtraction`), so create/replace/retry can never duplicate a document or diverge in behaviour. On failure: `createDocumentFromFile` still persists the document with `processingStatus: "processing_issue"` (so it shows up for recovery); `replaceDocumentFile`/`retryExtraction` leave the stored document, blob, and chunks completely unchanged and only log an audit event describing the failed attempt.

### Local retrieval test — not production RAG

`src/lib/legislation/retrieval.ts` (implementation still present and unit-tested; the **Test retrieval** tab that surfaced it in the Knowledge & Legislation page has been removed from the UI — see `components/legislation/local-retrieval-tab.tsx` if it needs to be reattached). This is a deterministic, browser-local **keyword-overlap** search over already-generated chunk previews:

1. Normalize and tokenize the query (lowercase, strip punctuation, drop a small stop-word list and single-character tokens).
2. Score each chunk by counting token occurrences, plus a flat boost for an exact phrase match.
3. Apply a small priority boost from the document's own `priority` field.
4. Filter to the administrator's chosen scope — **Published, AI-eligible only** (the default, matching what a real frontend integration would eventually see) or **All locally processed (admin testing)**, which can surface non-eligible sources but always attaches a visible reason why.

No embeddings are generated, no AI API is called, and no server or vector database is used — the UI states this directly, and an unmatched query returns an explicit "no local chunks matched" state rather than inventing an answer.

### Processing issues and recovery

`components/legislation/processing-issues-tab.tsx` lists every document with `processingStatus: "processing_issue"` (encrypted/corrupted/empty/no-extractable-text PDFs) with a plain-language reason, a **Retry extraction** action (reuses the stored blob, cannot run twice concurrently on the same document, clears the issue only on success, records success/failure either way), a **Replace PDF** action (opens the edit wizard's Step 1), and a **View** link — **not currently surfaced**: the "Processing issues" tab that rendered it in the Knowledge & Legislation page has been removed from the UI. A `processing_issue` document can still be recovered via the **Replace file** link on its own detail page (opens the edit wizard), just not via the batch **Retry extraction** action or the plain-language issue list.

## Taxonomy: Incident Types, Triage Labels, Resource Categories

Three controlled-classification modules with complete CRUD, sharing one generic architecture (`lib/taxonomy/*`, `components/taxonomy/*`) but **separate typed Dexie tables** — there is no single untyped generic taxonomy table, and each entity keeps its own Zod schema and field set. Routes, per entity:

| Route | Purpose |
| --- | --- |
| `/taxonomy/<kind>` | List (search, status/demo/archived filters, row actions, reorder mode) |
| `/taxonomy/<kind>/new` | Create form |
| `/taxonomy/<kind>/[id]` | Detail view |
| `/taxonomy/<kind>/[id]/edit` | Edit form |

`<kind>` is `incident-types`, `triage-labels`, or `resource-categories`.

### Common fields and the stable machine-key policy

Every taxonomy record extends the same base fields plus `taxonomyBaseFields` (`lib/models/taxonomy-base.ts`): display name, a **machine key**, description, status, display order, internal notes.

- **Machine key format**: lowercase snake_case, must start with a letter — `^[a-z][a-z0-9]*(_[a-z0-9]+)*$` (`lib/taxonomy/machine-key.ts`). `suggestMachineKeyFromName()` proposes one from the name (NFKD-normalized, accents stripped, punctuation collapsed to single underscores) while creating; the admin can still edit it before the first save.
- **Immutable after first save**: the edit form renders the key read-only (`MachineKeyField`, `locked` prop), and `updateWithVersionCheck` silently strips `machineKey` from any patch even if a caller tried to send one — the key can never drift once other content may depend on it.
- **Unique per entity type**: enforced both client-side (`isDuplicateMachineKey`, checked before submit) and repository-side (`create()` throws `DuplicateMachineKeyError`) — never trust the UI alone.
- Relationships between taxonomy records and other content always use the stable record **id**, never the display name or the machine key.

### Per-entity fields

- **Incident Type** (`lib/models/incident-type.ts`) — name, machine key, short description, full admin guidance (admin-only, stripped from the Published Content Bundle), display order, status, internal notes; optional default urgency (`not_set | low | medium | high | critical` — a starting suggestion only, never presented as a final triage result), user-facing label, and related resource-category ids.
- **Triage Label** (`lib/models/triage-label.ts`) — name, machine key, short description, a typed **label group** (`safety | urgency | context_indicator | bias_indicator | support_need | accessibility_need | other`), display order, status, internal notes. Whenever `labelGroup` is `bias_indicator` or `context_indicator`, both the form and the detail page show a fixed wording reminder: the label is an *indicator*, never a confirmed hate crime, legal finding, diagnosis, or final decision.
- **Resource Category** (`lib/models/resource-category.ts`) — name, machine key, short description, display order, status, internal notes; optional icon (`iconKey`, one of a curated `RESOURCE_CATEGORY_ICON_KEYS` mapped to existing `@tabler/icons-react` components in `lib/taxonomy/resource-icons.ts` — never an arbitrary URL or custom SVG) and accent colour (`accentToken`, one of the existing Badge tone tokens — never a custom hex value). Flat only: a legacy `parentCategoryId` field exists on the schema for compatibility but is not exposed anywhere in the Phase 3 UI — category hierarchy is out of scope.

### Publishing, archive, and hard-delete rules

Reuses the shared status graph (`lib/publishing/workflow.ts`) with one shared guard, `taxonomyPublishGuard(blockers)`, fed by per-entity blocker functions in `lib/taxonomy/eligibility.ts` (`getIncidentTypeBlockers` / `getTriageLabelBlockers` / `getResourceCategoryBlockers`) — the same blocker list drives the form's inline warning, the row-actions menu's disabled state, and the repository's `transitionStatus` guard, so they cannot drift apart. A record may publish with **zero** references.

- A brand-new record is created directly at whichever target status the admin chose (Save as draft / Ready for review / Publish) — there is no prior status to "transition from," so the status-graph guard (which only allows `draft → ready_for_review | archived`, not `draft → published`, for an *existing* record) does not apply to picking a new record's starting state.
- **Hard delete** (`deleteDraft`) only ever succeeds for a `draft`-status record with zero current references — checked live against `lib/taxonomy/dependency-service.ts`'s usage count, not against a cached/stale count. Everything else (published, ready-for-review, needs-update, archived, or any referenced draft) must be archived or have its references replaced first; the delete button itself is only ever rendered for `draft` status, and the repository re-checks both conditions regardless.
- **Archived** records stay in IndexedDB, appear only when the Archived filter is explicitly applied, are excluded from create/edit reference selectors and Replace References candidate lists, and are excluded from the Published Content Bundle.

### Usage, dependency, and dangling-reference detection

One canonical service, `lib/taxonomy/dependency-service.ts`, grounded in what the schemas actually contain (confirmed by grepping the codebase before writing it, not assumed):

- `incidentTypeIds` (array) exists on documents, microcards, rights content, support organisations, support professionals, and reporting destinations, plus a **singular** `matchingRules.incidentTypeId`.
- `triageLabelIds` (array) exists on support professionals and matching rules.
- No domain referenced resource categories before this phase — the only source is the new `incidentTypes.relatedResourceCategoryIds` field.

`computeTaxonomyUsage(kind, id, bundle)` returns a total count plus a per-referencing-type breakdown, rendered by the shared `UsageSummaryView` (only linking to a referencing record when that module actually has a details route today — otherwise plain text, never a dead link). `findDanglingTaxonomyReferences(kind, bundle)` flags a reference whose target id isn't present in the given bundle; the export pipeline reuses this exact function against the bundle actually being shipped (see below), so "dangling" there specifically means "not included in this export," not just "id never existed."

### Replace References

`ReplaceReferencesDialog` + `TaxonomyRepository.replaceReferences(sourceId, targetId, actor, archiveSourceAfter)`: choose a same-type, non-archived replacement target; on confirm, `planReferenceReplacement()` (pure, Dexie-free, unit-tested) computes each referencing record's new array value — de-duplicated, order otherwise preserved, every unrelated field untouched — and the repository applies every plan entry plus an optional archive-the-source step inside **one Dexie transaction**. If any write throws, the whole transaction aborts and nothing is partially applied; the archive step deliberately runs last inside that same transaction so it is structurally unreachable on failure, with no separate rollback logic needed. A concurrent duplicate operation is prevented by the dialog's own in-flight guard (`isWorking`).

### Display-order management

A numeric `displayOrder` field on every form, plus an accessible reorder mode (`ReorderPanel`, shared by all three list pages): **Move up / Move down** buttons only — no drag-and-drop — each move announces the record's new position via an `aria-live="polite"` status region, and the whole sequence of moves persists as **one** repository call (`reorder()`) and one audit event when "Save order" is clicked, not one write per button press.

### Demo seed data

`lib/db/seed.ts` extends the Phase 1/2 taxonomy seed data (keeping every pre-existing id that Knowledge & Legislation content already referenced) to exercise every status at least once per entity, an unreferenced draft for each entity (demonstrating the hard-delete path), and real cross-references — `incidentTypes.relatedResourceCategoryIds` now points at real resource-category seed rows, so the usage viewer and Replace References flow have something genuine to show rather than an empty state. `tests/unit/taxonomy-seed-data.test.ts` checks machine-key validity/uniqueness and runs the actual `findDanglingTaxonomyReferences` against the full seed dataset to guarantee no seeded reference silently points at nothing.

## Microcards and Rights & Legal Information

Two educational-content modules with complete CRUD, sharing one generic architecture (`PublishableContentRepository<T>`, `lib/content/*`) — the counterpart to the taxonomy architecture above, minus the machine-key/Replace References machinery neither domain needs.

| Route | Purpose |
| --- | --- |
| `/content/microcards` | List (search, status/demo/archived filters, reorder mode, row actions) |
| `/content/microcards/new` | Create form |
| `/content/microcards/[microcardId]` | Detail view (status actions, usage, user-facing preview, audit activity) |
| `/content/microcards/[microcardId]/edit` | Edit form |
| `/content/rights-legal-information` | List (search, status/demo/archived filters, row actions — no reorder) |
| `/content/rights-legal-information/new` | Create form |
| `/content/rights-legal-information/[rightsContentId]` | Detail view |
| `/content/rights-legal-information/[rightsContentId]/edit` | Edit form |

Both forms are single-page (`useState`, same reasoning as taxonomy forms — see docs/ARCHITECTURE.md), grouped into labelled sections (core content, classification & relationships, Microcard's call-to-action, publishing), and render a live **user-facing preview** panel (`MicrocardPreview` / `RightsContentPreview`) alongside the form — an approximation of what a user would see, not a pixel-accurate render of `safespeak-frontend` (this app does not import that app's components).

### Per-entity fields

- **Microcard** (`lib/models/microcard.ts`) — title, short guidance (`summary`), full content (`body`), optional legacy `topic`, tags, optional incident categories, a typed **card type** (`quick_guidance | safety_tip | rights_summary | next_step | evidence_tip | support_option | preparation_tip | other`), a single primary resource category, jurisdiction, **priority** (`low | normal | high | critical` — distribution/attention priority only, never an emergency determination), display order, review-due date, related legislation/support-organisation ids, a **call-to-action**, and internal notes.
- **Rights & Legal Information** (`lib/models/rights-content.ts`) — title, short summary, full content, jurisdiction, related legislation ids, optional incident categories, tags, a typed **content type** (`rights_overview | reporting_rights | workplace_rights | housing_rights | privacy_rights | discrimination_rights | evidence_information | support_access | process_explanation | other`), one or more resource categories, related support-organisation ids, priority, review-due date, an optional effective-from date, source notes (internal), a public disclaimer, and internal notes.

### Call-to-action policy (Microcard only)

`lib/models/microcard-cta.ts` — a typed CTA (`none | view_rights_information | view_legislation_source | view_support_service | start_report | open_internal_route | open_safe_external_link`) that can only ever point at a **stable record id**, a small hand-maintained internal-route allow-list (`MICROCARD_INTERNAL_ROUTES`), or an **`https://`-only** external URL — never raw markup or an arbitrary target, so a CTA can never become an injection vector or a dead link invented at export time. The internal-route allow-list exists because this admin app does not import `safespeak-frontend`'s real router (out of scope this phase); see docs/ARCHITECTURE.md "Call-to-Action policy" for the full reasoning.

### Publishing, review-due, and eligibility rules

Both domains reuse the same shared status graph and `taxonomyPublishGuard(blockers)` taxonomy/Microcards/Rights-Content already share (see "Publishing, archive, and hard-delete rules" above) — the blocker list itself comes from `lib/microcards/eligibility.ts` (`getMicrocardBlockers`) and `lib/rights-content/eligibility.ts` (`getRightsContentBlockers`), so the form's inline warning, the Review Queue's "Blocking issues" column, and the repository's actual enforcement can never drift apart:

- Both require title, summary, full content, a type (card/content type), jurisdiction, and a review-due date before Ready for review / Publish.
- Microcard additionally requires a resource category; Rights & Legal Information requires at least one.
- **Legal-claim content types** (`RIGHTS_CONTENT_TYPES` whose name ends `_rights`, plus `discrimination_rights`) additionally require at least one related legislation source that is both **published** and **legal-review-complete**, and a non-empty public disclaimer, before publish — informational types (`evidence_information`, `support_access`, `process_explanation`, `other`) do not. This classification lives in `lib/rights-content/eligibility.ts`'s `contentTypeRequiresLegalSource()`.
- A relationship to a record that still exists but is no longer published (e.g. a resource category later archived) does **not** retroactively block an already-valid record — only a genuinely dangling reference (an id that no longer resolves to any record at all) blocks. New relationship selections in the form are restricted to published targets by `isSelectableForNewRelationship()` (`lib/content/relationship-ids.ts`); this is a selector-time restriction, not a blocker rule.
- `getReviewDueState(reviewDueDate)` (`lib/content/review-due.ts`) classifies a review date as `current | due_soon (within 30 days) | overdue | none` — shown as a badge on both list pages, the Review Queue, and each detail page. `REVIEW_DUE_SOON_WINDOW_DAYS = 30`.

### Dependency protection and hard delete

Same rule as taxonomy: **hard delete** (`deleteDraft`) only ever succeeds for a `draft`-status record with **zero** current references, checked live via `computeTaxonomyUsage("microcard" | "rights_content", id, bundle)` (`lib/taxonomy/dependency-service.ts`, widened this phase — see docs/ARCHITECTURE.md). Today the only thing that can reference a Microcard or Rights & Legal Information record is a Matching Rule's `microcardIds` / `rightsContentIds` (confirmed by grep, nothing else does). Everything else (published, ready-for-review, needs-update, archived, or any referenced draft) must be archived instead; the delete confirmation dialog surfaces the exact reference count when blocked, and the record is left untouched.

### Reorder (Microcards only)

Microcards carry an explicit `displayOrder` and an accessible reorder mode identical in behaviour to taxonomy's (`ReorderPanel`, Move up/down only, one repository call and one audit event per "Save order"). Rights & Legal Information has no display-order concept, so it has no reorder mode. `MicrocardReorderPanel` is a thin adapter over the shared `ReorderPanel` (which expects a `name` field) mapping `title -> name` for display, rather than changing the shared component's contract for its other three callers.

### Dashboard and Review Queue integration

The Dashboard gained six granular stat cards (Published/Draft Microcards, Published Rights Content, Rights Content awaiting review, Educational content needing update, Educational content review overdue) additional to — not replacing — the existing combined counts. The Review Queue gained a **Review due** column (Microcards/Rights & Legal Information only — "Not applicable" elsewhere, since no other domain in the queue has a review-due-date concept yet), a **Blocking issues** column (same two domains, using the eligibility helpers above), and a **View** column linking straight to each record's detail page.

## Content bundle export: Published Content Bundle vs Admin Backup

`src/lib/bundle/export-bundle.ts` builds a versioned, JSON-serializable snapshot (`BUNDLE_SCHEMA_VERSION`, now `1.1.0` — bumped from `1.0.0` when `purpose`, `includedStatuses`, and `aiEligibilityPolicy` were added to the manifest, since a `1.0.0`-only consumer wouldn't know to check `purpose` before treating a bundle as user-facing).

The Settings export panel offers two clearly distinct, radio-selected purposes — **the default is always Published Content Bundle**:

- **Published Content Bundle** (`purpose: "published_content"`) — the export intended for a future `safespeak-frontend` import. Every domain is filtered to `status === "published"` only; drafts, ready-for-review, needs-update, and archived records are excluded from every domain, not just legislation. Legislation records are additionally passed through `toPublishedLegislationExport()` (`src/lib/legislation/export-transform.ts`), a field **allow-list** (not "everything minus a few keys") that drops `reviewNotes`, `processingIssue`, `createdBy`/`updatedBy`, and every local processing/extraction status field, and adds one computed field: `aiEligible: boolean` (from `isAiEligible()`) — so a published-but-AI-disabled record is still included (as ordinary published content) but clearly flagged as not AI-eligible, rather than silently omitted or silently treated as AI-ready. The three taxonomy domains go through the same allow-list treatment (`src/lib/taxonomy/export-transform.ts`): `internalNotes` (every entity) and `adminGuidance` (Incident Type) are dropped, while `id`, `machineKey`, `displayOrder`, and every other public field are preserved unchanged. Microcards and Rights & Legal Information get the same treatment via `lib/microcards/export-transform.ts` / `lib/rights-content/export-transform.ts`: `internalNotes` is dropped from both, `sourceNotes` is additionally dropped from Rights & Legal Information, and the public disclaimer is preserved verbatim (never softened or summarised).
- **Admin Backup** (`purpose: "admin_backup"`) — every local status, for local restoration only. Its manifest and its Settings-page UI both say, explicitly, "not for user-frontend consumption," and every export of this purpose adds that same sentence as a manifest warning. Taxonomy internal notes and admin-only fields are **not** stripped here — it is an internal restoration snapshot, not a public export.

Both purposes share the same validation, checksum, and file-naming machinery: every record is re-validated against its Zod schema before inclusion (an invalid record is excluded with a warning, not allowed to block the rest of the export); every domain gets a SHA-256 checksum; downloaded filenames are `safespeak-published-content-bundle-<timestamp>.<ext>` or `safespeak-admin-backup-bundle-<timestamp>.<ext>`.

**Dangling references**: before the taxonomy domains are filtered/transformed, `export-bundle.ts` runs `findDanglingTaxonomyReferences()` (`src/lib/taxonomy/dependency-service.ts`) against exactly the record sets that will ship in that export — so a published document that references a *draft* incident type (which won't be in a Published Content Bundle) produces a manifest warning naming the referencing record and the taxonomy kind, rather than either silently dropping the reference or inventing a placeholder record to satisfy it. Phase 4 widened the same check to the `"microcard"` and `"rights_content"` kinds (a Matching Rule referencing a Microcard/Rights & Legal Information record excluded from the export produces the same warning), and added one more, narrower check specific to Microcards: a call-to-action whose `view_rights_information` / `view_legislation_source` / `view_support_service` target isn't in the export also produces a warning — CTA targets aren't modelled as a `ReferenceSource` in the dependency service (they're not a taxonomy-shaped relationship), so this one is checked directly in `export-bundle.ts`. Phase 5 widened it further to `"support_organisation"`, `"support_professional"`, and `"reporting_destination"` — a Matching Rule (or a linked Professional/Destination's `organisationId`) referencing a Support Organisation excluded from the export produces the same warning. `BUNDLE_SCHEMA_VERSION` was **not** bumped for any of this — the manifest's own shape (the fields on `BundleManifest`) is unchanged; only each domain's data payload gained a field allow-list, which is a data-shape decision, not a manifest-schema-version concern (the version is reserved for changes to the envelope a consumer needs to understand before it can even read `data`).

Never exported, in either purpose: Blob fields (`fileBlob`, profile photos — stripped automatically because they aren't part of any Zod schema's `.parse()` output), browser object URLs (the download helper's `URL.createObjectURL` is transient and only triggers the save dialog), or local file-system paths.

- **JSON export** excludes uploaded PDF files. **ZIP export** (`src/lib/bundle/export-bundle-zip.ts`, via `jszip`) adds `manifest.json`, one `data/<domain>.json` per domain, and a `documents/` folder with the raw PDF bytes for any included document that has one.
- **This does not update `safespeak-frontend` automatically.** Exporting only produces a file on your computer; building the frontend's import/consumption step is explicitly a later phase, and both the Settings page and the manifest say so.

## Demo data and reset

- Seed data (`src/lib/db/seed.ts`) is small, clearly fictional, and every record carries `isDemo: true`.
- Contact details use `example.org` (reserved for documentation by RFC 2606) and placeholder `0000 000 0XX` phone numbers — nothing is a real phone number, booking link, registration number, or legal claim.
- Knowledge & Legislation seed data exercises every governance scenario named in the spec: a published + AI-permitted document with relevant sections, linked incident categories, and real local chunks (`demo-doc-discrimination-act-guide`); a ready-for-review document with extraction already succeeded but legal review incomplete, also with its own chunk (`demo-doc-workplace-harassment-policy`); a draft with a local processing failure (`demo-doc-community-reporting-guidelines`); a published-but-AI-disabled document (`demo-doc-workplace-safety-guidance`); a published, AI-eligible document whose review date is in the past, to demonstrate the "Overdue for review" indicator (`demo-doc-consumer-notice-overdue`); and an archived document (`demo-doc-superseded-circular`). None of these represent real legislation, real sections, or real legal claims — titles and act numbers are explicitly marked "(Demo)".
- All seed data is parsed through its Zod schema at module load (`schema.parse(...)`), so a malformed seed record fails fast in development rather than being silently stored.
- Seed ids are **fixed strings**, not randomly generated, so **Settings → Reset demo data** is deterministic: it deletes every `isDemo: true` record (not the whole database) and re-inserts the same seed set, then records a `demo_data_reset` audit event. This now includes the three taxonomy entities (previously seeded but not yet part of the audit-event trail) — `buildSeedAuditEvents` emits one `demo_data_seeded` event per seeded incident type, triage label, and resource category alongside every other domain.

## No authentication, no backend

- There is no login screen and no fake authentication of any kind. The app assumes a single local administrator, and audit metadata (`createdBy`/`updatedBy`/`actor`) is attributed to `LOCAL_ADMIN_ACTOR`.
- No API route, remote database, or backend of any kind is created or simulated.
- The `AdminContentRepository` interface exists specifically so this limitation is temporary by design, not baked into the UI layer.
- **`/profile` (Phase 8.4) is not an account system.** It's a single, singleton, local-only record (`lib/models/admin-account.ts`, `ADMIN_ACCOUNT_ID`) holding a display name and an optional self-reference contact email — reached from the Header's account menu. There is still no Admin registration, no Admin directory, no other administrator accounts, and no sign-in/sign-out, because there is nothing to sign in or out of.

## Future migration path

Because every page/component talks to `AdminContentRepository` rather than Dexie directly, introducing a real backend later means:

1. Write `ApiAdminContentRepository implements AdminContentRepository` alongside `IndexedDbAdminContentRepository`.
2. Swap which implementation `RepositoryProvider` constructs.
3. UI code, hooks, and the content-bundle export logic do not need to change, because they only depend on the interface's method signatures — none of it imports Dexie.

Real production RAG (embeddings, a vector database, server-side retrieval, AI answer generation) is a separate, later migration: the local chunk-preview records already carry the shape (`documentId`, `pageStart`/`pageEnd`, `chunkIndex`, `text`) a real ingestion pipeline would need, but nothing in this codebase computes or stores an embedding, and the local retrieval test's keyword scoring is not intended to be reused as production ranking logic.

## Support Directory: Support Organisations, Advocates & Counsellors, Reporting Destinations

Three content modules with complete CRUD, sharing the `PublishableContentRepository<T>` architecture (see "Microcards and Rights & Legal Information" above) and a new `lib/support-directory/*` helper layer — but each keeping its **own typed Dexie table and Zod schema**, never a shared untyped one.

| Route | Purpose |
| --- | --- |
| `/content/support-organisations` (+ `/new`, `/[organisationId]`, `/[organisationId]/edit`) | Organisations offering support services |
| `/content/advocates-counsellors` (+ `/new`, `/[professionalId]`, `/[professionalId]/edit`) | Individual advocates and counsellors — one module, `professionalType` selects Advocate vs Counsellor (and several other existing Phase 1 types) inside the form, not a second nav entry |
| `/content/reporting-destinations` (+ `/new`, `/[destinationId]`, `/[destinationId]/edit`) | Where an incident can formally be reported |

### Verification policy (Support Organisations and Advocates & Counsellors only)

`lib/models/verification.ts` — one shared 5-state local-administrative verification status (`not_verified | verification_pending | verified | verification_expired | verification_rejected`), used identically by both domains so the concept, wording, and display can never drift between them:

- **Verification is never a server-backed, regulatory, legal, or identity check.** It records that a local administrator reviewed the record and formed a judgement — the form, detail page, and preview all say so explicitly (`VERIFICATION_STATUS_DESCRIPTION`).
- **A record may be Published while Not Verified**, and a Verified record is not automatically Published — the two axes are fully independent. Publish eligibility (`getSupportOrganisationBlockers` / `getProfessionalBlockers`) never checks `verificationStatus`.
- **"Not verified" is communicated through icon *and* text, never colour alone** (`components/ui/status-badge.tsx` → `VerificationBadge`, shared by both domains) — a Published-but-Not-Verified record always shows "Not verified" plus "Publication does not imply verification." in its preview and detail page.
- Verification Notes are a separate, admin-only field from Internal Notes — never shown in a public preview or the Published Content Bundle.
- Verification expiry (`isVerificationExpired()`) is a pure date classification, never a background job — nothing in this codebase silently flips a stored `verificationStatus` to `verification_expired` or archives/unpublishes a record when a date passes. An administrator sets `verification_expired` explicitly, typically prompted by the UI surfacing that the recorded expiry date has passed.

### Contact information and reporting-method architecture

`lib/support-directory/contact.ts` — shared *validation and capability-derivation logic*, not one nested contact object: each entity keeps its own pre-existing flat field names (e.g. `SupportProfessional.bookingUrl`/`organisationWebsite` predate this phase and were kept as-is) since forcing them into a common shape would be a needless breaking rename. What's actually shared:

- `isSafeUrl()` — accepts only well-formed `http://`/`https://` URLs, rejecting `javascript:`, `data:`, and every other protocol.
- `isValidEmailValue()` — a real email-format check, not just "non-empty."
- A phone number is stored exactly as typed, with no format regex and no reformatting — this app never verifies phone ownership and must never silently reinterpret a valid international number as an incorrect Australian one.
- `deriveOrganisationContactCapabilities()` / `deriveProfessionalContactCapabilities()` / `deriveDestinationContactCapabilities()` — a capability (`canCall`, `canEmail`, `canBook`, `canVisitWebsite`, `canRefer`, `canReportOnline`, `canBookAppointment`) is always derived from the stored field, never a separately-editable boolean, so it can never drift out of sync with the data that actually backs it. A preview never shows a contact action whose backing field is missing or invalid.

`lib/support-directory/reporting-method.ts` — the Reporting Destination-specific rule that a declared reporting method (`REPORTING_METHODS`: phone/email/online_form/website/in_person/appointment/postal/internal_route/other) must have its required contact field actually present — `isReportingMethodSupported()` is the one place that mapping lives, used identically by the publish-eligibility blockers and the user-facing preview so a method can never be shown as available when it isn't backed by real data.

`lib/models/reporting-destination-type.ts`'s `TRISTATE_VALUES` (`yes | no | unknown`) is reused for both `anonymousReporting` and `emergencySuitability` — a tri-state, not a boolean, specifically so a genuinely unconfirmed answer can never silently read as "No." `unknown` is the schema default; `emergencySuitability` is never inferred from `destinationType`, and a non-emergency destination is never presented as an emergency service.

### Organisation ↔ professional/destination relationships

`SupportProfessional.organisationId` and `ReportingDestination.organisationId` store a stable `SupportOrganisation.id` — never the organisation's name or an embedded copy of the record. This phase replaced the previous free-text `SupportProfessional.organisation` field (which stored a display string and could never support dependency tracking or dangling-reference detection) with this typed reference; see "Errors and fixes" precedent in `docs/ARCHITECTURE.md`. A missing `organisationId` never blocks publish (a professional may be independent, a destination may have no related organisation); a *dangling* one (set, but no longer resolving) does. New selectors default to Published organisations (`isSelectableForNewRelationship`); an existing reference to an Archived or Needs-Update organisation stays visible with a warning rather than being silently dropped.

### Profile image (Advocates & Counsellors only)

Mirrors the Knowledge & Legislation PDF-blob pattern exactly: `SupportProfessional.profilePhoto` (metadata: file name/size/type) is a normal Zod-validated field, while the raw image `Blob` is written directly to the same Dexie row outside the Zod path via `repository.supportProfessionals.setProfileImage()`/`getProfileImage()`/`removeProfileImage()` (`lib/support-directory/profile-image.ts` validates JPEG/PNG/WebP only — never SVG, since SVG can embed script content — up to `PROFILE_PHOTO_MAX_BYTES`, 3MB). A newly-picked file is held as a local, revoked-on-change object URL (`hooks/use-profile-image-url.ts`) and is only actually written — Blob, metadata, and a factual audit event together, in one transaction — when the form is saved; a failed *new* selection never touches a previously-stored valid image. No image shows the existing `initialsForName()` fallback. **Export policy**: the JSON export never contains the Blob or an object URL — only `profilePhoto` metadata, so a consumer knows an image exists without the bytes; the ZIP export (`lib/bundle/export-bundle-zip.ts`) additionally writes the actual image bytes to a stable `profile-images/<id>-<fileName>` path, mirroring the `documents/` folder exactly. A manifest warning tells the admin to choose the ZIP export when a published profile has an image.

### Dependency protection, archive, and hard delete

Identical rule to every other domain: `deleteDraft` only ever succeeds for a `draft`-status record with **zero** current references (`computeTaxonomyUsage`, widened this phase to the `"support_organisation" | "support_professional" | "reporting_destination"` kinds — see `docs/ARCHITECTURE.md`). A Support Organisation can be referenced by Microcards/Rights & Legal Information (`relatedSupportOrganisationIds`), a linked Professional/Destination's `organisationId`, or a Matching Rule; a Professional or Destination only by a Matching Rule today (confirmed by grep). Everything else must be archived instead.

### Published Content Bundle and Admin Backup

Same allow-list treatment as every other domain (`lib/support-directory/organisation-export.ts` / `professional-export.ts` / `destination-export.ts`): `internalNotes`/`verificationNotes`/`sourceNotes` are stripped for `purpose: "published_content"` and kept for Admin Backup. `verificationStatus` itself is **never** stripped — a Published-but-Not-Verified record must remain visibly Not Verified to a frontend consumer, never silently upgraded to "verified" by omission. `publicDisclaimer` (Reporting Destinations) is kept verbatim.

## Phase boundary

**Complete in Phase 2 — Knowledge & Legislation, end to end:** document list with search/sort/pagination/filters (status, jurisdiction, source type, processing status, AI usage, legal review, review-due) and row actions; the 5-step create/edit wizard; local PDF upload/extraction/chunking with safe file replacement and retry; the detail page (source info, dates/governance, legal scope, source file with download, text preview, chunk preview with search, RAG readiness checklist, audit activity); Processing Issues recovery; RAG Readiness summary + filterable table; the local keyword retrieval test; publication and AI-eligibility rules; safe draft deletion vs. archive-only for everything else; the Published Content Bundle / Admin Backup export split; and the Phase 1 admin shell/navigation/Dexie/demo-data/Settings foundation, preserved unchanged.

**Complete in Phase 3 — Incident Types, Triage Labels, Resource Categories, end to end:** full CRUD (list/create/edit/detail) for all three; the shared machine-key policy (suggested, editable pre-save, immutable after); per-entity publish-blocker rules feeding a shared status-graph guard; the canonical usage/dependency/dangling-reference service; hard-delete-vs-archive protection; the Replace References transactional workflow; accessible keyboard-only display-order reordering; extended, cross-referenced demo seed data (including seed audit events, previously missing for these three domains); the Published Content Bundle's taxonomy field allow-list (`internalNotes`/`adminGuidance` stripped) and its dangling-reference export warnings.

**Complete in Phase 4 — Microcards and Rights & Legal Information, end to end:** full CRUD (list/create/edit/detail) for both, sharing the new `PublishableContentRepository<T>` generic factory; per-entity publish-blocker rules (including the legal-claim-content-type/governed-source/disclaimer rule specific to Rights & Legal Information) feeding the same shared status-graph guard taxonomy already used; the Microcard call-to-action policy (typed, stable-id-or-allow-listed-route-or-https-only); review-due-date tracking (`current`/`due soon`/`overdue`); user-facing preview panels on both forms and both detail pages; dependency protection and hard-delete-vs-archive (widened `computeTaxonomyUsage`/`findDanglingTaxonomyReferences` to the `"microcard"`/`"rights_content"` kinds, plus a CTA-target-specific dangling check); Microcard-only accessible reordering; six new Dashboard stat cards; three new Review Queue columns (Review due, Blocking issues, View); the Published Content Bundle/Admin Backup field-allow-list treatment for both domains; and extended, scenario-covering demo seed data (every status, every delete/dependency/legal-source-completeness contrast represented at least once).

**Complete in Phase 5 — Support Organisations, Advocates & Counsellors, and Reporting Destinations, end to end:** full CRUD (list/create/edit/detail) for all three, sharing the `PublishableContentRepository<T>` factory (widened to accept a `getLabel` callback instead of requiring a hardcoded `title` field, so it now serves seven domains without duplication); a shared, honest, five-state verification model (`lib/models/verification.ts`) that is deliberately never consulted by publish-eligibility or status-transition logic — verification and publication are tracked and displayed independently everywhere (List/Detail/Preview/Dashboard/Review Queue/Bundle/Backup), and a published-but-not-verified record always shows a clear "publication does not imply verification" warning rather than either blocking publication or implying a check took place; shared contact-validation and derived-capability helpers (`lib/support-directory/contact.ts`) that compute what a record can safely offer (call, email, visit, book online, etc.) from its real fields rather than from a manually-set boolean, applied via three entity-specific derivation functions; a reporting-method model that is only ever offered on a Reporting Destination when the contact data it depends on is actually present, blocking Ready for review/Publish otherwise; an explicit tri-state (`yes`/`no`/`unknown`) for anonymous-reporting and emergency-suitability so missing information is never displayed as "No"; a professional profile-image feature mirroring the existing PDF Blob-storage pattern (JPEG/PNG/WebP only, no SVG, with an initials fallback and object-URL lifecycle management); organisation ↔ professional/destination relationships stored as a stable `organisationId` (an evidence-based upgrade from the prior free-text `organisation` display-name field, since the old field could never support dependency tracking); jurisdictions upgraded from free text to the typed `AUSTRALIAN_JURISDICTION_VALUES` enum plus an "Australia-wide" flag across all three entities, reusing the Phase 4 precedent set for Rights & Legal Information; dependency protection and hard-delete-vs-archive (`computeTaxonomyUsage` widened again to the three new kinds); ten new Dashboard stat cards and a Review Queue Verification column; the Published Content Bundle/Admin Backup field-allow-list treatment for all three domains, including a `profile-images/` export folder; and extended, scenario-covering demo seed data. While implementing this phase, a genuine pre-existing data-corruption bug was found and fixed in `applyReferenceReplacementPlan()`: its `microcard`/`rights_content`/`support_organisation`/`reporting_destination` branches wrote unconditionally to `incidentTypeIds` regardless of whether the Replace References operation was for an incident type or a resource category, which would have corrupted `resourceCategoryIds` on any of these records the first time a resource-category replacement touched them.

**Deliberately not implemented (later phases):** a matching-rule builder or matching engine, or any create/edit/delete screens for Matching Rules (still shows the Phase 1 `ModuleFoundationPage` honest placeholder); real authentication/roles; a backend of any kind; production RAG/embeddings/a vector database/AI response generation; and frontend consumption of the exported content bundle.

**Known limitations, stated honestly:**

- The multi-tab conflict check (`updateWithVersionCheck`) only detects a conflict at save time — it does not lock a record while someone is editing it, and there is no live "someone else is editing this" indicator. This applies to every domain, including Microcards and Rights & Legal Information.
- Reordering relevant sections (legislation) is not implemented (only add/remove) — there was no existing accessible drag-and-drop pattern in the project to reuse, and building one was judged out of scope. Taxonomy and Microcard display order use an explicit accessible reorder mode instead (Move up/down, no drag-and-drop) rather than solving the general problem.
- The local retrieval test's scoring (token overlap + phrase boost + a small priority boost) is a preview heuristic, not a ranking algorithm suitable for production use.
- E2E coverage exercises the primary success and failure paths named in each phase's brief — it is **critical smoke coverage, not an exhaustive regression suite**, and does not enumerate every combination of filters, every status-transition edge case, or simulate a genuinely corrupted/encrypted PDF (that failure path is covered at the unit level via `PdfExtractionError`). Stabilising the full historical Playwright suite end-to-end was explicitly out of scope for Phase 4 and was not attempted beyond the E2E runner/config improvements already in place (see [Commands](#commands)) — it is not claimed to pass in full.
- One new Microcards smoke test (`tests/e2e/microcards-smoke.spec.ts`, "Add microcard navigates to the create form...") reproducibly hangs on its very first click to a not-yet-visited route in a fresh browser context, consistently across repeated runs, while every other test in both new smoke spec files (17/18) passes reliably. Two real bugs found and fixed while diagnosing it — a link-prefetch concurrency issue (the same class already documented on the sidebar nav, now also fixed on `StatCard`, the Microcards/Rights & Legal Information table title links, and the Review Queue's Title/View links) and a seed-data `displayOrder` collision that broke reorder-list ordering — meaningfully reduced the failure rate (from 4–5 failing tests per run to this one), but did not eliminate this last one. It is documented here rather than chased further, consistent with this phase's explicit instruction not to over-invest in E2E infrastructure work.
- The same first-click-in-a-fresh-context flake recurred in Phase 5's three new smoke spec files, at a notably higher rate than Phase 4 (6/26 failing on the first run vs. 1/18) — every failure was on an "Add X" link or a Dashboard `StatCard` link, i.e. the first interactive click on a freshly loaded page, and every one of the underlying features it was trying to reach is independently verified working by other passing tests using `.goto()`, `.fill()`, `.selectOption()`, and edit/delete flows. `prefetch={false}` (the Phase 4 fix for this exact class) was already applied everywhere the pattern calls for it before this run, so the higher rate is most plausibly explained by Phase 5's larger demo-data volume and page surface area increasing first-paint/hydration cost, not a new distinct bug. Per this phase's explicit instruction not to over-invest in E2E infrastructure stabilisation, this was documented honestly rather than chased further; 20/26 Phase 5 smoke tests pass reliably.
- Taxonomy, Microcard, and Rights & Legal Information forms are single-page (local `useState`), not a multi-step wizard like Knowledge & Legislation — a deliberate simplification given each entity's field count and lack of a multi-stage process like PDF upload, not an oversight.
- Replace References requires the admin to pick a target manually; there is no suggested/"most similar" target, and no bulk multi-source replacement. Microcards and Rights & Legal Information do not have a Replace References workflow at all (only taxonomy does) — a referenced draft must be archived, or its referencing Matching Rule edited directly, since there is no equivalent UI for that yet.
