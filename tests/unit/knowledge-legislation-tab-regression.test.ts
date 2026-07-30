import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { summarizeReadiness } from "../../src/lib/legislation/readiness";
import { searchLocalChunks } from "../../src/lib/legislation/retrieval";
import type { DocumentChunk } from "../../src/lib/models/document";
import { makeTestDocument } from "./helpers/document-fixture";

/**
 * Regression coverage for the Knowledge & Legislation tab-freeze
 * investigation. The confirmed root cause of the reported freeze/unstyled
 * symptoms was a stale `.next` dev-build directory (see
 * docs/ARCHITECTURE.md "Knowledge & Legislation tab regression"), not a
 * source-code infinite loop — an 80-click/20-round automated stress test
 * against a freshly-restarted dev server produced zero console errors and
 * consistent sub-300ms tab switches. These tests lock in the one real,
 * evidence-backed inefficiency the audit did find (each tab independently
 * re-querying `useDocuments()` on every mount, since the shared `Tabs`
 * component unmounts inactive panels) so it can't silently regress, plus the
 * bounded/deterministic behaviour of the pure aggregation functions each tab
 * depends on when given missing/empty data.
 */

const LEGISLATION_COMPONENTS_DIR = join(__dirname, "../../src/components/legislation");

function readComponentSource(fileName: string): string {
  return readFileSync(join(LEGISLATION_COMPONENTS_DIR, fileName), "utf8");
}

test("RagReadinessTab, ProcessingIssuesTab, and LocalRetrievalTab no longer call useDocuments() themselves", () => {
  // Each tab used to independently subscribe to the documents table on every
  // mount (a fresh Dexie live-query every single tab switch, since the
  // custom Tabs component fully unmounts inactive panels). The page now
  // reads the document list once and passes it down as a prop — this test
  // pins that down so a future edit can't silently reintroduce N duplicate
  // subscriptions where one shared read is intended.
  for (const file of ["rag-readiness-tab.tsx", "processing-issues-tab.tsx", "local-retrieval-tab.tsx"]) {
    const source = readComponentSource(file);
    assert.equal(
      /\buseDocuments\s*\(/.test(source),
      false,
      `${file} should receive \`documents\` as a prop, not call useDocuments() itself`
    );
    assert.match(source, /documents:\s*DocumentRecord\[\]\s*\|\s*undefined/, `${file} should accept a typed \`documents\` prop`);
  }
});

test("the page passes the same documents value to every tab (one shared read, not one per tab)", () => {
  const pageSource = readFileSync(join(__dirname, "../../src/app/content/knowledge-legislation/page.tsx"), "utf8");
  const passedProps = [...pageSource.matchAll(/documents=\{documents\}/g)];
  assert.equal(passedProps.length, 3, "expected all three heavier tabs (RAG readiness, Processing issues, Test retrieval) to receive the same `documents` reference");
});

test("summarizeReadiness is bounded and deterministic for an empty document list", () => {
  const result = summarizeReadiness([]);
  assert.deepEqual(result, {
    totalDocuments: 0,
    locallyProcessed: 0,
    readyForAiProcessing: 0,
    publishedAiPermitted: 0,
    awaitingLegalReview: 0,
    missingAiPermission: 0,
    processingIssues: 0,
    overdueForReview: 0,
    archived: 0,
  });
});

test("searchLocalChunks never throws and returns no results for an empty document list", () => {
  const results = searchLocalChunks([], new Map(), "racial discrimination", { scope: "published_ai_eligible" });
  assert.deepEqual(results, []);
});

test("searchLocalChunks handles a document with no chunk entry in the map at all (missing data, not a loop)", () => {
  const doc = makeTestDocument({ id: "doc-no-chunks" });
  const results = searchLocalChunks([doc], new Map(), "racial discrimination", { scope: "published_ai_eligible" });
  assert.deepEqual(results, []);
});

test("searchLocalChunks is deterministic across repeated calls with the same input", () => {
  const doc = makeTestDocument({ id: "doc-1", title: "Discrimination Act Summary" });
  const chunks = new Map<string, DocumentChunk[]>([
    [
      doc.id,
      [
        {
          id: "chunk-1",
          documentId: doc.id,
          chunkIndex: 0,
          text: "This section prohibits racial discrimination in employment.",
          characterCount: 60,
          localOnly: true,
          createdAt: "2026-06-01T00:00:00.000Z",
        },
      ],
    ],
  ]);

  const first = searchLocalChunks([doc], chunks, "racial discrimination", { scope: "published_ai_eligible" });
  const second = searchLocalChunks([doc], chunks, "racial discrimination", { scope: "published_ai_eligible" });
  assert.deepEqual(first, second);
});

test("the shared Tabs component unmounts inactive panels rather than mounting all four simultaneously", () => {
  // Confirms the already-correct behaviour the audit relied on: an inactive
  // tab panel is not merely hidden (which would leave its subscriptions and
  // computations running), it is unmounted, so an inactive tab performs no
  // ongoing work. See src/components/ui/tabs.tsx `TabsContent`.
  const tabsSource = readFileSync(join(__dirname, "../../src/components/ui/tabs.tsx"), "utf8");
  assert.match(tabsSource, /if \(!selected && !forceMount\) return null;/);
});

test("TabsList constrains its own width instead of forcing page-level horizontal overflow", () => {
  // A 4-tab row ("Documents" / "RAG readiness" / "Processing issues" /
  // "Test retrieval") is wider than a narrow mobile viewport. TabsList is a
  // flex item inside the shared page shell's flex column, which defaults to
  // min-width:auto — without an explicit width constraint here, the tab
  // row's intrinsic content width pushes the whole page wider than the
  // viewport instead of scrolling within its own bounds.
  const tabsSource = readFileSync(join(__dirname, "../../src/components/ui/tabs.tsx"), "utf8");
  assert.match(tabsSource, /max-w-full/);
  assert.match(tabsSource, /overflow-x-auto/);
});
