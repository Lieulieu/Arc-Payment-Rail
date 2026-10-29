# Arc Payment Rail

A paid AI inference API where agents pay **$0.001 USDC per call** using Circle Gateway Nanopayments and the x402 HTTP 402 protocol. No credit card or account setup required — agents pay inline with each request. A live dashboard shows paid calls, revenue, and usage in real time.

Built with [Arc Studio](https://studio.arc.io)

## Tech stack

- **Frontend:** React 18 + Vite + Tailwind CSS + ConnectKit (wagmi)
- **Backend:** Express 5 serverless function (Vercel) / local dev server (Bun)
- **Payments:** Circle Gateway Nanopayments via `@circle-fin/x402-batching`
- **Chain:** Arc Testnet (USDC as native gas token)
- **Language:** TypeScript

## What it does

- `POST /v1/inference` — paid AI inference endpoint; returns HTTP 402 to unpaid callers, processes the request and records the payment for paying agents
- `GET /health` — free health check
- `GET /v1/recent` — latest paid calls as JSON (dashboard polling)
- `GET /v1/history` — paginated + filtered call history
- `GET /v1/leaderboard` — top paying agents by USDC spent
- `GET /v1/chart` — hourly/daily spend chart data
- `GET /v1/wallets` — imported Circle agent wallets
- `POST /v1/demo` — free demo endpoint for browser preview

## Development

### Prerequisites

- [Bun](https://bun.sh) v1.0+
- A Circle account with a Gateway-enabled agent wallet
- [Circle CLI](https://developers.circle.com/cli) for making payments

### Install

```bash
bun install
```

### Environment variables

Copy `.env.example` to `.env` and fill in your values:

| Variable | Purpose |
|---|---|
| `VITE_SELLER_ADDRESS` | Your EVM wallet address that receives USDC payments |
| `PRICE_PER_CALL` | Price per API call in USDC (default: `0.001`) |
| `GATEWAY_FACILITATOR_URL` | Circle Gateway facilitator URL (testnet or mainnet) |
| `PORT` | Local Express server port (default: `3001`, ignored on Vercel) |

### Run locally

Start both servers in separate terminals:

```bash
# Terminal 1 — Vite frontend
bun run dev

# Terminal 2 — Express payment server
bun run dev:server
```

Frontend: http://localhost:5173  
Payment server: http://localhost:3001

### Make a test payment

```bash
# Fund your Gateway balance first
circle gateway deposit --amount 0.50 --address YOUR_WALLET --chain ARC-TESTNET --method direct

# Pay per call
circle services pay \
  --url http://localhost:3001/v1/inference \
  -X POST \
  --data '{"prompt":"What is Circle Gateway?"}' \
  --address YOUR_WALLET \
  --chain ARC-TESTNET \
  --max-amount 0.01
```

## Deploy to Vercel

### One-click (recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Lieulieu/Arc-Payment-Rail)

### Manual

1. Install the [Vercel CLI](https://vercel.com/docs/cli): `npm i -g vercel`
2. Run `vercel` from the project root and follow the prompts
3. Set environment variables in the Vercel dashboard (Project → Settings → Environment Variables):
   - `VITE_SELLER_ADDRESS` — your wallet address
   - `PRICE_PER_CALL` — `0.001`
   - `GATEWAY_FACILITATOR_URL` — `https://gateway-api-testnet.circle.com`
4. Redeploy after adding variables: `vercel --prod`

### How it works on Vercel

- **Frontend:** Vite builds to `dist/` — served as static files by Vercel's CDN
- **Backend:** `api/index.ts` exports the Express app as a Vercel serverless function
- **Routing:** `vercel.json` rewrites `/health` and `/v1/*` to the serverless function; everything else serves `index.html`

> **Note:** The in-memory event store resets on each cold start. For production, replace `server/events.ts` and `server/wallets.ts` with a persistent database.

## Mainnet

Change `GATEWAY_FACILITATOR_URL` to `https://gateway-api.circle.com` and use a mainnet wallet. No code changes needed.
