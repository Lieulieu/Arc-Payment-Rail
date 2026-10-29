The plan answers already came through. Let me read the skill references and workspace, then write the plan. Here is the plan based on your answers — AI inference API, sub-cent micropayments ($0.001/call), with a live revenue dashboard.

---

## Implementation Plan: AI Agent Payment Rail

### Summary
A paid AI inference endpoint that charges agents $0.001 USDC per call using Circle Gateway Nanopayments and the x402 HTTP 402 protocol. No credit card or account setup required — agents pay inline with each request. A live dashboard shows paid calls, revenue, and usage in real time.

### Architecture
- **Blockchain:** Arc Testnet — USDC as native gas token, sub-second finality, stable fees
- **Payment layer:** Circle Gateway Nanopayments via `@circle-fin/x402-batching` Express middleware — handles 402 negotiation, gasless USDC authorization, and batched settlement
- **Backend:** Express server with two routes — a free `/health` check and a paid `POST /v1/inference` endpoint gated behind `gateway.require`
- **Frontend:** React + Tailwind dashboard showing live call log, cumulative revenue, and a test call panel
- **Wallet:** ConnectKit for the dashboard; agents need no wallet UI (they pay programmatically via x402)

### Files to Create/Modify

1. `server/index.ts` — Express server; mounts Circle Gateway middleware; exposes `/v1/inference` (paid) and `/health` (free)
2. `server/inference.ts` — Mock LLM handler: accepts `{ prompt: string }`, returns `{ response: string, model: string, tokens: number }`
3. `server/events.ts` — In-memory event store; pushes each paid call (timestamp, amount, wallet) to SSE stream for the dashboard
4. `server/env.ts` — Loads and validates `SELLER_ADDRESS`, `GATEWAY_RPC_URL`, `PRICE_PER_CALL` from environment
5. `.env` — Add `SELLER_ADDRESS`, `GATEWAY_RPC_URL=<Arc Testnet RPC>`, `PRICE_PER_CALL=0.001`
6. `src/App.tsx` — Replace starter with the dashboard shell (header, stats bar, call log table, test panel)
7. `src/components/StatsBar.tsx` — Shows total calls, total revenue (USDC), and unique payers
8. `src/components/CallLog.tsx` — Live scrolling table of paid calls via SSE; columns: time, payer address, prompt preview, USDC paid
9. `src/components/TestPanel.tsx` — Form to send a test prompt; shows raw 402 → payment → 200 flow for developers
10. `src/hooks/useCallStream.ts` — SSE hook that streams new paid-call events from `server/events.ts` into React state
11. `package.json` — Add `@circle-fin/x402-batching`, `express`, `cors`, `tsx` (for running the server)

### Build Sequence

1. Install `@circle-fin/x402-batching` and Express dependencies; verify current supported networks from live Circle docs
2. Write `server/env.ts`, `server/inference.ts`, and `server/events.ts`
3. Write `server/index.ts` — wire Gateway middleware with `createGatewayMiddleware` + `gateway.require` on `/v1/inference`; add SSE `/events` endpoint
4. Add server env vars to `.env`; add a `dev:server` script to `package.json`
5. Build `src/hooks/useCallStream.ts` and `src/components/StatsBar.tsx`, `CallLog.tsx`, `TestPanel.tsx`
6. Wire everything into `src/App.tsx`
7. Verify full seller flow: unpaid request returns 402 → inspect → estimate dry run → paid request returns 200 and appears in dashboard

### Done When
- [ ] `POST /v1/inference` without payment returns HTTP 402 with a valid `x-payment-required` header
- [ ] A paying agent receives a 200 with `{ response, model, tokens }`
- [ ] Each paid call appears in the dashboard call log within 1 second via SSE
- [ ] Stats bar shows correct running totals for calls, revenue, and unique payers
- [ ] Test panel in the dashboard demonstrates the full 402 → pay → 200 flow
- [ ] Server reads all config from env vars; no keys or addresses hardcoded

---

## Ready to build?

Switch to Build mode and approve — the build agent will install the Gateway middleware, wire up the Express server, and build the live dashboard. Plan saved to `arc-studio-plans/PLAN.md`. Switch to Build mode and approve to start building.
