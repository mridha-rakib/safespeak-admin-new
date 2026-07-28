export const DEFAULT_PDF_MAX_BYTES = 20 * 1024 * 1024; // 20MB, configurable via AppSettings.pdfMaxFileSizeBytes

export interface PdfValidationResult {
  valid: boolean;
  reason?: string;
}

export function validatePdfFile(file: File, maxBytes: number = DEFAULT_PDF_MAX_BYTES): PdfValidationResult {
  const looksLikePdfType = file.type === "application/pdf" || file.type === "";
  const looksLikePdfName = file.name.toLowerCase().endsWith(".pdf");

  if (!looksLikePdfType || !looksLikePdfName) {
    return { valid: false, reason: "Only PDF files can be uploaded here." };
  }

  if (file.size === 0) {
    return { valid: false, reason: "This file is empty and has no content to preview." };
  }

  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / (1024 * 1024));
    return { valid: false, reason: `This file is larger than the ${maxMb}MB local preview limit.` };
  }

  return { valid: true };
}
