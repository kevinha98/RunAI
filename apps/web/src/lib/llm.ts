/**
 * Centralized LLM client — Radical Gateway (gateway.raicode.no/v1)
 *
 * The gateway is fully Anthropic-API-compatible. All routes import
 * from here so switching models or auth is a single-file change.
 *
 * Auth priority:
 *  1. RADICAL_GATEWAY_TOKEN  — static API token (recommended for apps)
 *  2. ANTHROPIC_API_KEY      — fallback for direct Anthropic access
 *
 * Models (EU-hosted, GDPR-safe):
 *  - eu-sonnet-4-6  →  fast, 1M ctx, default for coach + plan generation
 *  - eu-opus-4-6    →  strongest, 1M ctx, use for complex rewrites
 *  - eu-haiku-4-5   →  cheapest, 200K ctx, use for quick validations
 */
import Anthropic from "@anthropic-ai/sdk";

const GATEWAY_BASE_URL = "https://gateway.raicode.no";

function createGatewayClient(): Anthropic {
  const apiKey =
    process.env.RADICAL_GATEWAY_TOKEN ?? process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing LLM credentials. Set RADICAL_GATEWAY_TOKEN in .env.local"
    );
  }

  return new Anthropic({
    baseURL: GATEWAY_BASE_URL,
    apiKey,
    // The gateway validates via x-api-key header (same as Anthropic SDK default)
    defaultHeaders: {
      "x-api-key": apiKey,
    },
  });
}

// Lazy singleton — created on first use so missing env vars throw at request
// time (caught by the route handler) rather than crashing the module.
let _llm: Anthropic | null = null;
export const llm = new Proxy({} as Anthropic, {
  get(_target, prop) {
    if (!_llm) _llm = createGatewayClient();
    return (_llm as unknown as Record<string | symbol, unknown>)[prop];
  },
});

/** Model IDs available on the Radical Gateway */
export const MODELS = {
  /** Default: fast, 1M context — use for coach chat + plan generation */
  SONNET: "eu-sonnet-4-6",
  /** Heavy: best quality, 1M context — use for complex rewrites */
  OPUS: "eu-opus-4-6",
  /** Fast + cheap: 200K context — use for quick classifications */
  HAIKU: "eu-haiku-4-5",
} as const;
