/**
 * SSE hook — streams paid-call events from the server into React state.
 * Falls back gracefully when the server is unreachable.
 */

import { useEffect, useRef, useState } from "react";

export interface PaidCallEvent {
  id: string;
  timestamp: number;
  payer: string;
  amount: string;
  network: string;
  promptPreview: string;
  tokens: number;
  latency_ms: number;
}

export interface CallStreamState {
  events: PaidCallEvent[];
  connected: boolean;
  totalRevenue: number;   // raw USDC units (divide by 1e6 for display)
  uniquePayers: number;
}

const MAX_EVENTS = 100;

const POLL_INTERVAL_MS = 2000;

export function useCallStream(): CallStreamState {
  const [events, setEvents] = useState<PaidCallEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const seenIds = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const r = await fetch("/api/v1/recent");
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const data = (await r.json()) as { events: PaidCallEvent[] };
        if (cancelled) return;

        if (Array.isArray(data.events)) {
          const fresh = data.events.filter((ev) => !seenIds.current.has(ev.id));
          if (fresh.length > 0) {
            for (const ev of fresh) seenIds.current.add(ev.id);
            setEvents(data.events.slice(0, MAX_EVENTS));
          }
        }
        setConnected(true);
      } catch {
        if (!cancelled) setConnected(false);
      } finally {
        if (!cancelled) timerRef.current = setTimeout(() => { void poll(); }, POLL_INTERVAL_MS);
      }
    }

    void poll();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
      setConnected(false);
    };
  }, []);

  const totalRevenue = events.reduce((sum, ev) => sum + parseInt(ev.amount || "0", 10), 0);
  const uniquePayers = new Set(events.map((ev) => ev.payer)).size;

  return { events, connected, totalRevenue, uniquePayers };
}
