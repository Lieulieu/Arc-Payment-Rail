# Video Walkthrough Script
## Arc Payment Rail — Built with Arc Studio

**Recommended tool:** Loom (loom.com) — free, records screen + webcam, instant shareable link.
**Target length:** 2–3 minutes.
**Resolution:** 1080p, browser fullscreen.

---

## Before You Hit Record

- [ ] Arc Studio open with this project loaded
- [ ] Preview panel visible (dashboard running)
- [ ] Terminal ready (Circle CLI logged in, mainnet session active)
- [ ] `bun run dev:server` running (dashboard shows "Live" status)
- [ ] Browser wallet connected (MetaMask or similar) on Arc Testnet
- [ ] Arc mainnet explorer open: https://explorer.arc.io/address/0x5e09794C98E89fc9fC8FDaA9bE51CE024f5BA697
- [ ] Leaderboard tab open, set to Arc Mainnet + Onchain mode

---

## Scene-by-Scene Script

### Scene 1 — Hook (0:00–0:20)
**Show:** Arc Studio chat panel with the conversation history scrolled to the top.

**Say:**
> "I built a fully functional AI agent payment API in a single conversation using Arc Studio.
> Agents pay $0.001 USDC per API call — no accounts, no credit cards, no setup.
> Let me show you what we built and the live mainnet transaction."

---

### Scene 2 — The Dashboard (0:20–0:50)
**Show:** Switch to the Preview panel. Click through all 4 tabs.

**Say:**
> "This is the live dashboard. The Overview tab shows total calls, USDC revenue, and a spend chart.
> The History tab is a full paginated call log with filters.
> The Leaderboard shows agents ranked by total USDC spent.
> And the Wallets tab shows all Circle agent wallets — testnet and mainnet."

**Action:** Switch Leaderboard to Arc Mainnet + Onchain mode. Show the 10 mainnet records.

---

### Scene 3 — The Payment Flow (0:50–1:20)
**Show:** Open a terminal. Type the `circle services pay` command against localhost.

**Say:**
> "Here's how an agent pays. One command — no wallet setup, no private key management.
> The CLI sends the request, gets a 402 Payment Required back,
> signs a $0.001 USDC authorization via Circle Gateway,
> and the server returns the inference response."

**Action:** Run:
```bash
circle services pay \
  --url http://localhost:3001/v1/inference \
  -X POST \
  --data '{"prompt":"What is Arc?"}' \
  --address 0x59a836ae26c0dec4bb506fa4fd7a81b491dc0e3e \
  --chain ARC-TESTNET \
  --max-amount 0.01
```

Show the 200 response. Switch back to the dashboard — new call appears in the log.

---

### Scene 4 — The Smart Contract (1:20–1:50)
**Show:** Open the Arc mainnet explorer tab.
URL: https://explorer.arc.io/address/0x5e09794C98E89fc9fC8FDaA9bE51CE024f5BA697

**Say:**
> "Every paid call gets recorded onchain. This is the PaymentRegistry contract
> deployed on Arc mainnet — a permanent, tamper-proof receipt for every $0.001 payment.
> Payer address, timestamp, USDC amount, and a hash of the prompt — all onchain.
> Deploying this contract cost less than a cent in gas fees."

**Action:** Click on a recent transaction. Show the input data decoded.

---

### Scene 5 — Built with Arc Studio (1:50–2:20)
**Show:** Switch back to Arc Studio. Scroll the chat timeline to show the conversation.

**Say:**
> "Everything you just saw — the Express payment server, the React dashboard,
> the smart contract with a full security review and 51 unit tests,
> deployment to Arc Testnet and Arc mainnet — built in one conversation.
> No separate IDE, no manual Foundry setup, no boilerplate."

**Action:** Scroll through the chat to show key milestones:
- The dashboard being built
- The security review findings
- The `forge test` output (51 passed)
- The deploy confirmation

---

### Scene 6 — Call to Action (2:20–2:30)
**Show:** Arc Studio homepage or this project's GitHub.

**Say:**
> "Arc Studio is available at studio.arc.io.
> The full source code is at github.com/Lieulieu/Arc-Payment-Rail.
> Try it — you can build something like this in under an hour."

---

## After Recording

1. Upload to Loom or YouTube (unlisted is fine for a hackathon submission)
2. Copy the share URL
3. Add it to `docs/project-submit.md` under the Video field
4. Add it to `docs/fill-form-completed.md` under the Video Walkthrough field

---

## Key Facts to Mention (in any order)

| Fact | Value |
|------|-------|
| Payment amount | $0.001 USDC per call |
| Protocol | Circle Gateway Nanopayments + x402 |
| Chain | Arc Testnet + Arc Mainnet |
| Contract (testnet) | `0x4c6f...698fe` |
| Contract (mainnet) | `0x5e09...a697` |
| Mainnet tx | `0xb0d3...6719` |
| Unit tests | 51 passed, 0 failed |
| Gas cost to deploy | ~$0.002 USDC |
| Gas cost per call | ~$0.0005 USDC |
| Build tool | Arc Studio (studio.arc.io) |
| Source code | github.com/Lieulieu/Arc-Payment-Rail |

---

## Thumbnail (for YouTube/Loom cover)

Use `public/logo.svg` as the thumbnail base. Add text overlay:
- **Title:** "AI Agent Payment Rail"
- **Subtitle:** "$0.001 USDC per call · Built with Arc Studio"
- **Background:** Arc Dark (`#0a0f1e`)
