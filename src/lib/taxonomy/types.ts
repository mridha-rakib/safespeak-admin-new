import type { ContentStatus } from "@/lib/models/base";

/**
 * The shape every generic taxonomy component/hook/repository method relies
 * on. Defined once so `TaxonomyRepository<T>`, `TaxonomyStatusActions<T>`,
 * `TaxonomyRowActions<T>`, `ReplaceReferencesDialog<T>`, and the taxonomy
 * hooks all constrain `T` identically instead of each redeclaring a
 * slightly different local shape.
 */
export interface TaxonomyEntity {
  id: string;
  name: string;
  machineKey: string;
  status: ContentStatus;
  displayOrder: number;
}
