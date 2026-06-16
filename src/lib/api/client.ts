import { Platform } from "react-native";
import { resolveAdminApiBaseUrl } from "./config";
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
    const hint =
      Platform.OS === "web"
        ? "\n• On a phone browser, open the app using your PC LAN IP (not localhost)"
        : "\n• Use Expo Go (auto-detects PC IP) or set EXPO_PUBLIC_ADMIN_API_BASE_URL in Admin/.env to http://YOUR_PC_IP:8082";
    throw new AdminApiError(
      `Cannot reach admin API at ${debug}.${hint}\n• Ensure admin-backend is running on port 8082 (server.address=0.0.0.0)`
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

  return res.json() as Promise<T>;
}
