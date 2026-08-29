import { queryCala } from "@/lib/cala";
import { linkEvidenceToCompanies } from "@/lib/evidence";
import { planThesis } from "@/lib/openai-planner";
import { rankCompanies } from "@/lib/ranking";
import { getServerBindings } from "@/lib/runtime-env";
import { hashClientKey, RATE_LIMIT, takeD1Quota, trustedClientIp, verifyScoutToken } from "@/lib/scout-security";
import type { ScoutResponse } from "@/lib/types";
import { compileCalaQuery, extractExplicitFoundingYear, validateBrief } from "@/lib/validation";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4_096;

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

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return process.env.NODE_ENV !== "production";
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
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
  if (!isSameOrigin(request)) {
    return json({ error: "This endpoint only accepts requests from the CALA SIGNAL application." }, 403);
  }

  if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
    return json({ error: "Content-Type must be application/json." }, 415);
  }

  try {
    const bodyText = await request.text();
    if (new TextEncoder().encode(bodyText).byteLength > MAX_BODY_BYTES) {
      return json({ error: "Request body is too large." }, 413);
    }

    let raw: unknown;
    try {
      raw = JSON.parse(bodyText);
    } catch {
      return json({ error: "Request body is not valid JSON." }, 400);
    }

    const brief = validateBrief((raw as { brief?: unknown })?.brief);
    const bindings = getServerBindings();
    const secret = bindings.SCOUT_TOKEN_SECRET || process.env.SCOUT_TOKEN_SECRET;
    const ip = trustedClientIp(request);
    if (!bindings.DB || !secret || !ip) {
      return json({ error: "Shortlist protection is unavailable." }, 503);
    }
    const clientKey = await hashClientKey(ip);
    if (!await verifyScoutToken(request.headers.get("x-scout-token"), clientKey, secret)) {
      return json({ error: "A fresh shortlist token is required." }, 403);
    }
    if (!process.env.OPENAI_API_KEY || !process.env.CALA_API_KEY) {
      throw new Error("Live providers are not configured.");
    }

    const rate = await takeD1Quota(bindings.DB, clientKey);
    const rateHeaders = {
      "X-RateLimit-Limit": String(RATE_LIMIT),
      "X-RateLimit-Remaining": String(rate.remaining),
      "X-RateLimit-Reset": String(Math.ceil(rate.resetsAt / 1_000)),
    };
    if (!rate.allowed) {
      return json({ error: "This demo allows two shortlist runs every ten minutes. Please retry later." }, 429, {
        ...rateHeaders,
        "Retry-After": String(Math.max(1, Math.ceil((rate.resetsAt - Date.now()) / 1_000))),
      });
    }

    const plannedThesis = await planThesis(brief, request.signal);
    const explicitFoundingYear = extractExplicitFoundingYear(brief);
    const thesis = explicitFoundingYear === null
      ? plannedThesis
      : { ...plannedThesis, founded_after: explicitFoundingYear };
    if (request.signal.aborted) throw request.signal.reason;
    const calaQuery = compileCalaQuery(thesis);

    const cala = await queryCala(calaQuery, request.signal);
    const rankedCompanies = rankCompanies(cala.structured.results, cala.structured.entities, thesis);
    const companies = linkEvidenceToCompanies(
      rankedCompanies,
      cala.sourced.context,
      cala.sourced.explainability,
      cala.sourced.entities ?? [],
    );

    const caveats: string[] = [];
    if (!companies.length) caveats.push("Cala did not resolve any structured candidates for this thesis. Broaden the geography or funding ceiling.");
    if (companies.some((company) => company.qualification === "needs_verification")) {
      caveats.push("Candidates with unknown or unproven hard criteria remain in the verification queue.");
    }

    const result: ScoutResponse = { thesis, companies, caveats };
    return json(result, 200, rateHeaders);
  } catch (error) {
    const safe = publicMessage(error);
    if (safe.status >= 500) {
      console.error("scout_request_failed", {
        requestId,
        error: error instanceof Error ? error.message : "unknown",
      });
    }
    return json({ error: safe.message }, safe.status);
  }
}
