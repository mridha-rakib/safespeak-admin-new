import { hasSuccessfulExtraction, isAiEligible } from "@/lib/legislation/readiness";
import type { ContentStatus } from "@/lib/models/base";
import type { DocumentChunk, DocumentRecord } from "@/lib/models/document";

/**
 * A deterministic, browser-local keyword-overlap search over already-stored
 * chunk previews. This is NOT semantic search: no embeddings are generated,
 * nothing is sent to a server, and no vector database is involved. It exists
 * so an administrator can sanity-check that a document's local chunks would
 * plausibly surface for a given query — it is a preview tool, not a
 * retrieval engine.
 */

const STOP_WORDS = new Set([
  "the", "a", "an", "of", "in", "on", "for", "to", "and", "or", "is", "are",
  "was", "were", "be", "by", "at", "with", "this", "that", "it", "as",
  "from", "about", "into", "than", "then", "so", "if", "not",
]);

export function tokenizeQuery(query: string): string[] {
  return query
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
}

export interface ChunkScore {
  score: number;
  matchedTerms: string[];
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle.length === 0) return 0;
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

/** Token-overlap score plus an exact-phrase boost. Pure function — no I/O, easy to unit test. */
export function scoreChunkText(queryTokens: string[], normalizedQuery: string, chunkText: string): ChunkScore {
  const normalizedChunk = chunkText.toLowerCase();
  const matchedTerms: string[] = [];
  let score = 0;

  for (const token of new Set(queryTokens)) {
    const occurrences = countOccurrences(normalizedChunk, token);
    if (occurrences > 0) {
      matchedTerms.push(token);
      score += occurrences;
    }
  }

  if (normalizedQuery.length > 2 && normalizedChunk.includes(normalizedQuery)) {
    score += 5;
  }

  return { score, matchedTerms };
}

export type RetrievalScope = "published_ai_eligible" | "all_processed";

export interface RetrievalOptions {
  jurisdiction?: string;
  incidentTypeId?: string;
  scope: RetrievalScope;
  limit?: number;
}

export interface RetrievalResult {
  documentId: string;
  documentTitle: string;
  authorityOrPublisher?: string;
  jurisdiction?: string;
  pageStart?: number;
  pageEnd?: number;
  chunkText: string;
  score: number;
  matchedTerms: string[];
  documentStatus: ContentStatus;
  aiUsagePermission: boolean;
  /** Set only in admin-testing scope, when a non-published/non-AI-eligible source is included. */
  includedReason?: string;
}

const DEFAULT_RESULT_LIMIT = 10;

function priorityBoost(priority: DocumentRecord["priority"]): number {
  if (priority === "high") return 0.5;
  if (priority === "medium") return 0.25;
  return 0;
}

export function searchLocalChunks(
  documents: DocumentRecord[],
  chunksByDocumentId: Map<string, DocumentChunk[]>,
  query: string,
  options: RetrievalOptions
): RetrievalResult[] {
  const queryTokens = tokenizeQuery(query);
  if (queryTokens.length === 0) return [];
  const normalizedQuery = query.trim().toLowerCase();

  const results: RetrievalResult[] = [];

  for (const doc of documents) {
    if (options.jurisdiction && doc.jurisdiction !== options.jurisdiction) continue;
    if (options.incidentTypeId && !doc.incidentTypeIds.includes(options.incidentTypeId)) continue;
    if (!hasSuccessfulExtraction(doc)) continue;

    const eligible = isAiEligible(doc);
    if (options.scope === "published_ai_eligible" && !eligible) continue;

    const chunks = chunksByDocumentId.get(doc.id) ?? [];
    for (const chunk of chunks) {
      const { score, matchedTerms } = scoreChunkText(queryTokens, normalizedQuery, chunk.text);
      if (score <= 0) continue;

      results.push({
        documentId: doc.id,
        documentTitle: doc.title,
        authorityOrPublisher: doc.authorityOrPublisher,
        jurisdiction: doc.jurisdiction,
        pageStart: chunk.pageStart,
        pageEnd: chunk.pageEnd,
        chunkText: chunk.text,
        score: score + priorityBoost(doc.priority),
        matchedTerms,
        documentStatus: doc.status,
        aiUsagePermission: doc.aiUsagePermission,
        includedReason:
          options.scope === "all_processed" && !eligible
            ? "Included for admin testing only — this source is not published and AI-eligible."
            : undefined,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, options.limit ?? DEFAULT_RESULT_LIMIT);
}
