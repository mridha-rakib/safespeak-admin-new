import type { ContentBundle } from "@/lib/bundle/export-bundle";
import type { BundleManifest } from "@/lib/models/content-bundle";
import type { DocumentRecord } from "@/lib/models/document";
import type { AdminContentRepository } from "@/lib/repositories/admin-content-repository";

export interface ZipBundleResult {
  blob: Blob;
  manifest: BundleManifest;
}

/**
 * Packages the same validated data as the JSON export, plus the raw PDF
 * bytes for any document that has one stored locally. No object URLs and no
 * local file-system paths are written into the archive — files are added by
 * name only.
 */
export async function buildZipBundle(
  repository: AdminContentRepository,
  bundle: ContentBundle
): Promise<ZipBundleResult> {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  const manifest: BundleManifest = {
    ...bundle.manifest,
    format: "zip",
    includesDocumentFiles: true,
  };

  zip.file("manifest.json", JSON.stringify(manifest, null, 2));

  const dataFolder = zip.folder("data");
  for (const [domain, records] of Object.entries(bundle.data)) {
    dataFolder?.file(`${domain}.json`, JSON.stringify(records, null, 2));
  }

  const documentsFolder = zip.folder("documents");
  const legislation = bundle.data.legislation as DocumentRecord[];
  for (const doc of legislation) {
    if (!doc.file) continue;
    const blob = await repository.documents.getFileBlob(doc.id);
    if (blob) {
      documentsFolder?.file(`${doc.id}-${doc.file.fileName}`, blob);
    }
  }

  const zipBlob = (await zip.generateAsync({ type: "blob" })) as Blob;
  return { blob: zipBlob, manifest };
}
