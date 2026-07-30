"use client";

import { IconArrowDown, IconArrowUp } from "@tabler/icons-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { LOCAL_ADMIN_ACTOR } from "@/lib/models/base";

interface OrderableRecord {
  id: string;
  name: string;
  displayOrder: number;
}

interface ReorderRepository<T extends OrderableRecord> {
  reorder(orderedIds: string[], actor: string): Promise<T[]>;
}

/**
 * Keyboard-only reordering — Move up/Move down buttons, no drag-and-drop.
 * Shared by all three taxonomy list pages. Announces the current position
 * and persists via one repository call per "Save order" click, not per
 * button press, so a sequence of moves is one audit event.
 */
export function ReorderPanel<T extends OrderableRecord>({
  records,
  repository,
  onSaved,
}: {
  records: T[];
  repository: ReorderRepository<T>;
  onSaved?: () => void;
}) {
  const [order, setOrder] = useState<T[]>(() => [...records].sort((a, b) => a.displayOrder - b.displayOrder));
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setOrder([...records].sort((a, b) => a.displayOrder - b.displayOrder));
  }, [records]);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(index, 1);
    next.splice(target, 0, moved!);
    setOrder(next);
    setStatus(`${moved!.name} moved to position ${target + 1} of ${next.length}.`);
  }

  async function handleSave() {
    setIsSaving(true);
    try {
      await repository.reorder(
        order.map((r) => r.id),
        LOCAL_ADMIN_ACTOR
      );
      setStatus("Display order saved.");
      onSaved?.();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <ol className="space-y-2">
        {order.map((record, index) => (
          <li
            key={record.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2.5"
          >
            <span className="text-sm text-foreground">
              <span className="mr-2 text-xs font-semibold text-muted-foreground">{index + 1}.</span>
              {record.name}
            </span>
            <span className="flex gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Move ${record.name} up`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
              >
                <IconArrowUp size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === order.length - 1}
                aria-label={`Move ${record.name} down`}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-secondary disabled:pointer-events-none disabled:opacity-40"
              >
                <IconArrowDown size={16} aria-hidden="true" />
              </button>
            </span>
          </li>
        ))}
      </ol>
      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Saving order…" : "Save order"}
        </Button>
        <p role="status" aria-live="polite" className="text-xs text-muted-foreground">
          {status}
        </p>
      </div>
    </div>
  );
}
