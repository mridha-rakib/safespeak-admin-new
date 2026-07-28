import assert from "node:assert/strict";
import test from "node:test";

import { validatePdfFile } from "../../src/lib/pdf/validate-pdf-file";

function makeFile(name: string, type: string, sizeBytes: number): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

test("accepts a normally-sized PDF", () => {
  const file = makeFile("legislation.pdf", "application/pdf", 1024);
  assert.equal(validatePdfFile(file).valid, true);
});

test("rejects a non-PDF file type", () => {
  const file = makeFile("notes.docx", "application/vnd.openxmlformats", 1024);
  const result = validatePdfFile(file);
  assert.equal(result.valid, false);
  assert.match(result.reason ?? "", /PDF/);
});

test("rejects an empty file", () => {
  const file = makeFile("empty.pdf", "application/pdf", 0);
  const result = validatePdfFile(file);
  assert.equal(result.valid, false);
  assert.match(result.reason ?? "", /empty/i);
});

test("rejects a file larger than the configured limit", () => {
  const file = makeFile("huge.pdf", "application/pdf", 2000);
  const result = validatePdfFile(file, 1000);
  assert.equal(result.valid, false);
  assert.match(result.reason ?? "", /larger/i);
});

test("respects a custom max size when the file fits", () => {
  const file = makeFile("small.pdf", "application/pdf", 500);
  assert.equal(validatePdfFile(file, 1000).valid, true);
});
