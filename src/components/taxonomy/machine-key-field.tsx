"use client";

import { Input, Label } from "@/components/ui/input";
import { MACHINE_KEY_HELP_TEXT } from "@/lib/taxonomy/machine-key";

/**
 * Shared by all three taxonomy create/edit forms. Before first save the key
 * is a normal editable field (pre-filled from the suggested slug); after
 * first save it is permanently read-only — see README "Stable machine-key
 * policy" for why (matching rules and other content reference taxonomy
 * records by id, but a human- and integration-readable key is what a future
 * import/export script would key off).
 */
export function MachineKeyField({
  value,
  onChange,
  locked,
  error,
}: {
  value: string;
  onChange?: (next: string) => void;
  locked: boolean;
  error?: string;
}) {
  if (locked) {
    return (
      <div className="space-y-1.5">
        <Label htmlFor="machineKey">Stable key</Label>
        <Input id="machineKey" value={value} readOnly aria-readonly="true" className="bg-secondary/40 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          This key cannot be changed after creation. Matching rules and other content may already depend on
          it.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor="machineKey">Stable key</Label>
      <Input
        id="machineKey"
        value={value}
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange?.(event.target.value)}
      />
      <p className="text-xs text-muted-foreground">
        {MACHINE_KEY_HELP_TEXT} Suggested from the name — you can still edit it now, but not after this
        record is first saved.
      </p>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
