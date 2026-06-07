/**
 * Minimal auth context for the admin app.
 *
 * Strategy:
 *  - sessionStorage is used on web so the session survives page refresh
 *    but is cleared when the browser tab is closed.
 *  - On native, we fall back to a React ref (in-memory, cleared on app restart).
 *
 * To plug in a real backend, replace the `signIn` mock with an API call and
 * store the JWT token returned by the server instead of the placeholder string.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Platform } from "react-native";

const SESSION_KEY = "admin_auth_token";

// ─── helpers ────────────────────────────────────────────────────────────────

function saveToken(token: string) {
  if (Platform.OS === "web") {
    try {
      sessionStorage.setItem(SESSION_KEY, token);
    } catch {}
  }
}

function loadToken(): string | null {
  if (Platform.OS === "web") {
    try {
      return sessionStorage.getItem(SESSION_KEY);
    } catch {}
  }
  return null;
}

function clearToken() {
  if (Platform.OS === "web") {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch {}
  }
}

// ─── context ────────────────────────────────────────────────────────────────

type AuthState = {
  /** null = not yet resolved, false = logged-out, string = token / user-id */
  token: string | null | false;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthState>({
  token: null,
  isLoading: true,
  signIn: async () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // null = resolving, false = no session, string = authenticated
  const [token, setToken] = useState<string | null | false>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const stored = loadToken();
    setToken(stored ?? false);
    setIsLoading(false);
  }, []);

  const signIn = useCallback(async (email: string, _password: string) => {
    // Replace this block with a real API call:
    // const res = await fetch('/api/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    // const { token } = await res.json();
    const mockToken = `mock-token-${email}-${Date.now()}`;
    saveToken(mockToken);
    setToken(mockToken);
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setToken(false);
  }, []);

  return (
    <AuthContext.Provider value={{ token, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
