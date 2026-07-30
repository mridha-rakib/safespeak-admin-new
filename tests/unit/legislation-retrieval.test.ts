import assert from "node:assert/strict";
import test from "node:test";

import { scoreChunkText, searchLocalChunks, tokenizeQuery } from "../../src/lib/legislation/retrieval";
import type { DocumentChunk } from "../../src/lib/models/document";
import { makeTestDocument } from "./helpers/document-fixture";

test("tokenizeQuery lowercases, strips punctuation, and removes stop words", () => {
  assert.deepEqual(tokenizeQuery("What is Racial Discrimination?"), ["what", "racial", "discrimination"]);
});

test("tokenizeQuery drops single-character tokens", () => {
  assert.deepEqual(tokenizeQuery("a b racial"), ["racial"]);
});

test("an empty or stop-word-only query tokenizes to nothing", () => {
  assert.deepEqual(tokenizeQuery("the a of"), []);
});

test("scoreChunkText counts token occurrences and boosts an exact phrase match", () => {
  const tokens = tokenizeQuery("racial discrimination");
  const { score, matchedTerms } = scoreChunkText(tokens, "racial discrimination", "This is about racial discrimination in employment.");
  assert.ok(score >= 2 + 5); // one occurrence each token + phrase boost
  assert.deepEqual(matchedTerms.sort(), ["discrimination", "racial"]);
});

test("scoreChunkText returns zero for completely unrelated text", () => {
  const tokens = tokenizeQuery("racial discrimination");
  const { score, matchedTerms } = scoreChunkText(tokens, "racial discrimination", "This text is about gardening and cooking.");
  assert.equal(score, 0);
  assert.deepEqual(matchedTerms, []);
});

function makeChunk(documentId: string, text: string, overrides: Partial<DocumentChunk> = {}): DocumentChunk {
  return {
    id: `${documentId}-chunk`,
    documentId,
    chunkIndex: 0,
    text,
    characterCount: text.length,
    localOnly: true,
    createdAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

test("searchLocalChunks finds a matching chunk and reports the owning document", () => {
  const doc = makeTestDocument({ id: "doc-1", title: "Discrimination Act Summary" });
  const chunks = new Map([[doc.id, [makeChunk(doc.id, "This section prohibits racial discrimination in employment.")]]]);

  const results = searchLocalChunks([doc], chunks, "racial discrimination", { scope: "published_ai_eligible" });

  assert.equal(results.length, 1);
  assert.equal(results[0]!.documentId, "doc-1");
  assert.equal(results[0]!.documentTitle, "Discrimination Act Summary");
  assert.ok(results[0]!.matchedTerms.includes("racial"));
});

test("searchLocalChunks in published_ai_eligible scope excludes a document that is not AI-eligible", () => {
  const eligibleDoc = makeTestDocument({ id: "doc-eligible" });
  const draftDoc = makeTestDocument({ id: "doc-draft", status: "draft" });
  const chunks = new Map([
    [eligibleDoc.id, [makeChunk(eligibleDoc.id, "racial discrimination guidance")]],
    [draftDoc.id, [makeChunk(draftDoc.id, "racial discrimination draft notes")]],
  ]);

  const results = searchLocalChunks([eligibleDoc, draftDoc], chunks, "racial discrimination", {
    scope: "published_ai_eligible",
  });

  assert.equal(results.length, 1);
  assert.equal(results[0]!.documentId, "doc-eligible");
});

test("searchLocalChunks in all_processed scope includes a non-eligible document with an inclusion reason", () => {
  const draftDoc = makeTestDocument({ id: "doc-draft", status: "draft" });
  const chunks = new Map([[draftDoc.id, [makeChunk(draftDoc.id, "racial discrimination draft notes")]]]);

  const results = searchLocalChunks([draftDoc], chunks, "racial discrimination", { scope: "all_processed" });

  assert.equal(results.length, 1);
  assert.ok(results[0]!.includedReason);
});

test("searchLocalChunks excludes a document that has not been locally extracted, in either scope", () => {
  const notExtracted = makeTestDocument({
    id: "doc-not-extracted",
    extractionStatus: "not_extracted",
    localPreviewStatus: "unavailable",
  });
  const chunks = new Map<string, DocumentChunk[]>();

  const results = searchLocalChunks([notExtracted], chunks, "racial discrimination", { scope: "all_processed" });
  assert.equal(results.length, 0);
});

test("searchLocalChunks respects a jurisdiction filter", () => {
  const nsw = makeTestDocument({ id: "doc-nsw", jurisdiction: "nsw" });
  const vic = makeTestDocument({ id: "doc-vic", jurisdiction: "vic" });
  const chunks = new Map([
    [nsw.id, [makeChunk(nsw.id, "racial discrimination in nsw")]],
    [vic.id, [makeChunk(vic.id, "racial discrimination in vic")]],
  ]);

  const results = searchLocalChunks([nsw, vic], chunks, "racial discrimination", {
    scope: "all_processed",
    jurisdiction: "nsw",
  });

  assert.equal(results.length, 1);
  assert.equal(results[0]!.documentId, "doc-nsw");
});

test("searchLocalChunks respects an incident-category filter", () => {
  const matching = makeTestDocument({ id: "doc-match", incidentTypeIds: ["incident-a"] });
  const other = makeTestDocument({ id: "doc-other", incidentTypeIds: ["incident-b"] });
  const chunks = new Map([
    [matching.id, [makeChunk(matching.id, "racial discrimination category a")]],
    [other.id, [makeChunk(other.id, "racial discrimination category b")]],
  ]);

  const results = searchLocalChunks([matching, other], chunks, "racial discrimination", {
    scope: "all_processed",
    incidentTypeId: "incident-a",
  });

  assert.equal(results.length, 1);
  assert.equal(results[0]!.documentId, "doc-match");
});

test("searchLocalChunks returns no results for an unmatched query rather than inventing an answer", () => {
  const doc = makeTestDocument({ id: "doc-1" });
  const chunks = new Map([[doc.id, [makeChunk(doc.id, "This text is entirely about gardening.")]]]);

  const results = searchLocalChunks([doc], chunks, "racial discrimination", { scope: "all_processed" });
  assert.deepEqual(results, []);
});

test("searchLocalChunks results are sorted by score, highest first", () => {
  const doc = makeTestDocument({ id: "doc-1" });
  const chunks = new Map([
    [
      doc.id,
      [
        makeChunk(doc.id, "racial", { id: "low", chunkIndex: 0 }),
        makeChunk(doc.id, "racial discrimination racial discrimination", { id: "high", chunkIndex: 1 }),
      ],
    ],
  ]);

  const results = searchLocalChunks([doc], chunks, "racial discrimination", { scope: "all_processed" });
  assert.ok(results[0]!.score >= results[1]!.score);
});
