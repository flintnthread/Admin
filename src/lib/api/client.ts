import { Platform } from "react-native";
import {
  clearWorkingAdminApiBaseUrl,
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

function isNetworkAdminApiError(error: unknown): boolean {
  return error instanceof AdminApiError && error.message.includes("Cannot reach admin API");
}

async function resolveReachableAdminApiBaseUrl(auth: boolean): Promise<string> {
  if (auth) {
    try {
      await ensureAdminApiReachable();
    } catch {
      // Fall back to first candidate; fetch may still succeed.
    }
  }
  return resolveAdminApiBaseUrl();
}

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
      `Cannot reach admin API. Tried: ${tried}.\n• Ensure https://flintnthread.online/api/admin/health or https://flintnthread.in/api/admin/health returns ok on VPS.`
      );
    }
  }

  const baseUrl = await resolveReachableAdminApiBaseUrl(auth);
  const url = `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

  const extra = (init?.headers ?? {}) as Record<string, string>;
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...extra,
  };

  const hasBody = init?.body != null;
  const isFormData =
    typeof FormData !== "undefined" && init?.body instanceof FormData;
  // Always pin JSON for string/object bodies so Spring never returns HTTP 415 (text/plain).
  if (hasBody && !isFormData) {
    headers["Content-Type"] = "application/json";
  }
  if (isFormData) {
    delete headers["Content-Type"];
  }
  if (auth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return { url, headers };
}

/** Authenticated fetch returning the raw Response (CSV, PDF, etc.). */
export async function adminApiFetch(path: string, init?: RequestOptions): Promise<Response> {
  try {
    const { url, headers } = await buildAdminRequest(path, init);
    const res = await fetch(url, { ...init, headers });
    if (res.status === 401 && init?.auth !== false) {
      clearAdminSession();
      notifySessionCleared();
    }
    return res;
  } catch (error) {
    if (error instanceof AdminApiError && !isNetworkAdminApiError(error)) {
      throw error;
    }
    clearWorkingAdminApiBaseUrl();
    try {
      const { url, headers } = await buildAdminRequest(path, init);
      const res = await fetch(url, { ...init, headers });
      if (res.status === 401 && init?.auth !== false) {
        clearAdminSession();
        notifySessionCleared();
      }
      return res;
    } catch (retryError) {
      if (retryError instanceof AdminApiError) {
        throw retryError;
      }
      const debug = resolveAdminApiBaseUrl();
      const tried = getAdminApiBaseUrlCandidates().join(", ");
      throw new AdminApiError(
        `Cannot reach admin API at ${debug}. Also tried: ${tried}.\n• Check network and https://flintnthread.online/api/admin/health (or https://flintnthread.in)`
      );
    }
  }
}

async function adminApiRequestOnce<T>(path: string, init?: RequestOptions): Promise<T> {
  const { url, headers } = await buildAdminRequest(path, init);

  let res: Response;
  try {
    res = await fetch(url, { ...init, headers });
  } catch {
    clearWorkingAdminApiBaseUrl();
    const debug = resolveAdminApiBaseUrl();
    const tried = getAdminApiBaseUrlCandidates().join(", ");
    throw new AdminApiError(
      `Cannot reach admin API at ${debug}. Also tried: ${tried}.\n• Check network and https://flintnthread.online/api/admin/health (or https://flintnthread.in)`
    );
  }

  if (res.status === 401 && init?.auth !== false) {
    clearAdminSession();
    notifySessionCleared();
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    if (res.status === 413) {
      message =
        "Image is too large for the server (413). Use a smaller image or wait for the server upload limit to be increased.";
    } else {
      try {
        const body = await res.json();
        if (body?.message) message = body.message;
      } catch {
        // ignore
      }
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
      `Admin API returned HTML instead of JSON at ${url}. Expected JSON from https://flintnthread.online/api/admin/... or https://flintnthread.in/api/admin/...`,
      res.status
    );
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new AdminApiError(
      `Invalid JSON from admin API at ${url}. Check https://flintnthread.online/api/admin/health or https://flintnthread.in/api/admin/health`,
      res.status
    );
  }
}

export async function adminApiRequest<T>(path: string, init?: RequestOptions): Promise<T> {
  try {
    return await adminApiRequestOnce<T>(path, init);
  } catch (error) {
    if (!isNetworkAdminApiError(error)) {
      throw error;
    }
    clearWorkingAdminApiBaseUrl();
    try {
      await ensureAdminApiReachable();
      return await adminApiRequestOnce<T>(path, init);
    } catch {
      throw error;
    }
  }
}
