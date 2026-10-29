/**
 * Mock AI inference handler.
 * Replace with a real LLM call (OpenAI, Anthropic, etc.) when ready.
 */

export interface InferenceRequest {
  prompt: string;
  max_tokens?: number;
}

export interface InferenceResponse {
  response: string;
  model: string;
  tokens: number;
  latency_ms: number;
}

const RESPONSES = [
  "Arc is a blockchain where USDC is the native gas token, giving you predictable fees and sub-second finality.",
  "Circle Gateway Nanopayments let agents pay per HTTP request without any credit card or account setup.",
  "The x402 protocol returns 402 Payment Required with a signed USDC authorization instead of an API key.",
  "USDC has 6 decimal places on ERC-20 but 18 decimal places as the Arc native gas token — the same pool, two views.",
  "A paying agent attaches a PAYMENT-AUTHORIZATION header; the Gateway middleware settles it before calling next().",
  "Sub-cent micropayments are viable on Arc because gas fees are stable and paid in the same USDC the user already holds.",
  "Circle's BatchFacilitatorClient batches multiple payment settlements into a single on-chain transaction for efficiency.",
  "Agent-to-agent payments over x402 require no wallet UI — the private key signs the authorization header programmatically.",
];

export function runInference(req: InferenceRequest): InferenceResponse {
  const start = Date.now();
  // Deterministic but varied response based on prompt length
  const idx = req.prompt.length % RESPONSES.length;
  const response = RESPONSES[idx];
  const tokens = Math.floor(req.prompt.split(" ").length * 1.3) + response.split(" ").length;
  return {
    response,
    model: "arc-mock-v1",
    tokens,
    latency_ms: Date.now() - start,
  };
}
