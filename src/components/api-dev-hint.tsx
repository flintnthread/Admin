import React, { useCallback, useEffect, useState } from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
  ensureAdminApiReachable,
  getApiDebugInfo,
  resolveAdminApiBaseUrl,
} from "@/lib/api/config";

type HealthState = "checking" | "ok" | "fail";

/** Dev-only: shows which API URL mobile/web is using and whether backend responds. */
export default function ApiDevHint() {
  if (!__DEV__) return null;

  const {
    baseUrl,
    candidates,
    platform,
    devHost,
    webHost,
    webPort,
    portConflict,
    webDevUrl,
    isEmulator,
  } = getApiDebugInfo();
  const [health, setHealth] = useState<HealthState>("checking");
  const [activeUrl, setActiveUrl] = useState(baseUrl);
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  const checkHealth = useCallback(async () => {
    setHealth("checking");
    setErrorDetail(null);
    if (portConflict) {
      setActiveUrl(resolveAdminApiBaseUrl());
      setErrorDetail(portConflict);
      setHealth("fail");
      return;
    }
    try {
      const url = await ensureAdminApiReachable();
      setActiveUrl(url);
      setHealth("ok");
    } catch (e) {
      setActiveUrl(resolveAdminApiBaseUrl());
      setErrorDetail(e instanceof Error ? e.message : "Admin API unreachable");
      setHealth("fail");
    }
  }, [portConflict]);

  useEffect(() => {
    void checkHealth();
  }, [checkHealth]);

  const healthLabel =
    health === "checking" ? "Checking…" : health === "ok" ? "Connected" : "Unreachable";

  const healthColor =
    health === "checking" ? "#64748b" : health === "ok" ? "#059669" : "#dc2626";

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Dev API ({platform})</Text>
      <Text style={styles.url} selectable>
        API → {activeUrl}
      </Text>
      {webHost ? (
        <Text style={styles.meta}>
          Page: {webHost}{webPort ? `:${webPort}` : ""}
        </Text>
      ) : null}
      {devHost ? <Text style={styles.meta}>Metro / LAN: {devHost}</Text> : null}
      {isEmulator ? <Text style={styles.meta}>Android emulator → 10.0.2.2:8082</Text> : null}
      <Text style={styles.meta} numberOfLines={4}>
        Try: {candidates.join(" → ")}
      </Text>
      <Text style={[styles.status, { color: healthColor }]}>{healthLabel}</Text>
      {health === "fail" ? (
        <Text style={styles.help}>
          {errorDetail ?? "Cannot reach admin-backend."}
          {"\n\n"}
          1) Backend: mvn -f seller-backend/admin-backend/pom.xml spring-boot:run (port 8082)
          {"\n"}
          2) Web UI: cd Admin && npm run web → open {webDevUrl}/login
          {"\n"}
          3) Phone: set EXPO_PUBLIC_ADMIN_API_BASE_URL=http://YOUR_PC_IP:8082 in Admin/.env
        </Text>
      ) : null}
      <TouchableOpacity style={styles.retryBtn} onPress={() => void checkHealth()}>
        <Text style={styles.retryText}>Retry connection</Text>
      </TouchableOpacity>
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
  help: {
    fontSize: 11,
    color: "#b45309",
    marginTop: 6,
    lineHeight: 16,
  },
  retryBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#e2e8f0",
  },
  retryText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
});
