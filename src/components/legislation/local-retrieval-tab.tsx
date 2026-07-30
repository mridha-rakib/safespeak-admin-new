"use client";

import { IconSearch } from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { useCrudList } from "@/hooks/use-crud-list";
import { useAllDocumentChunks } from "@/hooks/use-all-document-chunks";
import { AUSTRALIAN_JURISDICTIONS, jurisdictionLabel } from "@/lib/jurisdictions";
import { searchLocalChunks, type RetrievalScope } from "@/lib/legislation/retrieval";
import type { DocumentRecord } from "@/lib/models/document";

const selectClass =
  "h-10 rounded-full border border-input bg-card px-4 text-sm text-foreground focus-visible:outline-none";

export function LocalRetrievalTab({ documents }: { documents: DocumentRecord[] | undefined }) {
  const chunksByDocumentId = useAllDocumentChunks(documents);
  const incidentTypes = useCrudList((repo) => repo.incidentTypes);

  const [query, setQuery] = useState("");
  const [jurisdiction, setJurisdiction] = useState<string>("all");
  const [incidentTypeId, setIncidentTypeId] = useState<string>("all");
  const [scope, setScope] = useState<RetrievalScope>("published_ai_eligible");
  const [limit, setLimit] = useState(5);
  const [hasSearched, setHasSearched] = useState(false);

  const results = useMemo(() => {
    if (!documents || !chunksByDocumentId || !hasSearched) return [];
    return searchLocalChunks(documents, chunksByDocumentId, query, {
      jurisdiction: jurisdiction === "all" ? undefined : jurisdiction,
      incidentTypeId: incidentTypeId === "all" ? undefined : incidentTypeId,
      scope,
      limit,
    });
  }, [documents, chunksByDocumentId, query, jurisdiction, incidentTypeId, scope, limit, hasSearched]);

  return (
    <div className="space-y-5">
      <Alert tone="info" title="Local keyword retrieval preview">
        This searches already-generated local chunk previews using keyword overlap — no embeddings are
        generated, no AI API is called, and no server or vector database is used. Results do not represent
        production AI behaviour.
      </Alert>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setHasSearched(true);
        }}
        className="space-y-3 rounded-xl border border-border bg-card p-4"
      >
        <label className="block">
          <span className="sr-only">Test query</span>
          <div className="relative">
            <IconSearch size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try: racial discrimination in the workplace"
              className="pl-9"
            />
          </div>
        </label>

        <div className="flex flex-wrap gap-2">
          <select className={selectClass} value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}>
            <option value="all">All jurisdictions</option>
            {AUSTRALIAN_JURISDICTIONS.map((j) => (
              <option key={j.value} value={j.value}>
                {j.label}
              </option>
            ))}
          </select>

          <select className={selectClass} value={incidentTypeId} onChange={(e) => setIncidentTypeId(e.target.value)}>
            <option value="all">All incident categories</option>
            {incidentTypes?.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>

          <select className={selectClass} value={scope} onChange={(e) => setScope(e.target.value as RetrievalScope)}>
            <option value="published_ai_eligible">Published, AI-eligible only</option>
            <option value="all_processed">All locally processed (admin testing)</option>
          </select>

          <select className={selectClass} value={limit} onChange={(e) => setLimit(Number(e.target.value))}>
            {[5, 10, 20].map((n) => (
              <option key={n} value={n}>
                Up to {n} results
              </option>
            ))}
          </select>

          <button type="submit" className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            Search local chunks
          </button>
        </div>
      </form>

      {hasSearched && results.length === 0 ? (
        <EmptyState
          title="No local chunks matched"
          description="No stored chunk contained overlapping keywords for this query. Try different words, or check your jurisdiction/category filters and whether the source document has been locally extracted."
        />
      ) : null}

      {results.length > 0 ? (
        <ul className="space-y-3">
          {results.map((result, index) => (
            <li key={`${result.documentId}-${index}`}>
              <Card>
                <CardContent className="space-y-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-foreground">{result.documentTitle}</p>
                    <Badge tone="neutral">{result.documentStatus.replace(/_/g, " ")}</Badge>
                    <Badge tone={result.aiUsagePermission ? "success" : "neutral"}>
                      {result.aiUsagePermission ? "AI use allowed" : "AI use not allowed"}
                    </Badge>
                    <Badge tone="primary">Score {result.score.toFixed(1)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {result.authorityOrPublisher ?? "Unknown authority"} · {jurisdictionLabel(result.jurisdiction)}
                    {result.pageStart ? ` · Pages ${result.pageStart}${result.pageEnd && result.pageEnd !== result.pageStart ? `–${result.pageEnd}` : ""}` : ""}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm text-foreground">{result.chunkText}</p>
                  <p className="text-xs text-muted-foreground">Matched terms: {result.matchedTerms.join(", ")}</p>
                  {result.includedReason ? (
                    <p className="text-xs text-warning">{result.includedReason}</p>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
