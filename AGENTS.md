# AI Agent Payment Rail

> Built with Arc Studio - money-powered apps in minutes

This is the **project memory** - what Arc Studio remembers about building this app. It helps future agents (or humans) understand and extend the project.

---

## What This App Does

Paid AI inference API that charges agents $0.001 USDC per call using Circle Gateway Nanopayments and the x402 HTTP 402 protocol. No credit card or account needed — agents pay inline with each request. A live Arc Dark dashboard shows paid calls, revenue, and usage in real time.

## Payment Setup

- **Protocol:** Circle Gateway Nanopayments (`@circle-fin/x402-batching` v3.5.0)
- **Paid endpoint:** `POST /v1/inference` — returns 402 without payment, 200 with valid x402 header
- **Price:** `$0.001` USDC per call (set via `PRICE_PER_CALL` in `.env`)
- **Facilitator:** `https://gateway-api-testnet.circle.com` (Arc Testnet)
- **Seller address:** set `VITE_SELLER_ADDRESS` in `.env` — REPLACE the placeholder `0x000…` with your real EVM wallet before going live
- **Chain:** Arc Testnet (Chain ID 5042002)

## Tech Stack

- Frontend: React 18, Vite, TypeScript, Tailwind CSS
- Web3: wagmi v2, viem v2, ConnectKit
- Contracts: Solidity 0.8.28 + Foundry. Sources in `contracts/`, unit tests in `contracts/test/*.t.sol`. Build with `bun run contracts:build` (`forge build`), test with `bun run contracts:test` (`forge test`).
- Wallet: injected (MetaMask, etc.)
- Chain: Arc Testnet (Chain ID: 5042002, imported from `viem/chains`)
- Token: USDC (6 decimals) (Address: 0x3600000000000000000000000000000000000000, Chain: Arc Testnet)
- Toasts: Sonner

## Key Files

- `src/App.tsx` - Main application logic
- `src/components/` - UI components
- `src/config.ts` - wagmi config (chains, connectors, transports)

## To Run

```bash
bun install
bun run dev
```
