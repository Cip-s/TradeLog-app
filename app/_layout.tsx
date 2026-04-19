import { useEffect } from "react";
import { Stack, router } from "expo-router";
import { PaperProvider, MD3DarkTheme, MD3LightTheme } from "react-native-paper";
import { supabase } from "@/lib/supabase";
import { GoalProvider } from "@/context/goalcontext";
import { ThemeProvider, useTheme } from "@/context/themecontext";

function AppContent() {
  const { isDark } = useTheme();
  const paperTheme = isDark
    ? {
        ...MD3DarkTheme,
        colors: {
          ...MD3DarkTheme.colors,
          primary: "#00c896",
          background: "#0d1117",
          surface: "#1a1f2e",
        },
      }
    : {
        ...MD3LightTheme,
        colors: {
          ...MD3LightTheme.colors,
          primary: "#00a87a",
          background: "#f0f4f8",
          surface: "#ffffff",
        },
      };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      router.replace(session ? "/(tabs)/calendar" : "/(auth)/login");
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_e, session) => {
        router.replace(session ? "/(tabs)/calendar" : "/(auth)/login");
      },
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <PaperProvider theme={paperTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <GoalProvider>
        <AppContent />
      </GoalProvider>
    </ThemeProvider>
  );
}
