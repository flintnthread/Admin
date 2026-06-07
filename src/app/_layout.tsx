import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/context/auth-context";

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
      router.replace("/approveseller");
    }
  }, [token, isLoading, segments, router]);

  // While resolving, render nothing (avoids flash)
  if (isLoading) return null;

  return <Stack screenOptions={{ headerShown: false }} />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <ProtectedNavigator />
    </AuthProvider>
  );
}
