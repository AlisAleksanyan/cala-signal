import { GEOGRAPHIES, SECTORS, SIGNALS, type ThesisPlan } from "./types";
import { validateThesisPlan } from "./validation";

const OPENAI_URL = "https://api.openai.com/v1/responses";

const thesisSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    sector: { type: "string", enum: SECTORS },
    geography: { type: "string", enum: GEOGRAPHIES },
    founded_after: { type: "integer", minimum: 2000, maximum: 2026 },
    max_funding_millions: { type: "number", minimum: 0.5, maximum: 250 },
    signals: {
      type: "array",
      items: { type: "string", enum: SIGNALS },
      minItems: 1,
      maxItems: 3,
    },
    result_count: { type: "integer", minimum: 3, maximum: 8 },
    rationale: { type: "string", minLength: 8, maxLength: 240 },
  },
  required: [
    "sector",
    "geography",
    "founded_after",
    "max_funding_millions",
    "signals",
    "result_count",
    "rationale",
  ],
} as const;

function extractOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const response = payload as { output?: unknown[]; output_text?: unknown };
  if (typeof response.output_text === "string") return response.output_text;
  if (!Array.isArray(response.output)) return null;

  for (const item of response.output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown[] }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const record = part as { type?: unknown; text?: unknown };
      if (record.type === "output_text" && typeof record.text === "string") return record.text;
    }
  }
  return null;
}

export async function planThesis(brief: string): Promise<ThesisPlan> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OpenAI is not configured.");

  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-5.6-terra",
      store: false,
      reasoning: { effort: "low" },
      instructions: [
        "You convert an investor's sourcing brief into a conservative database search plan.",
        "Use the closest supported sector and geography. Never add criteria the user did not imply.",
        "Use 2019 as the default founding year, EUR 25m as the default funding ceiling, and 5 results unless the user specifies otherwise.",
        "The rationale must be one crisp sentence explaining the investable wedge, not marketing copy.",
      ].join(" "),
      input: brief,
      text: {
        format: {
          type: "json_schema",
          name: "startup_scout_thesis",
          strict: true,
          schema: thesisSchema,
        },
      },
    }),
    signal: AbortSignal.timeout(18_000),
  });

  if (!response.ok) {
    throw new Error(`OpenAI planning failed (${response.status}).`);
  }

  const payload: unknown = await response.json();
  const text = extractOutputText(payload);
  if (!text) throw new Error("OpenAI returned no structured thesis.");

  try {
    return validateThesisPlan(JSON.parse(text));
  } catch {
    throw new Error("OpenAI returned a thesis that failed server validation.");
  }
}
