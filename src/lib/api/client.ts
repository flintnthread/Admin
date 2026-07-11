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

async function buildAdminRequest(path: string, init?: RequestOptions): Promise<{ url: string; headers: Record<string, string> }> {
  const auth = init?.auth !== false;
  const token = getAdminToken();

  if (auth && !token) {
    throw new AdminApiError("Not signed in. Please log in again.", 401);
  }

  if (!auth) {
    try {
      await ensureAdminApiReachable();
    } catch {
      const tried = getAdminApiBaseUrlCandidates().join(", ");
      throw new AdminApiError(
        `Cannot reach admin API. Tried: ${tried}.\n• Ensure https://flintnthread.online/api/admin/health returns ok on VPS.`
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
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (hasBody && !isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }
  if (isFormData && headers["Content-Type"]) {
    delete headers["Content-Type"];
  }
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return { url, headers };
}

/** Authenticated fetch returning the raw Response (CSV, PDF, etc.). */
export async function adminApiFetch(path: string, init?: RequestOptions): Promise<Response> {
  const { url, headers } = await buildAdminRequest(path, init);
  try {
    const res = await fetch(url, { ...init, headers });
    if (res.status === 401 && init?.auth !== false) {
      clearAdminSession();
      notifySessionCleared();
    }
    return res;
  } catch {
    const debug = resolveAdminApiBaseUrl();
    const tried = getAdminApiBaseUrlCandidates().join(", ");
    throw new AdminApiError(
      `Cannot reach admin API at ${debug}. Also tried: ${tried}.\n• Check network and https://flintnthread.online/api/admin/health`
    );
  }
}

export async function adminApiRequest<T>(path: string, init?: RequestOptions): Promise<T> {
  const auth = init?.auth !== false;
  const { url, headers } = await buildAdminRequest(path, init);

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch {
    const debug = resolveAdminApiBaseUrl();
    const tried = getAdminApiBaseUrlCandidates().join(", ");
    throw new AdminApiError(
      `Cannot reach admin API at ${debug}. Also tried: ${tried}.\n• Check network and https://flintnthread.online/api/admin/health`
    );
  }

  if (res.status === 401 && init?.auth !== false) {
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
  if (!raw.trim()) {
    return undefined as T;
  }
  if (!contentType.includes("application/json") && raw.trimStart().startsWith("<")) {
    throw new AdminApiError(
      `Admin API returned HTML instead of JSON at ${url}. Expected JSON from https://flintnthread.online/api/admin/...`,
      res.status
    );
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new AdminApiError(
      `Invalid JSON from admin API at ${url}. Check https://flintnthread.online/api/admin/health`,
      res.status
    );
  }
}
