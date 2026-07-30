"use client";

import { useMemo, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import type { DocumentChunk } from "@/lib/models/document";

const PAGE_SIZE = 5;

/** Search + client-side pagination over a document's (already small) chunk list — never renders every chunk at once. */
export function ChunkPreviewList({ chunks }: { chunks: DocumentChunk[] }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return chunks;
    return chunks.filter((chunk) => chunk.text.toLowerCase().includes(normalized));
  }, [chunks, query]);

  const totalPages = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const pageChunks = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  if (chunks.length === 0) {
    return (
      <EmptyState
        title="No local chunk preview yet"
        description="Chunks are generated automatically once a PDF has been locally extracted."
      />
    );
  }

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="sr-only">Search within local chunks</span>
        <Input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
          placeholder="Search within local chunks..."
        />
      </label>

      {filtered.length === 0 ? (
        <EmptyState title="No chunks match your search" description="Try a different word or clear the search box." />
      ) : (
        <ul className="space-y-2">
          {pageChunks.map((chunk) => (
            <li key={chunk.id} className="rounded-xl border border-border bg-secondary/20 p-3">
              <div className="mb-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Chunk {chunk.chunkIndex + 1}</span>
                {chunk.pageStart ? (
                  <span>
                    Pages {chunk.pageStart}
                    {chunk.pageEnd && chunk.pageEnd !== chunk.pageStart ? `–${chunk.pageEnd}` : ""}
                  </span>
                ) : null}
                <span>{chunk.characterCount} characters</span>
              </div>
              <p className="whitespace-pre-wrap break-words text-sm text-foreground">{chunk.text}</p>
            </li>
          ))}
        </ul>
      )}

      {filtered.length > PAGE_SIZE ? (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(p - 1, 0))}
              disabled={page === 0}
              className="rounded-full border border-border px-3 py-1 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
              disabled={page >= totalPages - 1}
              className="rounded-full border border-border px-3 py-1 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
