/**
 * In-memory event store for paid API calls.
 * Fans out to all connected SSE clients so the dashboard updates live.
 */

import type { Response } from "express";

export interface PaidCallEvent {
  id: string;
  timestamp: number;
  payer: string;
  amount: string;   // raw USDC units string
  network: string;
  promptPreview: string;
  tokens: number;
  latency_ms: number;
}

// Keep last 200 events in memory
const MAX_EVENTS = 200;
const events: PaidCallEvent[] = [];
const clients = new Set<Response>();

let seq = 0;

export function recordCall(event: Omit<PaidCallEvent, "id">): PaidCallEvent {
  const id = `evt_${Date.now()}_${++seq}`;
  const full: PaidCallEvent = { id, ...event };
  events.unshift(full);
  if (events.length > MAX_EVENTS) events.pop();
  broadcast(full);
  return full;
}

export function getRecentEvents(): PaidCallEvent[] {
  return [...events];
}

// ── History (paginated + filtered) ───────────────────────────────────────────

export interface HistoryQuery {
  payer?: string;
  from?: number;   // unix ms
  to?: number;     // unix ms
  minAmount?: number; // raw USDC units
  maxAmount?: number;
  page?: number;
  pageSize?: number;
}

export interface HistoryResult {
  events: PaidCallEvent[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
}

export function getHistory(q: HistoryQuery): HistoryResult {
  const page = Math.max(1, q.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, q.pageSize ?? 20));

  let filtered = [...events];
  if (q.payer) {
    const p = q.payer.toLowerCase();
    filtered = filtered.filter((e) => e.payer.toLowerCase().includes(p));
  }
  if (q.from) filtered = filtered.filter((e) => e.timestamp >= q.from!);
  if (q.to)   filtered = filtered.filter((e) => e.timestamp <= q.to!);
  if (q.minAmount !== undefined) filtered = filtered.filter((e) => parseInt(e.amount) >= q.minAmount!);
  if (q.maxAmount !== undefined) filtered = filtered.filter((e) => parseInt(e.amount) <= q.maxAmount!);

  const total = filtered.length;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const slice = filtered.slice((page - 1) * pageSize, page * pageSize);

  return { events: slice, total, page, pageSize, pages };
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  payer: string;
  totalAmount: number;  // raw USDC units
  callCount: number;
  lastSeen: number;     // unix ms
}

export function getLeaderboard(limit = 10): LeaderboardEntry[] {
  const map = new Map<string, LeaderboardEntry>();
  for (const ev of events) {
    const existing = map.get(ev.payer);
    if (existing) {
      existing.totalAmount += parseInt(ev.amount || "0", 10);
      existing.callCount += 1;
      if (ev.timestamp > existing.lastSeen) existing.lastSeen = ev.timestamp;
    } else {
      map.set(ev.payer, {
        payer: ev.payer,
        totalAmount: parseInt(ev.amount || "0", 10),
        callCount: 1,
        lastSeen: ev.timestamp,
      });
    }
  }
  return [...map.values()]
    .sort((a, b) => b.totalAmount - a.totalAmount)
    .slice(0, limit);
}

// ── Spend chart ───────────────────────────────────────────────────────────────

export interface ChartBucket {
  label: string;   // "HH:mm" for hourly, "MM-DD" for daily
  ts: number;      // bucket start unix ms
  amount: number;  // raw USDC units
  calls: number;
}

export function getSpendChart(mode: "hourly" | "daily" = "hourly", buckets = 24): ChartBucket[] {
  const now = Date.now();
  const bucketMs = mode === "hourly" ? 3_600_000 : 86_400_000;
  const result: ChartBucket[] = [];

  for (let i = buckets - 1; i >= 0; i--) {
    const ts = now - i * bucketMs;
    const rounded = Math.floor(ts / bucketMs) * bucketMs;
    const d = new Date(rounded);
    const label =
      mode === "hourly"
        ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
        : `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    result.push({ label, ts: rounded, amount: 0, calls: 0 });
  }

  for (const ev of events) {
    const bucket = Math.floor(ev.timestamp / bucketMs) * bucketMs;
    const entry = result.find((b) => b.ts === bucket);
    if (entry) {
      entry.amount += parseInt(ev.amount || "0", 10);
      entry.calls += 1;
    }
  }

  return result;
}

export function addSseClient(res: Response): void {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  // Send all existing events on connect
  for (const ev of [...events].reverse()) {
    res.write(`data: ${JSON.stringify(ev)}\n\n`);
  }

  clients.add(res);
  res.on("close", () => clients.delete(res));
}

function broadcast(event: PaidCallEvent): void {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
}
