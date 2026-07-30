"use client";

import { ReorderPanel } from "@/components/taxonomy/reorder-panel";
import type { Microcard } from "@/lib/models/microcard";

interface MicrocardRepository {
  reorder(orderedIds: string[], actor: string): Promise<Microcard[]>;
}

/**
 * Thin adapter over the shared taxonomy `ReorderPanel` (Move up/Move down,
 * one "Save order" write), which expects each row to carry a `name` field —
 * Microcards call the equivalent field `title`, so rows are mapped rather
 * than changing the shared component's contract for every other caller.
 */
export function MicrocardReorderPanel({ records, repository }: { records: Microcard[]; repository: MicrocardRepository }) {
  const rows = records.map((r) => ({ id: r.id, name: r.title, displayOrder: r.displayOrder }));

  return (
    <ReorderPanel
      records={rows}
      repository={{
        async reorder(orderedIds, actor) {
          const updated = await repository.reorder(orderedIds, actor);
          return updated.map((r) => ({ id: r.id, name: r.title, displayOrder: r.displayOrder }));
        },
      }}
    />
  );
}
