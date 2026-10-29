# Build Submission — Completed Form

---

## Your name, alias, or team name

[YOU: Enter your name, alias, or team name]

---

## Arc Studio project URL (https://studio.arc.io/app/…)

[YOU: Paste the URL from your Arc Studio browser address bar — it looks like https://studio.arc.io/app/YOUR_PROJECT_ID]

---

## Link to your live app

https://i396h77h07qyvm9zd20se.preview.studio.arc.io

> Note: this is the Arc Studio preview URL for this session. If you deployed to Netlify, Vercel, or Hugging Face, paste that URL here instead.

---

## Contract address(es) and one example transaction hash, with a link on explorer.arc.io

This project uses Circle Gateway Nanopayments (off-chain x402 authorization + Gateway settlement) rather than a custom smart contract. The Gateway Wallet contract on Arc Testnet handles settlement.

- Gateway Facilitator: https://gateway-api-testnet.circle.com
- Chain: Arc Testnet (Chain ID 5042002)
- Explorer: https://explorer.testnet.arc.io

[YOU: If you ran a paid `circle services pay` call, paste the transaction hash from the output here with its explorer link:
https://explorer.testnet.arc.io/tx/YOUR_TX_HASH]

---

## Public repo

[YOU: Paste your GitHub repo URL here, e.g. https://github.com/YOUR_USERNAME/ai-agent-payment-rail]

> To push to GitHub: open the Integrations menu in the Arc Studio header and connect your GitHub account.

---

## Video walkthrough showing the build in Arc Studio and the mainnet transaction

[YOU: Record a short screen recording (Loom, YouTube, etc.) showing:
1. The Arc Studio chat where the app was built
2. The dashboard UI with the "Live" indicator
3. Running `circle services pay` in a terminal and seeing the 402 → 200 flow
4. The paid call appearing in the dashboard call log
Then paste the link here.]

---

## What does your project do, and how did you use Arc Studio to build it?

**AI Agent Payment Rail** is a paid AI inference API that lets any AI agent call an HTTP endpoint and pay $0.001 USDC per request — no credit card, no account setup, no API key. The payment happens inline using the x402 protocol: the server returns HTTP 402 with a `PAYMENT-REQUIRED` header, the agent attaches a USDC authorization signed with its wallet, and Circle Gateway Nanopayments settles it gaslessly on Arc Testnet.

Arc was the ideal chain because USDC is the native gas token — agents hold one asset for both payments and gas, fees are stable and predictable, and finality is sub-second.

The project was built entirely in Arc Studio through natural language conversation:
- **Backend:** Express server with `@circle-fin/x402-batching` middleware that gates `POST /v1/inference` behind `gateway.require("$0.001")`. Any unpaid request gets a 402; a paying agent gets the inference response.
- **Frontend:** Arc Dark dashboard showing a live call log (polled every 2 seconds), stats bar (total calls, USDC revenue, unique payers, stream status), a developer test panel that demonstrates the 402 gate, and a CLI snippet for agents.
- **Chain:** Arc Testnet with Circle Gateway Nanopayments facilitator at `https://gateway-api-testnet.circle.com`.

Arc Studio wrote all the Solidity-free contract integration, the Express payment middleware wiring, the React dashboard, the SSE/polling hook, the Vite proxy config, and the `.env` setup — in a single conversation.

---

## Have you received a Circle or Arc grant, bounty, or prize for this project?

[YOU: Select "Yes" or "No"]

---

## Looking for teammates

[YOU: Check if applicable]

---

## I agree to the Terms of Use Agreement and Participant Agreement

[YOU: Check to confirm agreement before submitting]
