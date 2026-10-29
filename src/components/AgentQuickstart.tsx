/**
 * AgentQuickstart — copy-ready CLI/code snippets for agent developers.
 * Auto-fills the server URL so nothing needs manual editing.
 */

import { useState } from "react";
import { Terminal, Copy, Check, ChevronDown } from "lucide-react";

const ENDPOINT = typeof window !== "undefined"
  ? `${window.location.origin}/api/v1/inference`
  : "http://localhost:3001/v1/inference";

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={copy}
      className="p-1.5 rounded text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors"
      title="Copy"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
    </button>
  );
}

const TABS = ["CLI", "curl", "Python", "Node"] as const;
type Tab = typeof TABS[number];

function getSnippet(tab: Tab, endpoint: string): string {
  switch (tab) {
    case "CLI":
      return `# 1. Install Circle CLI
npm install -g @circle-fin/cli

# 2. Log in + create testnet wallet
circle wallet login YOUR_EMAIL --testnet
circle wallet create --testnet

# 3. Fund via faucet, then deposit to Gateway
circle gateway deposit --amount 0.50 \\
  --address YOUR_WALLET \\
  --chain ARC-TESTNET \\
  --method direct

# 4. Pay per call
circle services pay \\
  --url ${endpoint} \\
  -X POST \\
  --data '{"prompt":"What is Circle Gateway?"}' \\
  --address YOUR_WALLET \\
  --chain ARC-TESTNET \\
  --max-amount 0.01`;

    case "curl":
      return `# Unpaid — returns 402 with payment terms
curl -i -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '{"prompt":"What is Circle Gateway?"}'

# Paid — attach PAYMENT-AUTHORIZATION header
# (header value comes from circle services pay or x402 client)
curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -H "PAYMENT-AUTHORIZATION: <base64-signed-auth>" \\
  -d '{"prompt":"What is Circle Gateway?"}'`;

    case "Python":
      return `import requests
from x402.client import GatewayClient  # pip install x402

client = GatewayClient(
    chain="arcTestnet",
    private_key="0xYOUR_PRIVATE_KEY",
)

response = client.pay(
    url="${endpoint}",
    method="POST",
    json={"prompt": "What is Circle Gateway?"},
)
print(response.json())`;

    case "Node":
      return `import { GatewayClient } from "@circle-fin/x402-batching/client";

const client = new GatewayClient({
  chain: "arcTestnet",
  privateKey: process.env.PRIVATE_KEY as \`0x\${string}\`,
});

const { data, status } = await client.pay(
  "${endpoint}",
  {
    method: "POST",
    body: JSON.stringify({ prompt: "What is Circle Gateway?" }),
    headers: { "Content-Type": "application/json" },
  }
);

console.log("Status:", status);
console.log("Response:", data);`;
  }
}

export function AgentQuickstart() {
  const [tab, setTab] = useState<Tab>("CLI");
  const [open, setOpen] = useState(true);
  const snippet = getSnippet(tab, ENDPOINT);

  return (
    <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-blue-400" />
          <span
            className="text-sm font-semibold text-white"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            Agent Quickstart
          </span>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] font-semibold text-blue-400">
            x402 · $0.001/call
          </span>
        </div>
        <ChevronDown
          size={14}
          className={`text-white/40 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="border-t border-white/10">
          {/* Tab bar */}
          <div className="flex items-center gap-1 px-5 pt-3 pb-2">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  "px-3 py-1 rounded-md text-[11px] font-semibold transition-colors",
                  tab === t
                    ? "bg-blue-600/20 text-blue-300 border border-blue-500/30"
                    : "text-white/40 hover:text-white/70 hover:bg-white/5",
                ].join(" ")}
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Code block */}
          <div className="relative mx-5 mb-5">
            <pre
              className="rounded-lg bg-black/30 border border-white/10 px-4 py-4 text-[11px] text-blue-200 overflow-x-auto leading-relaxed"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {snippet}
            </pre>
            <div className="absolute top-2 right-2">
              <CopyBtn text={snippet} />
            </div>
          </div>

          {/* Endpoint info */}
          <div className="mx-5 mb-5 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-black/20 border border-white/5">
            <span className="text-[10px] text-white/30 shrink-0" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              Endpoint
            </span>
            <span
              className="text-[11px] text-blue-300 truncate tabular-nums flex-1"
              style={{ fontFamily: "'JetBrains Mono', monospace" }}
            >
              {ENDPOINT}
            </span>
            <CopyBtn text={ENDPOINT} />
          </div>
        </div>
      )}
    </div>
  );
}
