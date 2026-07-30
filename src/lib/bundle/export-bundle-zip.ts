import type { ContentBundle } from "@/lib/bundle/export-bundle";
import type { BundleManifest } from "@/lib/models/content-bundle";
import type { AdminContentRepository } from "@/lib/repositories/admin-content-repository";

/** Both DocumentRecord and PublishedLegislationExport satisfy this — the legislation array's exact shape depends on bundle purpose. */
interface ExportedFileRef {
  id: string;
  file?: { fileName: string };
}

/** Both SupportProfessional and PublishedProfessionalExport satisfy this — the supportProfessionals array's exact shape depends on bundle purpose. */
interface ExportedProfileImageRef {
  id: string;
  profilePhoto?: { fileName: string };
}

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
  const legislation = bundle.data.legislation as ExportedFileRef[];
  for (const doc of legislation) {
    if (!doc.file) continue;
    const blob = await repository.documents.getFileBlob(doc.id);
    if (blob) {
      documentsFolder?.file(`${doc.id}-${doc.file.fileName}`, blob);
    }
  }

  const profileImagesFolder = zip.folder("profile-images");
  const professionals = bundle.data.supportProfessionals as ExportedProfileImageRef[];
  for (const professional of professionals) {
    if (!professional.profilePhoto) continue;
    const blob = await repository.supportProfessionals.getProfileImage(professional.id);
    if (blob) {
      profileImagesFolder?.file(`${professional.id}-${professional.profilePhoto.fileName}`, blob);
    }
  }

  const zipBlob = (await zip.generateAsync({ type: "blob" })) as Blob;
  return { blob: zipBlob, manifest };
}
