import { View, Alert, Switch } from "react-native";
import { Text, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { useTheme } from "@/context/themecontext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const { theme: T, isDark, toggleTheme } = useTheme();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email ?? "");
        const { data } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", user.id)
          .single();
        setUsername(data?.username ?? "");
      }
    }
    loadUser();
  }, []);

  async function handleLogout() {
    Alert.alert("Logout", "Yakin ingin keluar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg, padding: 16 }}>
      <Text
        style={{
          color: T.text,
          fontSize: 24,
          fontWeight: "bold",
          textAlign: "center",
          paddingTop: 16,
          paddingBottom: 20,
        }}
      >
        Settings
      </Text>

      {/* Profile Card */}
      <View
        style={{
          backgroundColor: T.card,
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
          alignItems: "center",
        }}
      >
        <View
          style={{
            width: 68,
            height: 68,
            borderRadius: 34,
            backgroundColor: T.accent,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#0d1117", fontSize: 30, fontWeight: "bold" }}>
            {username ? username[0].toUpperCase() : "T"}
          </Text>
        </View>
        <Text style={{ color: T.text, fontSize: 20, fontWeight: "bold" }}>
          {username || "Trader"}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            marginTop: 4,
          }}
        >
          <MaterialCommunityIcons
            name="email-outline"
            size={13}
            color={T.subtext}
          />
          <Text style={{ color: T.subtext, fontSize: 13 }}>{email}</Text>
        </View>
      </View>

      {/* Appearance */}
      <View
        style={{
          backgroundColor: T.card,
          borderRadius: 16,
          padding: 20,
          marginBottom: 16,
        }}
      >
        <Text
          style={{
            color: T.text,
            fontSize: 16,
            fontWeight: "bold",
            marginBottom: 16,
          }}
        >
          Appearance
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <MaterialCommunityIcons
              name={isDark ? "weather-night" : "weather-sunny"}
              size={22}
              color={T.accent}
            />
            <View>
              <Text style={{ color: T.text, fontSize: 15, fontWeight: "600" }}>
                {isDark ? "Dark Mode" : "Light Mode"}
              </Text>
              <Text style={{ color: T.subtext, fontSize: 12 }}>
                {isDark ? "Tampilan gelap aktif" : "Tampilan terang aktif"}
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: T.border, true: T.accent + "88" }}
            thumbColor={isDark ? T.accent : T.subtext}
          />
        </View>
      </View>

      {/* Info App */}
      <View
        style={{
          backgroundColor: T.card,
          borderRadius: 16,
          padding: 20,
          marginBottom: 24,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <MaterialCommunityIcons
            name="chart-line-variant"
            size={20}
            color={T.accent}
          />
          <Text style={{ color: T.accent, fontSize: 16, fontWeight: "bold" }}>
            TradeLog
          </Text>
        </View>
        <Text style={{ color: T.subtext, fontSize: 13, lineHeight: 20 }}>
          Aplikasi pencatatan trade harian untuk membantu kamu melacak performa
          dan meningkatkan strategi trading.
        </Text>
      </View>

      {/* Logout */}
      <Button
        mode="outlined"
        onPress={handleLogout}
        style={{
          borderColor: T.negative,
          borderRadius: 10,
          paddingVertical: 4,
        }}
        textColor={T.negative}
        icon="logout"
      >
        Logout
      </Button>
    </SafeAreaView>
  );
}
