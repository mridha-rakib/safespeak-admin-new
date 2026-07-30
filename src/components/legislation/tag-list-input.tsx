"use client";

import { IconPlus, IconX } from "@tabler/icons-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeTags } from "@/lib/legislation/document-form-schema";

/** Shared repeatable-list-of-strings control for both Tags and Relevant Sections — add on Enter, remove via the × button, de-duped and trimmed. */
export function TagListInput({
  label,
  helpText,
  placeholder,
  values,
  onChange,
}: {
  label: string;
  helpText?: string;
  placeholder?: string;
  values: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const [duplicateWarning, setDuplicateWarning] = useState(false);
  const inputId = useId();

  function commitDraft() {
    const trimmed = draft.trim();
    if (!trimmed) return;
    const alreadyPresent = values.some((v) => v.toLowerCase() === trimmed.toLowerCase());
    if (alreadyPresent) {
      setDuplicateWarning(true);
      setDraft("");
      return;
    }
    onChange(normalizeTags([...values, trimmed]));
    setDraft("");
    setDuplicateWarning(false);
  }

  function removeAt(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="text-sm font-semibold text-foreground">
        {label}
      </label>
      {helpText ? <p className="text-xs text-muted-foreground">{helpText}</p> : null}
      <div className="flex gap-2">
        <Input
          id={inputId}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => {
            setDraft(event.target.value);
            setDuplicateWarning(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commitDraft();
            }
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={commitDraft}>
          <IconPlus size={16} aria-hidden="true" />
          Add
        </Button>
      </div>
      {duplicateWarning ? (
        <p role="status" className="text-xs text-warning">
          That entry is already in the list.
        </p>
      ) : null}
      {values.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {values.map((value, index) => (
            <li
              key={`${value}-${index}`}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 py-1 pl-3 pr-1.5 text-xs text-foreground"
            >
              {value}
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label={`Remove ${value}`}
                className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <IconX size={12} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">Nothing added yet.</p>
      )}
    </div>
  );
}
