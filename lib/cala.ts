import type {
  CalaContext,
  CalaEntity,
  CalaOrigin,
  CalaQueryResponse,
  CalaSearchResponse,
} from "./types.ts";
import { createLinkedAbortController } from "./abort.ts";

const CALA_BASE_URL = "https://api.cala.ai/v1";
// Cala's knowledge endpoints do graph expansion and provenance assembly. Live
// responses currently take about a minute, so a short web-style timeout would
// abort valid work before Cala can return its evidence bundle.
const CALA_TIMEOUT_MS = 110_000;
const MAX_ORIGIN_URL_LENGTH = 2_048;

async function calaPost<T>(path: string, input: string, signal: AbortSignal): Promise<T> {
  const apiKey = process.env.CALA_API_KEY;
  if (!apiKey) throw new Error("Cala is not configured.");

  const response = await fetch(`${CALA_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({ input }),
    signal,
  });

  if (!response.ok) {
    throw new Error(`Cala request failed (${response.status}).`);
  }
  return (await response.json()) as T;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function boundedString(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

export function normalizeSafeOrigin(value: unknown): CalaOrigin | null {
  const record = asRecord(value);
  const rawUrl = typeof value === "string"
    ? value
    : record?.url ?? record?.document ?? record?.source_url ?? null;
  const urlText = boundedString(rawUrl, MAX_ORIGIN_URL_LENGTH);
  if (!urlText) return null;

  try {
    const url = new URL(urlText);
    if (url.protocol !== "https:") return null;
    const label = record
      ? boundedString(record.name ?? record.title ?? record.source, 120)
      : null;
    return { url: url.toString(), label };
  } catch {
    return null;
  }
}

function contextOrigins(record: Record<string, unknown>): CalaOrigin[] {
  const candidates = [
    record.origin,
    record.origins,
    record.source_origin,
    record.source_origins,
    record.source,
    record.sources,
    record.document,
  ].flatMap((value) => Array.isArray(value) ? value : value === undefined ? [] : [value]);
  if (record.url || record.source_url) candidates.push(record);

  const seen = new Set<string>();
  return candidates
    .map(normalizeSafeOrigin)
    .filter((origin): origin is CalaOrigin => Boolean(origin))
    .filter((origin) => {
      if (seen.has(origin.url)) return false;
      seen.add(origin.url);
      return true;
    })
    .slice(0, 4);
}

function normalizeEntity(value: unknown): CalaEntity | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = boundedString(record.id, 128);
  const name = boundedString(record.name, 200);
  if (!id || !name) return null;
  const entityType = boundedString(record.entity_type, 80) ?? "Entity";
  const mentions = Array.isArray(record.mentions)
    ? record.mentions.map((mention) => boundedString(mention, 200)).filter((mention): mention is string => Boolean(mention)).slice(0, 12)
    : undefined;
  return { id, name, entity_type: entityType, mentions };
}

function validateQueryResponse(payload: unknown): CalaQueryResponse {
  const record = asRecord(payload);
  return {
    results: Array.isArray(record?.results)
      ? record.results.filter((row): row is Record<string, unknown> => Boolean(asRecord(row))).slice(0, 20)
      : [],
    entities: Array.isArray(record?.entities)
      ? record.entities.map(normalizeEntity).filter((entity): entity is CalaEntity => Boolean(entity)).slice(0, 30)
      : [],
  };
}

function validateContext(value: unknown): CalaContext | null {
  const record = asRecord(value);
  if (!record) return null;
  const id = boundedString(record.id, 128);
  const content = boundedString(record.content, 1_600);
  if (!id || !content) return null;
  return { id, content, origins: contextOrigins(record) };
}

function validateSearchResponse(payload: unknown): CalaSearchResponse {
  const record = asRecord(payload);
  return {
    content: boundedString(record?.content, 3_500) ?? "",
    context: Array.isArray(record?.context)
      ? record.context.map(validateContext).filter((item): item is CalaContext => Boolean(item)).slice(0, 12)
      : [],
    entities: Array.isArray(record?.entities)
      ? record.entities.map(normalizeEntity).filter((entity): entity is CalaEntity => Boolean(entity)).slice(0, 30)
      : null,
    explainability: Array.isArray(record?.explainability)
      ? record.explainability.flatMap((value) => {
          const explanation = asRecord(value);
          const content = boundedString(explanation?.content, 700);
          if (!content || !Array.isArray(explanation?.references)) return [];
          const references = explanation.references
            .map((reference) => boundedString(reference, 128))
            .filter((reference): reference is string => Boolean(reference))
            .slice(0, 12);
          return [{ content, references }];
        }).slice(0, 12)
      : [],
  };
}

export async function queryCala(input: string, requestSignal?: AbortSignal, timeoutMs = CALA_TIMEOUT_MS): Promise<{
  structured: CalaQueryResponse;
  sourced: CalaSearchResponse;
}> {
  const evidencePrompt = `${input} Give a concise evidence-backed answer. Include sources and explainability. State missing or conflicting evidence explicitly.`;
  const operation = createLinkedAbortController(requestSignal, timeoutMs);

  let structured: unknown;
  let sourced: unknown;
  try {
    [structured, sourced] = await Promise.all([
      calaPost<unknown>("/knowledge/query", input, operation.signal),
      calaPost<unknown>("/knowledge/search", evidencePrompt, operation.signal),
    ]);
  } finally {
    operation.abort();
    operation.cleanup();
  }

  return {
    structured: validateQueryResponse(structured),
    sourced: validateSearchResponse(sourced),
  };
}
