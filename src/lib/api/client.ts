import { Platform } from "react-native";
import {
  ensureAdminApiReachable,
  getAdminApiBaseUrlCandidates,
  resolveAdminApiBaseUrl,
} from "./config";
import { clearAdminSession, getAdminToken } from "./session";

type SessionListener = () => void;
const sessionClearListeners = new Set<SessionListener>();

/** AuthProvider registers this so 401 responses sign the user out in UI. */
export function onAdminSessionCleared(listener: SessionListener): () => void {
  sessionClearListeners.add(listener);
  return () => sessionClearListeners.delete(listener);
}

function notifySessionCleared() {
  sessionClearListeners.forEach((listener) => listener());
}

export class AdminApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "AdminApiError";
  }
}

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof AdminApiError) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

type RequestOptions = RequestInit & {
  /** When false, no Authorization header (login / health). Default true. */
  auth?: boolean;
};

export async function adminApiRequest<T>(path: string, init?: RequestOptions): Promise<T> {
  const auth = init?.auth !== false;
  const token = getAdminToken();

  if (auth && !token) {
    throw new AdminApiError("Not signed in. Please log in again.", 401);
  }

  // Login and other unauthenticated calls probe candidates so mobile/web find the right host.
  if (!auth) {
    try {
      await ensureAdminApiReachable();
    } catch {
      const tried = getAdminApiBaseUrlCandidates().join(", ");
      const hint =
        Platform.OS === "web"
          ? "\n• Start admin-backend: mvn -f seller-backend/admin-backend/pom.xml spring-boot:run"
          : "\n• Set EXPO_PUBLIC_ADMIN_API_BASE_URL=http://YOUR_PC_IP:8082 in Admin/.env";
      throw new AdminApiError(
        `Cannot reach admin API. Tried: ${tried}.${hint}\n• Ensure admin-backend is running on port 8082 (server.address=0.0.0.0)`
      );
    }
  }

  const baseUrl = resolveAdminApiBaseUrl();
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };

  const hasBody = init?.body != null;
  if (hasBody && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch {
    const debug = resolveAdminApiBaseUrl();
    const tried = getAdminApiBaseUrlCandidates().join(", ");
    const hint =
      Platform.OS === "web"
        ? "\n• Start admin-backend: mvn -f seller-backend/admin-backend/pom.xml spring-boot:run"
        : "\n• Set EXPO_PUBLIC_ADMIN_API_BASE_URL=http://YOUR_PC_IP:8082 in Admin/.env";
    throw new AdminApiError(
      `Cannot reach admin API at ${debug}. Also tried: ${tried}.${hint}\n• Ensure admin-backend is running on port 8082 (server.address=0.0.0.0)`
    );
  }

  if (res.status === 401 && auth) {
    clearAdminSession();
    notifySessionCleared();
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) message = body.message;
    } catch {
      // ignore
    }
    throw new AdminApiError(message, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  const raw = await res.text();
  if (!contentType.includes("application/json") && raw.trimStart().startsWith("<")) {
    throw new AdminApiError(
      `Admin API returned HTML instead of JSON at ${url}. Start admin-backend on port 8082 and open the Admin app on a different port (not 8082).`,
      res.status
    );
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new AdminApiError(
      `Invalid JSON from admin API at ${url}. Ensure admin-backend is running on port 8082.`,
      res.status
    );
  }
}
