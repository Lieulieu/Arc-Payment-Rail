Project name: Arc Payment Rail

Project Description:

Arc Payment Rail is an AI agent payment infrastructure built on Arc Testnet that lets any AI agent call an HTTP API and pay $0.001 USDC per request — no credit card, no account setup, no API key required. Payment happens inline using the x402 protocol: the server returns HTTP 402 with a PAYMENT-REQUIRED header, the agent attaches a signed USDC authorization, and Circle Gateway Nanopayments settles it gaslessly on Arc.

Describe your build:

Arc Payment Rail solves a real problem in the agent economy: agents need to pay for services programmatically, but existing payment rails require human-managed billing accounts, credit cards, or complex OAuth flows. This project removes all of that.

The build has two parts:

1. A paid Express API server — a POST /v1/inference endpoint protected by Circle Gateway Nanopayments middleware (@circle-fin/x402-batching). Any request without a valid payment signature gets HTTP 402 with the payment terms encoded in the response header. A paying agent attaches a PAYMENT-AUTHORIZATION header signed with its EVM wallet, the Gateway middleware verifies and settles the USDC transfer, and the request goes through. No API keys. No accounts. Just a wallet and USDC.

2. A live Arc Dark dashboard — a React frontend showing real-time paid call activity: a scrolling call log with payer address, prompt preview, tokens used, and USDC charged per call; a stats bar tracking total calls, cumulative revenue, and unique agent payers; and a developer test panel that demonstrates the full 402 → payment → 200 flow with a built-in CLI snippet for agents.

Arc was the right chain for this because USDC is the native gas token — agents hold one asset for both payments and gas, transaction fees are stable and predictable, and finality is sub-second. This makes $0.001 micropayments economically viable in a way they are not on chains with volatile gas.

The entire project was built with Arc Studio: the Express payment middleware wiring, the Gateway integration, the React dashboard, the polling hook, the Vite proxy config, and environment setup — all from a single conversation with no manual boilerplate.

---

## Real-World Deployment Analysis

### 1. Switch from Testnet to Mainnet

