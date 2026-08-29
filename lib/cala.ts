import type { CalaQueryResponse, CalaSearchResponse } from "./types";

const CALA_BASE_URL = "https://api.cala.ai/v1";

async function calaPost<T>(path: string, input: string): Promise<T> {
  const apiKey = process.env.CALA_API_KEY;
  if (!apiKey) throw new Error("Cala is not configured.");

  const response = await fetch(`${CALA_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({ input }),
    signal: AbortSignal.timeout(22_000),
  });

  if (!response.ok) {
    throw new Error(`Cala request failed (${response.status}).`);
  }
  return (await response.json()) as T;
}

function validateQueryResponse(payload: CalaQueryResponse): CalaQueryResponse {
  return {
    results: Array.isArray(payload?.results)
      ? payload.results.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object" && !Array.isArray(row))
      : [],
    entities: Array.isArray(payload?.entities)
      ? payload.entities.filter((entity) => Boolean(entity?.id) && Boolean(entity?.name))
      : [],
  };
}

function validateSearchResponse(payload: CalaSearchResponse): CalaSearchResponse {
  return {
    content: typeof payload?.content === "string" ? payload.content : "",
    context: Array.isArray(payload?.context)
      ? payload.context.filter((item) => typeof item?.id === "string" && typeof item?.content === "string").slice(0, 12)
      : [],
    entities: Array.isArray(payload?.entities) ? payload.entities : null,
    explainability: Array.isArray(payload?.explainability)
      ? payload.explainability
          .filter((item) => typeof item?.content === "string" && Array.isArray(item?.references))
          .slice(0, 12)
      : [],
  };
}

export async function queryCala(input: string): Promise<{
  structured: CalaQueryResponse;
  sourced: CalaSearchResponse;
}> {
  const evidencePrompt = `${input} Give a concise evidence-backed answer. Include sources and explainability. State missing or conflicting evidence explicitly.`;
  const [structured, sourced] = await Promise.all([
    calaPost<CalaQueryResponse>("/knowledge/query", input),
    calaPost<CalaSearchResponse>("/knowledge/search", evidencePrompt),
  ]);

  return {
    structured: validateQueryResponse(structured),
    sourced: validateSearchResponse(sourced),
  };
}
