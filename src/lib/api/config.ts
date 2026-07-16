import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

/** Production admin API — nginx on either domain routes /api/admin/ → 8082 */
export const PRODUCTION_ADMIN_API_URL = "https://flintnthread.online";
export const PRODUCTION_ADMIN_API_URL_IN = "https://flintnthread.in";
export const PRODUCTION_ADMIN_API_URLS = [
  PRODUCTION_ADMIN_API_URL,
  PRODUCTION_ADMIN_API_URL_IN,
] as const;

const ADMIN_API_PORT = 8082;
const ADMIN_WEB_DEV_PORT = 8081;

type ExpoExtra = {
  adminApiBaseUrl?: string;
  androidEmulatorApi?: boolean;
};

let cachedWorkingBaseUrl: string | null = null;
let cacheExpiresAt = 0;
const CACHE_TTL_MS = 60_000;

function getExtra(): ExpoExtra {
  return (Constants.expoConfig?.extra ?? {}) as ExpoExtra;
}

function isAndroidEmulator(): boolean {
  if (Platform.OS !== "android") return false;
  if (getExtra().androidEmulatorApi) return true;
  return Device.isDevice === false;
}

function isIosSimulator(): boolean {
  return Platform.OS === "ios" && Device.isDevice === false;
}

function hostFromUri(uri: string | undefined | null): string | null {
  if (!uri || typeof uri !== "string") return null;
  const trimmed = uri.trim();
  if (!trimmed) return null;
  try {
    const withScheme = trimmed.includes("://") ? trimmed : `http://${trimmed}`;
    const host = new URL(withScheme).hostname?.trim();
    if (!host || host === "localhost" || host === "127.0.0.1") return null;
    return host;
  } catch {
    const host = trimmed.split(":")[0]?.trim();
    if (!host || host === "localhost" || host === "127.0.0.1" || host === "http" || host === "https") {
      return null;
    }
    return host;
  }
}

/** LAN hostname when Expo dev server runs on PC IP (Expo Go / dev client). */
export function getExpoDevLanHost(): string | null {
  const uris: (string | undefined | null)[] = [
    Constants.expoConfig?.hostUri,
    (Constants.expoGoConfig as { hostUri?: string } | null)?.hostUri,
    (Constants.expoConfig as { debuggerHost?: string } | null)?.debuggerHost,
    Constants.manifest2?.extra?.expoGo?.debuggerHost,
    Constants.manifest2?.extra?.expoClient?.hostUri,
    Constants.linkingUri,
  ];

  for (const uri of uris) {
    const host = hostFromUri(uri);
    if (host) return host;
  }
  return null;
}

/** When web app is opened via LAN IP on a phone browser, use same host for API. */
function getWebLanHost(): string | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const host = window.location.hostname?.trim();
  if (!host || host === "localhost" || host === "127.0.0.1") return null;
  return host;
}

function buildLocalUrl(host: string): string {
  return `http://${host}:${ADMIN_API_PORT}`;
}

function uniqueUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of urls) {
    const normalized = url.trim().replace(/\/$/, "");
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

/** Prefer the production domain that matches the browser host (.in vs .online). */
function preferProductionUrlForHost(urls: string[]): string[] {
  if (Platform.OS !== "web" || typeof window === "undefined") return urls;
  const host = window.location.hostname?.toLowerCase() ?? "";
  if (!host) return urls;
  const preferIn = host === "flintnthread.in" || host.endsWith(".flintnthread.in");
  const preferOnline =
    host === "flintnthread.online" || host.endsWith(".flintnthread.online");
  if (!preferIn && !preferOnline) return urls;
  return [...urls].sort((a, b) => {
    const aIn = a.includes("flintnthread.in");
    const bIn = b.includes("flintnthread.in");
    if (preferIn) return Number(bIn) - Number(aIn);
    return Number(!bIn) - Number(!aIn);
  });
}

function getConfiguredProductionApiUrl(): string | null {
  const fromEnv = process.env.EXPO_PUBLIC_ADMIN_API_BASE_URL?.trim().replace(/\/$/, "");
  const fromExtra = getExtra().adminApiBaseUrl?.trim().replace(/\/$/, "");
  return fromEnv || fromExtra || null;
}

function getProductionApiUrl(): string {
  return getConfiguredProductionApiUrl() || getProductionApiUrlCandidates()[0] || PRODUCTION_ADMIN_API_URL;
}

/** Ordered production API bases: preferred host first, then the other domain. */
export function getProductionApiUrlCandidates(): string[] {
  const configured = getConfiguredProductionApiUrl();
  const defaults = preferProductionUrlForHost([...PRODUCTION_ADMIN_API_URLS]);
  if (!configured) return uniqueUrls(defaults);
  return uniqueUrls([configured, ...defaults]);
}

function useLocalApiFallbacks(): boolean {
  return process.env.EXPO_PUBLIC_ADMIN_API_USE_LOCAL === "true";
}

/** True when the browser opened the Admin UI on the API port (8082) — login will fail. */
export function getWebDevPortConflict(): string | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  const port = window.location.port || (window.location.protocol === "https:" ? "443" : "80");
  if (port === String(ADMIN_API_PORT)) {
    return `This page is on port ${ADMIN_API_PORT} (API port). Open http://localhost:${ADMIN_WEB_DEV_PORT}/login instead.`;
  }
  return null;
}

export function getAdminWebDevUrl(): string {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const host = window.location.hostname || "localhost";
    return `http://${host}:${ADMIN_WEB_DEV_PORT}`;
  }
  return `http://localhost:${ADMIN_WEB_DEV_PORT}`;
}

