export const RATE_WINDOW_MS = 10 * 60_000;
export const RATE_LIMIT = 2;
export const TOKEN_TTL_MS = 60_000;

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T>(): Promise<T | null>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
}

export interface QuotaResult {
  allowed: boolean;
  remaining: number;
  resetsAt: number;
}

interface ScoutTokenPayload {
  v: 1;
  client: string;
  exp: number;
  nonce: string;
}

const encoder = new TextEncoder();

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export function trustedClientIp(request: Request, production = process.env.NODE_ENV === "production"): string | null {
  const cloudflareIp = request.headers.get("cf-connecting-ip")?.trim() ?? "";
  if (/^[0-9a-f:.]{3,64}$/i.test(cloudflareIp)) return cloudflareIp.toLowerCase();
  if (production) return null;

  const localTestIp = request.headers.get("x-test-client-ip")?.trim() ?? "";
  if (/^[0-9a-f:.]{3,64}$/i.test(localTestIp)) return localTestIp.toLowerCase();
  return "127.0.0.1";
}

export async function hashClientKey(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(ip));
  return bytesToBase64Url(new Uint8Array(digest));
}

export async function issueScoutToken(clientKey: string, secret: string, now = Date.now(), nonce = crypto.randomUUID()): Promise<string> {
  const payload: ScoutTokenPayload = { v: 1, client: clientKey, exp: now + TOKEN_TTL_MS, nonce };
  const encodedPayload = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(encodedPayload));
  return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

export async function verifyScoutToken(token: string | null | undefined, clientKey: string, secret: string, now = Date.now()): Promise<boolean> {
  if (!token || token.length > 1_024) return false;
  const [encodedPayload, encodedSignature, extra] = token.split(".");
  if (!encodedPayload || !encodedSignature || extra) return false;
  const payloadBytes = base64UrlToBytes(encodedPayload);
  const signature = base64UrlToBytes(encodedSignature);
  if (!payloadBytes || !signature) return false;

  const signatureBytes = new Uint8Array(signature.byteLength);
  signatureBytes.set(signature);
  const validSignature = await crypto.subtle.verify("HMAC", await hmacKey(secret), signatureBytes, encoder.encode(encodedPayload));
  if (!validSignature) return false;
  try {
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as Partial<ScoutTokenPayload>;
    return payload.v === 1
      && payload.client === clientKey
      && typeof payload.nonce === "string"
      && payload.nonce.length >= 8
      && typeof payload.exp === "number"
      && payload.exp >= now
      && payload.exp <= now + TOKEN_TTL_MS;
  } catch {
    return false;
  }
}

export async function takeD1Quota(db: D1Database, clientKey: string, now = Date.now()): Promise<QuotaResult> {
  const windowStart = Math.floor(now / RATE_WINDOW_MS) * RATE_WINDOW_MS;
  const resetsAt = windowStart + RATE_WINDOW_MS;
  const row = await db.prepare(`
    INSERT INTO scout_quota (client_key, window_start, request_count)
    VALUES (?1, ?2, 1)
    ON CONFLICT(client_key, window_start)
    DO UPDATE SET request_count = request_count + 1
    RETURNING request_count
  `).bind(clientKey, windowStart).first<{ request_count: number }>();

  if (!row || !Number.isInteger(row.request_count) || row.request_count < 1) {
    throw new Error("D1 quota write did not return a counter");
  }
  return {
    allowed: row.request_count <= RATE_LIMIT,
    remaining: Math.max(0, RATE_LIMIT - row.request_count),
    resetsAt,
  };
}
