/**
 * Centralized LLM client — Anthropic-compatible gateway or direct API.
 *
 * All routes import from here so switching providers is a single-file change.
 *
 * Auth priority:
 *  1. RADICAL_GATEWAY_TOKEN  — static API token for a gateway
 *  2. ANTHROPIC_API_KEY      — fallback for direct Anthropic access
 *
 * Set LLM_BASE_URL to point at any Anthropic-compatible endpoint.
 * Leave unset to use the Anthropic API directly.
 *
 * Models (set LLM_BASE_URL to a gateway for EU-hosted equivalents):
 *  - claude-sonnet-4-5  →  fast, large ctx, default for coach + plan generation
 *  - claude-opus-4-5    →  strongest, use for complex rewrites
 *  - claude-haiku-4-5   →  cheapest, use for quick validations
 */
import Anthropic from "@anthropic-ai/sdk";

const GATEWAY_BASE_URL = process.env.LLM_BASE_URL ?? undefined;

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

/** Model IDs — update to match your provider's model names */
export const MODELS = {
  /** Default: fast, large context — use for coach chat + plan generation */
  SONNET: process.env.LLM_MODEL_SONNET ?? "claude-sonnet-4-5",
  /** Heavy: best quality — use for complex rewrites */
  OPUS: process.env.LLM_MODEL_OPUS ?? "claude-opus-4-5",
  /** Fast + cheap — use for quick classifications */
  HAIKU: process.env.LLM_MODEL_HAIKU ?? "claude-haiku-4-5",
} as const;
