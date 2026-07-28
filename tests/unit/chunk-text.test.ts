import assert from "node:assert/strict";
import test from "node:test";

import { chunkExtractedPages, type ExtractedPage } from "../../src/lib/pdf/chunk-text";

test("chunking the same pages twice produces identical chunk boundaries", () => {
  const pages: ExtractedPage[] = [
    { pageNumber: 1, text: "Section one. ".repeat(40) },
    { pageNumber: 2, text: "Section two. ".repeat(40) },
    { pageNumber: 3, text: "Section three. ".repeat(40) },
  ];

  const first = chunkExtractedPages(pages, "doc-1");
  const second = chunkExtractedPages(pages, "doc-1");

  assert.equal(first.length, second.length);
  for (let i = 0; i < first.length; i += 1) {
    assert.equal(first[i]!.text, second[i]!.text);
    assert.equal(first[i]!.pageStart, second[i]!.pageStart);
    assert.equal(first[i]!.pageEnd, second[i]!.pageEnd);
    assert.equal(first[i]!.chunkIndex, i);
  }
});

test("blank pages are skipped and do not produce empty chunks", () => {
  const pages: ExtractedPage[] = [
    { pageNumber: 1, text: "Real content here." },
    { pageNumber: 2, text: "   " },
    { pageNumber: 3, text: "" },
  ];

  const chunks = chunkExtractedPages(pages, "doc-2");
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0]!.pageStart, 1);
  assert.equal(chunks[0]!.pageEnd, 1);
});

test("every chunk carries localOnly: true and a positive character count", () => {
  const pages: ExtractedPage[] = [{ pageNumber: 1, text: "Some extracted text." }];
  const chunks = chunkExtractedPages(pages, "doc-3");

  assert.equal(chunks.length, 1);
  assert.equal(chunks[0]!.localOnly, true);
  assert.ok(chunks[0]!.characterCount > 0);
  assert.equal(chunks[0]!.characterCount, chunks[0]!.text.length);
});

test("no pages with content produces no chunks", () => {
  const chunks = chunkExtractedPages([], "doc-4");
  assert.equal(chunks.length, 0);
});
