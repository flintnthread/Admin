import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { getApiDebugInfo, resolveAdminApiBaseUrl } from "@/lib/api/config";

type HealthState = "checking" | "ok" | "fail";

/** Dev-only: shows which API URL mobile/web is using and whether backend responds. */
export default function ApiDevHint() {
  if (!__DEV__) return null;

  const { baseUrl, platform, devHost } = getApiDebugInfo();
  const [health, setHealth] = useState<HealthState>("checking");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${resolveAdminApiBaseUrl()}/api/admin/health`, {
          method: "GET",
          headers: { Accept: "application/json" },
        });
        if (!cancelled) setHealth(res.ok ? "ok" : "fail");
      } catch {
        if (!cancelled) setHealth("fail");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [baseUrl]);

  const healthLabel =
    health === "checking" ? "Checking…" : health === "ok" ? "Connected" : "Unreachable";

  const healthColor =
    health === "checking" ? "#64748b" : health === "ok" ? "#059669" : "#dc2626";

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Dev API ({platform})</Text>
      <Text style={styles.url} selectable>
        {baseUrl}
      </Text>
      {devHost ? (
        <Text style={styles.meta}>Metro host: {devHost}</Text>
      ) : Platform.OS !== "web" ? (
        <Text style={styles.meta}>
          Set EXPO_PUBLIC_ADMIN_API_BASE_URL in Admin/.env if auto-detect fails
        </Text>
      ) : null}
      <Text style={[styles.status, { color: healthColor }]}>{healthLabel}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 12,
    marginBottom: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  title: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  url: {
    fontSize: 12,
    color: "#0f172a",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  meta: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 4,
  },
  status: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
});
