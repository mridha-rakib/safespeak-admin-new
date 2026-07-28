import { chunkExtractedPages, type ExtractedPage } from "@/lib/pdf/chunk-text";
import type { DocumentChunk } from "@/lib/models/document";

export interface PdfExtractionProgress {
  pagesProcessed: number;
  totalPages: number;
}

export interface PdfExtractionResult {
  fullText: string;
  pageCount: number;
  preview: string;
  chunks: DocumentChunk[];
}

export class PdfExtractionError extends Error {
  constructor(
    message: string,
    public readonly kind: "encrypted" | "corrupted" | "empty" | "unknown"
  ) {
    super(message);
    this.name = "PdfExtractionError";
  }
}

const PREVIEW_MAX_CHARS = 1200;

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      window.requestIdleCallback(() => resolve(), { timeout: 50 });
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * Local, browser-only text extraction and chunk preview — NOT production RAG
 * indexing. Nothing here calls a server, generates embeddings, or writes to
 * a vector database. See README "Why this is not production RAG indexing".
 */
export async function extractPdfText(
  file: File,
  documentId: string,
  onProgress?: (progress: PdfExtractionProgress) => void
): Promise<PdfExtractionResult> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();

  let pdf;
  try {
    // standardFontDataUrl points at the copy of pdfjs-dist's standard_fonts
    // in public/ — without it, text using the built-in (non-embedded) PDF
    // base fonts can be extracted incorrectly or truncated.
    pdf = await pdfjsLib.getDocument({ data: arrayBuffer, standardFontDataUrl: "/pdfjs/standard_fonts/" })
      .promise;
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "PasswordException") {
      throw new PdfExtractionError(
        "This PDF is password-protected and can't be read locally. Remove the password and try again.",
        "encrypted"
      );
    }
    throw new PdfExtractionError(
      "This file couldn't be read as a PDF. It may be corrupted or in an unsupported format.",
      "corrupted"
    );
  }

  const totalPages = pdf.numPages;
  if (totalPages === 0) {
    throw new PdfExtractionError("This PDF has no pages to preview.", "empty");
  }

  const pages: ExtractedPage[] = [];

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();

    pages.push({ pageNumber, text });
    onProgress?.({ pagesProcessed: pageNumber, totalPages });

    // Yields between pages so a large document doesn't freeze the UI thread.
    await yieldToMain();
  }

  const fullText = pages.map((p) => p.text).join("\n\n");

  if (fullText.trim().length === 0) {
    throw new PdfExtractionError(
      "No extractable text was found in this PDF. It may be a scanned image without a text layer.",
      "empty"
    );
  }

  const chunks = chunkExtractedPages(pages, documentId);
  const preview =
    fullText.length > PREVIEW_MAX_CHARS ? `${fullText.slice(0, PREVIEW_MAX_CHARS)}…` : fullText;

  return { fullText, pageCount: totalPages, preview, chunks };
}