/**
 * Candidate admin API base URLs (most likely first).
 * Defaults: https://flintnthread.online and https://flintnthread.in (VPS nginx → admin :8082).
 * Local fallbacks only when EXPO_PUBLIC_ADMIN_API_USE_LOCAL=true.
 */
export function getAdminApiBaseUrlCandidates(): string[] {
  const candidates: string[] = [];

  if (useLocalApiFallbacks()) {
    if (Platform.OS === "web") {
      const webOverride = process.env.EXPO_PUBLIC_ADMIN_API_WEB_BASE_URL?.trim().replace(/\/$/, "");
      if (webOverride) candidates.push(webOverride);

      const webLan = getWebLanHost();
      if (webLan) candidates.push(buildLocalUrl(webLan));

      candidates.push(buildLocalUrl("localhost"), buildLocalUrl("127.0.0.1"));
    }

    const devHost = getExpoDevLanHost();
    if (devHost) candidates.push(buildLocalUrl(devHost));

    if (Platform.OS === "android" && isAndroidEmulator()) {
      candidates.push(buildLocalUrl("10.0.2.2"));
    }

    if (isIosSimulator()) {
      candidates.push(buildLocalUrl("localhost"), buildLocalUrl("127.0.0.1"));
    }

    candidates.push(buildLocalUrl("localhost"), buildLocalUrl("127.0.0.1"));

    if (Platform.OS === "android") {
      candidates.push(buildLocalUrl("10.0.2.2"));
    }

    candidates.push(...getProductionApiUrlCandidates());
    return uniqueUrls(candidates);
  }

  // Production web on flintnthread.* → same-origin API first (works for .online and .in).
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const host = window.location.hostname?.toLowerCase() ?? "";
    if (
      host === "flintnthread.online" ||
      host.endsWith(".flintnthread.online") ||
      host === "flintnthread.in" ||
      host.endsWith(".flintnthread.in")
    ) {
      candidates.push(window.location.origin.replace(/\/$/, ""));
    }
  }

  candidates.push(...getProductionApiUrlCandidates());
  return uniqueUrls(candidates);
}

/**
 * Admin API base URL (no trailing slash).
 * Uses cached URL after health probe, else production first.
 */
export function resolveAdminApiBaseUrl(): string {
  if (cachedWorkingBaseUrl && Date.now() < cacheExpiresAt) {
    return cachedWorkingBaseUrl;
  }
  return getAdminApiBaseUrlCandidates()[0] ?? PRODUCTION_ADMIN_API_URL;
}

export function setWorkingAdminApiBaseUrl(url: string): void {
  cachedWorkingBaseUrl = url.replace(/\/$/, "");
  cacheExpiresAt = Date.now() + CACHE_TTL_MS;
}

export function clearWorkingAdminApiBaseUrl(): void {
  cachedWorkingBaseUrl = null;
  cacheExpiresAt = 0;
}

/** Probe /api/admin/health and cache the first reachable base URL. */
export async function ensureAdminApiReachable(): Promise<string> {
  const portConflict = getWebDevPortConflict();
  if (portConflict) {
    throw new Error(portConflict);
  }

  const candidates = getAdminApiBaseUrlCandidates();
  let lastError: unknown = null;

  for (const baseUrl of candidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(`${baseUrl}/api/admin/health`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const contentType = res.headers.get("content-type") ?? "";
      const raw = await res.text();
      if (!res.ok) continue;
      if (!contentType.includes("application/json") && raw.trimStart().startsWith("<")) {
        continue;
      }
      let body: { status?: string; service?: string } | null = null;
      try {
        body = JSON.parse(raw) as { status?: string; service?: string };
      } catch {
        continue;
      }
      if (body?.status === "ok" && body?.service === "admin-backend") {
        setWorkingAdminApiBaseUrl(baseUrl);
        return baseUrl;
      }
    } catch (error) {
      lastError = error;
    }
  }

  clearWorkingAdminApiBaseUrl();
  if (lastError instanceof Error) throw lastError;
  throw new Error(
    `Admin API not reachable at ${PRODUCTION_ADMIN_API_URLS.join(" or ")}. Check VPS nginx /api/admin/ routing and flint-admin service.`
  );
}

/** Public CDN / media host for uploads — matches backend app.media.public-base-url */
export function resolvePublicMediaBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_MEDIA_BASE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  // Local Admin web → seller-service serves shared product files
  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      useLocalApiFallbacks())
  ) {
    const host = window.location.hostname || "localhost";
    return `http://${host}:8083`;
  }
  if (useLocalApiFallbacks()) {
    const lan = getExpoDevLanHost();
    return `http://${lan || "localhost"}:8083`;
  }
  return "https://flintnthread.in";
}

export const ADMIN_TOKEN_STORAGE_KEY = "admin_auth_token";

export function getApiDebugInfo(): {
  baseUrl: string;
  candidates: string[];
  platform: string;
  isEmulator: boolean;
  devHost: string | null;
  webHost: string | null;
  webPort: string | null;
  portConflict: string | null;
  webDevUrl: string;
  productionUrl: string;
  localFallbacks: boolean;
} {
  return {
    baseUrl: resolveAdminApiBaseUrl(),
    candidates: getAdminApiBaseUrlCandidates(),
    platform: Platform.OS,
    isEmulator: Platform.OS === "android" && isAndroidEmulator(),
    devHost: getExpoDevLanHost(),
    webHost: Platform.OS === "web" && typeof window !== "undefined" ? window.location.hostname : null,
    webPort: Platform.OS === "web" && typeof window !== "undefined" ? (window.location.port || "80") : null,
    portConflict: getWebDevPortConflict(),
    webDevUrl: getAdminWebDevUrl(),
    productionUrl: getProductionApiUrl(),
    localFallbacks: useLocalApiFallbacks(),
  };
}
