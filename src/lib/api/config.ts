import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

const ADMIN_API_PORT = 8082;

type ExpoExtra = {
  adminApiBaseUrl?: string;
  androidEmulatorApi?: boolean;
};

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
  const host = uri.split(":")[0]?.trim();
  if (!host || host === "localhost" || host === "127.0.0.1") return null;
  return host;
}

/** LAN hostname when Expo dev server runs on PC IP (Expo Go / dev client). */
function getExpoDevLanHost(): string | null {
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

function buildUrl(host: string): string {
  return `http://${host}:${ADMIN_API_PORT}`;
}

/**
 * Admin API base URL (no trailing slash).
 * - Web on PC: localhost:8082 (or EXPO_PUBLIC_ADMIN_API_WEB_BASE_URL)
 * - Web on phone browser (LAN): same hostname as the page, port 8082
 * - Native Expo Go: auto-detect PC IP from Metro hostUri
 * - Android emulator: 10.0.2.2:8082
 * - iOS simulator: localhost:8082
 * - Physical device: EXPO_PUBLIC_ADMIN_API_BASE_URL or Expo hostUri
 */
export function resolveAdminApiBaseUrl(): string {
  const fromExtra = getExtra().adminApiBaseUrl?.trim().replace(/\/$/, "");
  const fromEnv = process.env.EXPO_PUBLIC_ADMIN_API_BASE_URL?.trim().replace(/\/$/, "");
  const configured = fromExtra || fromEnv;

  if (Platform.OS === "web") {
    const webLan = getWebLanHost();
    if (webLan) return buildUrl(webLan);

    const webOverride = process.env.EXPO_PUBLIC_ADMIN_API_WEB_BASE_URL?.trim().replace(/\/$/, "");
    if (webOverride) return webOverride;

    return buildUrl("localhost");
  }

  if (configured) return configured;

  if (Platform.OS === "android" && isAndroidEmulator()) {
    return buildUrl("10.0.2.2");
  }

  if (isIosSimulator()) {
    return buildUrl("localhost");
  }

  const devHost = getExpoDevLanHost();
  if (devHost) return buildUrl(devHost);

  if (Platform.OS === "android") {
    return buildUrl("10.0.2.2");
  }

  return buildUrl("localhost");
}

/** Public CDN for all uploads — matches admin-backend app.media.public-base-url */
export function resolvePublicMediaBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_MEDIA_BASE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  return "https://flintnthread.in";
}

export const ADMIN_TOKEN_STORAGE_KEY = "admin_auth_token";

export function getApiDebugInfo(): {
  baseUrl: string;
  platform: string;
  isEmulator: boolean;
  devHost: string | null;
} {
  return {
    baseUrl: resolveAdminApiBaseUrl(),
    platform: Platform.OS,
    isEmulator: Platform.OS === "android" && isAndroidEmulator(),
    devHost: getExpoDevLanHost(),
  };
}
