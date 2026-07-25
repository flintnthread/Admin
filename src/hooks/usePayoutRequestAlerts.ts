import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";
import { useAuth } from "@/context/auth-context";
import { playAlertBeep } from "@/lib/playAlertBeep";
import {
  fetchPayoutAlerts,
  type PayoutAlerts,
  type PayoutRequestItem,
} from "@/services/payoutApi";

const SEEN_IDS_KEY = "admin_seen_payout_request_ids";
const POLL_MS = 30_000;

/** Shared across all hook consumers so we only poll/beep once. */
let sharedPrimed = false;
let sharedSeenIds = loadSeenIds();
let sharedAlerts: PayoutAlerts | null = null;
let sharedNotifications: PayoutNotifItem[] = [];
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function loadSeenIds(): Set<number> {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    try {
      const raw = localStorage.getItem(SEEN_IDS_KEY);
      if (raw) {
        const arr = JSON.parse(raw) as number[];
        if (Array.isArray(arr)) return new Set(arr.filter((n) => typeof n === "number"));
      }
    } catch {
      // ignore
    }
  }
  return new Set();
}

function saveSeenIds(ids: Set<number>) {
  if (Platform.OS === "web" && typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(SEEN_IDS_KEY, JSON.stringify([...ids].slice(-300)));
    } catch {
      // ignore
    }
  }
}

function formatRelativeTime(value?: string | null): string {
  if (!value) return "Just now";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "Just now";
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export type PayoutNotifItem = {
  id: string;
  requestId: number;
  text: string;
  detail: string;
  time: string;
  orderNumber?: string;
};

function mapItems(requests: PayoutRequestItem[]): PayoutNotifItem[] {
  return requests.map((r) => {
    const order = r.orderNumber || `Order #${r.orderId ?? r.id}`;
    const seller = r.sellerName || "Seller";
    const amount =
      r.requestedAmount != null
        ? `₹${Number(r.requestedAmount).toLocaleString("en-IN")}`
        : "";
    return {
      id: `payout-req-${r.id}`,
      requestId: r.id,
      text: `New payment request from ${seller}`,
      detail: `${order}${amount ? ` · ${amount}` : ""}`,
      time: formatRelativeTime(r.requestedAt),
      orderNumber: r.orderNumber,
    };
  });
}

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

async function refreshShared(token: string): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const data = await fetchPayoutAlerts();
      const recent = (data.recentRequests ?? []).filter(
        (r) => (r.status ?? "").toLowerCase() === "pending",
      );
      const currentIds = recent.map((r) => r.id).filter((id) => typeof id === "number");

      if (!sharedPrimed) {
        currentIds.forEach((id) => sharedSeenIds.add(id));
        saveSeenIds(sharedSeenIds);
        sharedPrimed = true;
      } else {
        const fresh = currentIds.filter((id) => !sharedSeenIds.has(id));
        if (fresh.length > 0) {
          fresh.forEach((id) => sharedSeenIds.add(id));
          saveSeenIds(sharedSeenIds);
          playAlertBeep();
        }
      }

      sharedAlerts = data;
      sharedNotifications = mapItems(recent);
      notifyListeners();
    } catch {
      // non-blocking
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

let pollTimer: ReturnType<typeof setInterval> | null = null;
let activeConsumers = 0;

function startPolling(token: string) {
  activeConsumers += 1;
  if (pollTimer) return;
  void refreshShared(token);
  pollTimer = setInterval(() => {
    void refreshShared(token);
  }, POLL_MS);
}

function stopPolling() {
  activeConsumers = Math.max(0, activeConsumers - 1);
  if (activeConsumers === 0 && pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

export function usePayoutRequestAlerts(enabled = true) {
  const { token } = useAuth();
  const [, bump] = useState(0);

  useEffect(() => {
    const onChange = () => bump((n) => n + 1);
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  useEffect(() => {
    if (!enabled || !token || token === false) return;
    startPolling(token);
    return () => stopPolling();
  }, [enabled, token]);

  const refresh = useCallback(async () => {
    if (!token || token === false) return;
    await refreshShared(token);
  }, [token]);

  return {
    alerts: sharedAlerts,
    notifications: sharedNotifications,
    pendingCount: Number(sharedAlerts?.pendingRequestCount ?? 0),
    newRequestCount: Number(sharedAlerts?.newRequestCount ?? 0),
    refresh,
  };
}