The only code change required is the facilitator URL and seller address. On testnet the facilitator is `https://gateway-api-testnet.circle.com`. On mainnet it becomes the Circle Gateway mainnet endpoint (confirm the current URL from Circle's developer docs before deploying). Update two `.env` values:

```
VITE_SELLER_ADDRESS=0xYOUR_PRODUCTION_WALLET
FACILITATOR_URL=https://gateway-api.circle.com
```

No contract changes are needed. Circle Gateway handles settlement; the application code is chain-agnostic.

Arc mainnet is the right production chain: USDC is the native gas token so agents hold one asset for both payments and gas, fees are stable, and finality is sub-second. This makes $0.001 micropayments economically viable at scale.

Warning: mainnet transactions involve real funds and are irreversible. Independently audit and test the configuration before directing live traffic to a mainnet endpoint.

### 2. Replace the Mock Inference Handler

`server/inference.ts` currently returns canned responses. In production, replace `runInference()` with a real LLM call — OpenAI, Anthropic, a self-hosted model, or any inference provider. The payment gate in `server/index.ts` is completely decoupled from the inference logic, so swapping the handler requires no changes to the payment middleware.

Keep the handler synchronous-looking from Express's perspective: `await` the LLM call inside the route handler and return the result. The Gateway middleware has already settled the payment before `next()` is called, so a slow LLM response does not affect payment finality.

### 3. Infrastructure

**Server hosting.** The Express server needs a persistent process and a public HTTPS URL. Good options:

- **Railway or Render** — deploy directly from the repo; both support Bun and provide automatic HTTPS. Set env vars in the platform dashboard.
- **Fly.io** — low-latency global edge, good for agent traffic that may come from anywhere. Use `fly launch` with the existing `package.json` start script.
- **Docker on any VPS** — wrap the server in a minimal Dockerfile (`FROM oven/bun:1`, `COPY . .`, `RUN bun install`, `CMD ["bun", "run", "dev:server"]`). Run behind Nginx or Caddy for TLS termination.

**Frontend hosting.** The React dashboard is a static Vite build. Deploy to Netlify, Vercel, or Hugging Face Spaces (all available from the Arc Studio Integrations menu). The Vite proxy that forwards `/api` to the Express server is a dev-only convenience; in production the frontend calls the Express server's public URL directly. Update `src/hooks/useCallStream.ts` to use an absolute `VITE_API_BASE_URL` env var instead of the `/api` relative path.

**Separate the two services.** Run the Express payment server and the React dashboard as independent deployments. This lets you scale the payment server independently and avoids coupling the frontend's CDN uptime to the payment rail's uptime.

### 4. Persistence

The current event store (`server/events.ts`) is in-memory: it resets on every server restart and holds at most 200 events. For production, replace it with a database:

- **Postgres** (Railway or Supabase free tier) — one `paid_calls` table with columns for id, timestamp, payer, amount, network, prompt_preview, tokens, latency_ms. Write a row in `recordCall()` and query it in `getRecentEvents()`.
- **Redis** — use a sorted set keyed by timestamp for a fast rolling call log without a full relational schema.

Keep the `getRecentEvents()` and `recordCall()` interfaces unchanged so no other server code needs to change.

### 5. Seller Wallet Security

The seller address only receives funds — it never needs to sign transactions from the server. Keep it as a plain EVM address in `.env`. Do not store a private key on the server.

To withdraw earned USDC from the Gateway to your wallet, use the Circle Console or the Circle CLI (`circle gateway withdraw`) from a secure local machine, not from the server.

### 6. Rate Limiting and Abuse Prevention

The Gateway middleware validates every payment signature before the route handler runs, so unpaid requests are rejected before they cost you any compute. However, add a per-IP rate limiter (e.g. `express-rate-limit`) in front of the paid route to prevent signature-replay attempts and denial-of-wallet attacks that flood the facilitator with invalid payment headers.

```ts
import rateLimit from "express-rate-limit";
app.use("/v1/inference", rateLimit({ windowMs: 60_000, max: 60 }));
```

### 7. Observability

Add structured logging (e.g. `pino`) so each paid call emits a JSON log line with payer, amount, network, latency, and token count. Ship logs to Datadog, Logtail, or any log aggregator. Set up an alert if the error rate on `/v1/inference` exceeds 1% — that is the earliest signal that the Gateway facilitator is unreachable or that a middleware version mismatch has broken payment settlement.

### 8. Pricing and Business Model

At $0.001 per call, the break-even point depends on your inference cost. A rough model:

- OpenAI `gpt-4o-mini` costs ~$0.00015 per 1K output tokens. A typical 200-token response costs ~$0.00003.
- At $0.001 per call, gross margin is roughly 97% before server and bandwidth costs.
- At 1 million calls per month, that is $1,000 in USDC revenue with ~$30 in inference costs.

Adjust `PRICE_PER_CALL` in `.env` to match your actual inference provider costs and desired margin. No code change is needed — the Gateway middleware reads the price string at startup.

### 9. Agent Discovery

List the service on the Circle Agent Marketplace so other agents can find and pay for it automatically. Prepare the submission package (name, public URL, endpoint schema, price, example prompts, support URL) and submit via the "Talk to us" intake form at https://agents.circle.com/services. There is no self-serve publish API at this time — marketplace listing is a manual intake process.

### 10. Deployment Checklist

- [ ] Switch `FACILITATOR_URL` to the Circle Gateway mainnet endpoint
- [ ] Set `VITE_SELLER_ADDRESS` to a production EVM wallet (never store the private key on the server)
- [ ] Set `PRICE_PER_CALL` to cover your inference provider cost plus margin
- [ ] Replace `server/inference.ts` mock with a real LLM call
- [ ] Deploy Express server to Railway, Render, Fly.io, or Docker on VPS with HTTPS
- [ ] Deploy React dashboard to Netlify, Vercel, or Hugging Face; update `VITE_API_BASE_URL` to the server's public URL
- [ ] Replace in-memory event store with Postgres or Redis
- [ ] Add `express-rate-limit` to `/v1/inference`
- [ ] Add structured logging and set up an error-rate alert
- [ ] Run `circle services inspect` against the live production URL to confirm the 402 response is well-formed
- [ ] Submit for Agent Marketplace listing at https://agents.circle.com/services

