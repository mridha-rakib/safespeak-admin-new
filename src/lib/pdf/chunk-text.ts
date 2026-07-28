import { newId, nowIso } from "@/lib/models/base";
import type { DocumentChunk } from "@/lib/models/document";

export interface ExtractedPage {
  pageNumber: number;
  text: string;
}

const TARGET_CHUNK_CHARS = 900;

/**
 * Deterministic, character-budget chunking for the LOCAL PREVIEW only — not
 * a production chunking/embedding strategy. Pages are concatenated in order
 * and split once a chunk crosses TARGET_CHUNK_CHARS, so the same input
 * always produces the same chunks.
 */
export function chunkExtractedPages(pages: ExtractedPage[], documentId: string): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const createdAt = nowIso();

  let buffer = "";
  let bufferPageStart: number | null = null;
  let bufferPageEnd: number | null = null;
  let chunkIndex = 0;

  const flush = () => {
    const text = buffer.trim();
    if (text.length === 0) {
      buffer = "";
      bufferPageStart = null;
      bufferPageEnd = null;
      return;
    }
    chunks.push({
      id: newId(),
      documentId,
      pageStart: bufferPageStart ?? undefined,
      pageEnd: bufferPageEnd ?? undefined,
      chunkIndex,
      text,
      characterCount: text.length,
      localOnly: true,
      createdAt,
    });
    chunkIndex += 1;
    buffer = "";
    bufferPageStart = null;
    bufferPageEnd = null;
  };

  for (const page of pages) {
    const pageText = page.text.trim();
    if (pageText.length === 0) continue;

    if (bufferPageStart === null) bufferPageStart = page.pageNumber;
    bufferPageEnd = page.pageNumber;
    buffer += (buffer ? "\n\n" : "") + pageText;

    if (buffer.length >= TARGET_CHUNK_CHARS) {
      flush();
    }
  }

  flush();

  return chunks;
}
