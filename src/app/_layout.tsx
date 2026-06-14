// @ts-nocheck
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, Component } from "react";
import { View, Text, ScrollView } from "react-native";
import { AuthProvider, useAuth } from "@/context/auth-context";
import { ThemeProvider } from "@/context/theme-context";
import { patchComponents } from "@/lib/patch-components";

// Safely execute component patching and capture errors to prevent white screen
try {
  patchComponents();
} catch (e) {
  console.error("patchComponents error:", e);
  (globalThis as any).initError = e;
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught error:", error, errorInfo);
  }

  render() {
    const initError = (globalThis as any).initError;
    const error = this.state.error || initError;

    if (this.state.hasError || initError) {
      return (
        <ScrollView style={{ flex: 1, backgroundColor: "#fee2e2", padding: 20 }}>
          <Text style={{ fontSize: 20, color: "#991b1b", fontWeight: "bold", marginBottom: 10 }}>
            Runtime Application Error
          </Text>
          <Text style={{ fontSize: 14, color: "#7f1d1d", fontFamily: "monospace", marginBottom: 15 }}>
            {error?.toString()}
          </Text>
          <Text style={{ fontSize: 12, color: "#991b1b", fontFamily: "monospace" }}>
            {error?.stack}
          </Text>
        </ScrollView>
      );
    }

    return this.props.children;
  }
}

/**
 * Inner component that watches auth state and redirects accordingly.
 * Must be INSIDE <AuthProvider> so it can call useAuth().
 */
function ProtectedNavigator() {
  const { token, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // wait until session is resolved

    const inAuthGroup = segments[0] === "login";

    if (!token && !inAuthGroup) {
      // Not signed in → send to login
      router.replace("/login");
    } else if (token && inAuthGroup) {
      // Already signed in → send to dashboard
      router.replace("/Dashboard");
    }
  }, [token, isLoading, segments, router]);

  // While resolving, render nothing (avoids flash)
  if (isLoading) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <ProtectedNavigator />
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
