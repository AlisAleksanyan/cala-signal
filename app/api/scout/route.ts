import { queryCala } from "@/lib/cala";
import { planThesis } from "@/lib/openai-planner";
import { rankCompanies } from "@/lib/ranking";
import type { ScoutResponse } from "@/lib/types";
import { compileCalaQuery, validateBrief } from "@/lib/validation";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_096;
const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 8;
const rateBuckets = new Map<string, { count: number; resetsAt: number }>();

const responseHeaders = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function json(payload: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...responseHeaders, ...extraHeaders },
  });
}

function clientKey(request: Request): string {
  const raw = request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "anonymous";
  return raw.split(",")[0].trim().slice(0, 64);
}

function takeRateLimit(key: string): { allowed: boolean; remaining: number; resetsAt: number } {
  const now = Date.now();
  const current = rateBuckets.get(key);
  if (!current || current.resetsAt <= now) {
    const bucket = { count: 1, resetsAt: now + RATE_WINDOW_MS };
    rateBuckets.set(key, bucket);
    return { allowed: true, remaining: RATE_LIMIT - 1, resetsAt: bucket.resetsAt };
  }
  current.count += 1;
  if (rateBuckets.size > 2_000) {
    for (const [bucketKey, bucket] of rateBuckets) {
      if (bucket.resetsAt <= now) rateBuckets.delete(bucketKey);
    }
    if (rateBuckets.size > 2_000) {
      const oldestKey = rateBuckets.keys().next().value as string | undefined;
      if (oldestKey) rateBuckets.delete(oldestKey);
    }
  }
  return {
    allowed: current.count <= RATE_LIMIT,
    remaining: Math.max(0, RATE_LIMIT - current.count),
    resetsAt: current.resetsAt,
  };
}

function publicMessage(error: unknown): { status: number; message: string } {
  const message = error instanceof Error ? error.message : "Unknown failure";
  if (message.includes("minimum") || message.includes("under 600") || message === "Brief must be text.") {
    return { status: 400, message };
  }
  if (message.includes("not configured")) {
    return { status: 503, message: "The live data providers are not configured yet." };
  }
  if (message.includes("Cala request failed (429)")) {
    return { status: 429, message: "Cala is rate-limited. Wait a moment and retry." };
  }
  return { status: 502, message: "The evidence pipeline could not complete. Please retry." };
}

export async function POST(request: Request): Promise<Response> {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const rate = takeRateLimit(clientKey(request));
  const rateHeaders = {
    "X-RateLimit-Limit": String(RATE_LIMIT),
    "X-RateLimit-Remaining": String(rate.remaining),
    "X-RateLimit-Reset": String(Math.ceil(rate.resetsAt / 1_000)),
  };

  if (!rate.allowed) {
    return json({ error: "Too many requests. Try again in one minute.", request_id: requestId }, 429, rateHeaders);
  }
  if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
    return json({ error: "Content-Type must be application/json.", request_id: requestId }, 415, rateHeaders);
  }

  try {
    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) {
      return json({ error: "Request body is too large.", request_id: requestId }, 413, rateHeaders);
    }

    let raw: unknown;
    try {
      raw = JSON.parse(bodyText);
    } catch {
      return json({ error: "Request body is not valid JSON.", request_id: requestId }, 400, rateHeaders);
    }

    const brief = validateBrief((raw as { brief?: unknown })?.brief);
    if (!process.env.OPENAI_API_KEY || !process.env.CALA_API_KEY) {
      throw new Error("Live providers are not configured.");
    }
    const planningStarted = Date.now();
    const thesis = await planThesis(brief);
    const planningMs = Date.now() - planningStarted;
    const calaQuery = compileCalaQuery(thesis);

    const calaStarted = Date.now();
    const cala = await queryCala(calaQuery);
    const calaMs = Date.now() - calaStarted;
    const companies = rankCompanies(cala.structured.results, cala.structured.entities, thesis);

    const caveats: string[] = [];
    if (!companies.length) caveats.push("Cala returned no structured rows for this thesis. Broaden the geography or funding ceiling.");
    if (companies.some((company) => company.missing_fields.length > 0)) {
      caveats.push("Missing fields are scored as zero; CALA SIGNAL never invents unavailable evidence.");
    }
    if (!cala.sourced.context.length) caveats.push("No Cala KnowBits were returned for this query.");

    const result: ScoutResponse = {
      request_id: requestId,
      thesis,
      cala_query: calaQuery,
      companies,
      evidence: cala.sourced.context,
      explanations: cala.sourced.explainability,
      narrative: cala.sourced.content.slice(0, 3_500),
      caveats,
      timings_ms: {
        planning: planningMs,
        cala: calaMs,
        total: Date.now() - startedAt,
      },
    };

    return json(result, 200, rateHeaders);
  } catch (error) {
    const safe = publicMessage(error);
    if (safe.status >= 500) {
      console.error("scout_request_failed", {
        requestId,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
    return json({ error: safe.message, request_id: requestId }, safe.status, rateHeaders);
  }
}
