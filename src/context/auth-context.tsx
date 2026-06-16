import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { getApiErrorMessage, onAdminSessionCleared } from "@/lib/api/client";
import {
  clearAdminSession,
  hydrateAdminSession,
  saveAdminSession,
  type AdminSessionUser,
} from "@/lib/api/session";
import { fetchCurrentAdmin, loginAdmin, toSessionUser } from "@/services/authApi";

type AuthState = {
  token: string | null | false;
  user: AdminSessionUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  isLoading: true,
  signIn: async () => {},
  signOut: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null | false>(null);
  const [user, setUser] = useState<AdminSessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    return onAdminSessionCleared(() => {
      setToken(false);
      setUser(null);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const { token: storedToken } = await hydrateAdminSession();
      if (!storedToken) {
        if (!cancelled) {
          setToken(false);
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const me = await fetchCurrentAdmin();
        if (!cancelled) {
          const sessionUser = toSessionUser(me);
          saveAdminSession(storedToken, sessionUser);
          setToken(storedToken);
          setUser(sessionUser);
        }
      } catch {
        clearAdminSession();
        if (!cancelled) {
          setToken(false);
          setUser(null);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const response = await loginAdmin(email.trim(), password);
    const sessionUser = toSessionUser(response);
    saveAdminSession(response.accessToken, sessionUser);
    setToken(response.accessToken);
    setUser(sessionUser);
  }, []);

  const signOut = useCallback(() => {
    clearAdminSession();
    setToken(false);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

/** Plain helper (not a React hook) — safe to call with error state each render. */
export function getAuthErrorMessage(error: unknown): string {
  return getApiErrorMessage(error, "Login failed. Check your credentials.");
}

/** @deprecated Use getAuthErrorMessage */
export const useAuthErrorMessage = getAuthErrorMessage;
