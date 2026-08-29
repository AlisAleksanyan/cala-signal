import { getServerBindings } from "@/lib/runtime-env";
import { hashClientKey, issueScoutToken, trustedClientIp } from "@/lib/scout-security";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const headers = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "Referrer-Policy": "no-referrer",
  "X-Content-Type-Options": "nosniff",
};

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), { status, headers });
}

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) {
    return process.env.NODE_ENV !== "production" || request.headers.get("sec-fetch-site") === "same-origin";
  }
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function GET(request: Request): Promise<Response> {
  if (!isSameOrigin(request)) return json({ error: "Token request rejected." }, 403);

  const bindings = getServerBindings();
  const secret = bindings.SCOUT_TOKEN_SECRET || process.env.SCOUT_TOKEN_SECRET;
  const ip = trustedClientIp(request);
  if (!bindings.DB || !secret || !ip) {
    return json({ error: "Shortlist protection is unavailable." }, 503);
  }

  const clientKey = await hashClientKey(ip);
  const token = await issueScoutToken(clientKey, secret);
  return json({ token });
}
