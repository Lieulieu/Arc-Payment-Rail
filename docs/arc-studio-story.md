# What does your project do, and how did you use Arc Studio to build it?

## What the project does

**Arc Payment Rail** is an AI agent payment infrastructure that lets any AI agent call a paid API endpoint and pay $0.001 USDC per request — with no credit card, no account signup, and no prior registration required.

The project has three layers:

**1. Paid inference API**
A Node.js/Express server exposes `POST /v1/inference`. When an agent hits the endpoint without payment, it receives an HTTP 402 response with a `PAYMENT-REQUIRED` header describing the exact amount and settlement method. The agent attaches a Circle Gateway Nanopayment authorization header and retries — the server verifies the payment, serves the AI response, and the $0.001 USDC settles onchain via Circle Gateway on Arc Testnet. The entire round-trip takes under one second.

**2. Live revenue dashboard**
A React + Tailwind frontend shows the operator everything in real time: a live call log, cumulative USDC revenue, unique agent count, a spend chart (hourly/daily), a paginated transaction history with filters, an agent leaderboard ranked by total USDC spent, and a wallet explorer for imported Circle CLI wallets. Agents are identified by their onchain address, and each call is clickable to see a full receipt modal.

**3. PaymentRegistry smart contract**
A permissionless Solidity contract deployed on Arc Testnet at `0x4c6f049a11393e7b0b4b9ba5fdbd173dad5698fe`. Any address can call `recordCall(payer, amount, promptHash, callId)` to write a permanent, tamper-proof onchain receipt for every paid API call. Records store the payer address, USDC amount, a keccak256 hash of the prompt, the call ID, and the address that submitted the record. The contract supports lookup by call ID, by index, and paginated by payer address — so any agent or auditor can verify their payment history onchain without trusting the API server.

The core value proposition: **agents pay machines the same way humans pay websites — inline, per request, in stablecoins — with no intermediary and full onchain proof.**

---

## How Arc Studio was used to build it

Arc Studio was the primary development environment from the first line to deployment. Here is exactly what was built with it:

### 1. Ideation
Arc Studio suggested the "AI agent payment rail" concept from a brainstorm of 10 Arc + USDC app ideas, and immediately connected it to Circle Gateway Nanopayments and the x402 HTTP 402 protocol as the right building blocks.

### 2. Express payment server
Arc Studio wrote the full Express server (`server/index.ts`) wired to `@circle-fin/x402-batching` — the Circle Gateway middleware that handles the 402 challenge, payment verification, and USDC settlement. It also wrote the inference handler, the in-memory event store, the SSE stream, and all REST endpoints (`/v1/inference`, `/v1/recent`, `/v1/history`, `/v1/leaderboard`, `/v1/chart`, `/v1/wallets`, `/v1/demo`).

### 3. React dashboard
Arc Studio built the full dashboard in Arc Dark style: `StatsBar`, `CallLog`, `SpendChart`, `AgentLeaderboard`, `TransactionHistory`, `TransactionReceipt` modal, `WalletExplorer`, `QuickPay`, `AgentQuickstart`, `HowItWorks`, and `StartServerPanel` — all wired into a tabbed `App.tsx`. Every component follows Arc Studio's design system (Space Grotesk headings, JetBrains Mono code, dark blue palette).

### 4. Smart contract
Arc Studio handled the full contract pipeline:
- **Clarification:** asked structured questions about access control, data fields, and upgradeability before writing a single line.
- **Design doc:** produced a full Circle-style spec (`contracts/PaymentRegistry-design.md`) covering goals, actors, storage layout, security table, threat model, and testing strategy — confirmed before coding.
- **Writing:** wrote `PaymentRegistry.sol` — a permissionless, fixed, gas-efficient registry with input guards, recorder attribution, payer indexing, and paginated reads.
- **Security review:** ran two parallel reviewers (rule corpus + functional adversary analysis) at max depth, found and fixed input validation gaps and missing read paths.
- **Static analysis:** ran Slither — 0 findings.
- **Unit tests:** wrote and ran 51 Foundry tests (unit, fuzz, invariant) — all passed.
- **Deployment:** deployed to Arc Testnet in one command.

### 5. Deployment configuration
Arc Studio configured Vercel deployment: wrote `vercel.json`, created `api/index.ts` as a serverless adapter for the Express server, added `.env.example`, and updated `README.md` with a deploy button and step-by-step instructions.

### 6. GitHub integration
Arc Studio set up the git repository, wrote `.gitignore`, committed all code, and pushed every change to `https://github.com/Lieulieu/Arc-Payment-Rail` throughout the session.

### 7. Documentation
Arc Studio produced `docs/go-to-market.md` (audience and distribution strategy), `docs/project-submit.md` (hackathon submission with deployment analysis), and this file — all generated from the actual project state, not templates.

---

## Why Arc?

Arc is the ideal chain for this use case for three reasons:

1. **USDC is the native gas token.** Agents pay for API calls in USDC and pay gas in USDC — one asset, no ETH required, no token swaps, no price risk on gas.
2. **Sub-second finality.** A payment settles in under one second, so the API server can verify and respond in a single HTTP round-trip.
3. **Stable, predictable fees.** Micropayments only work when the fee is smaller than the payment. Arc's $0.00001 gas cost per transaction makes $0.001 USDC calls economically viable at scale.

---

*Built end-to-end with [Arc Studio](https://studio.arc.io) — onchain apps in minutes.*
