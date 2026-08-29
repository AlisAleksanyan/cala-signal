export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const configured = Boolean(process.env.OPENAI_API_KEY && process.env.CALA_API_KEY);
  return new Response(
    JSON.stringify({ status: configured ? "ready" : "setup_required", providers: { openai: Boolean(process.env.OPENAI_API_KEY), cala: Boolean(process.env.CALA_API_KEY) } }),
    {
      status: configured ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
