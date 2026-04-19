import { useState } from "react";
import { Alert, View, TouchableOpacity } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useTheme } from "@/context/themecontext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleLogin() {
    if (!email || !password)
      return Alert.alert("Error", "Email dan password harus diisi");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (error) Alert.alert("Login Gagal", error.message);
    else router.replace("/(tabs)/calendar");
  }

  const inputTheme = {
    colors: { primary: theme.accent, background: theme.inputBg },
  };

  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: theme.bg,
        justifyContent: "center",
        paddingHorizontal: 28,
      }}
    >
      <View style={{ alignItems: "center", marginBottom: 40 }}>
        <MaterialCommunityIcons
          name="chart-line-variant"
          size={56}
          color={theme.accent}
        />
        <Text
          style={{
            fontSize: 30,
            fontWeight: "bold",
            color: theme.text,
            letterSpacing: 1,
            marginTop: 10,
          }}
        >
          TradeLog
        </Text>
        <Text style={{ fontSize: 13, color: theme.subtext, marginTop: 4 }}>
          Track your trades. Master your edge.
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          keyboardType="email-address"
          autoCapitalize="none"
          style={{ backgroundColor: theme.inputBg }}
          theme={inputTheme}
          textColor={theme.text}
          outlineColor={theme.border}
          activeOutlineColor={theme.accent}
          left={<TextInput.Icon icon="email-outline" color={theme.subtext} />}
        />
        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry={!showPass}
          style={{ backgroundColor: theme.inputBg }}
          theme={inputTheme}
          textColor={theme.text}
          outlineColor={theme.border}
          activeOutlineColor={theme.accent}
          left={<TextInput.Icon icon="lock-outline" color={theme.subtext} />}
          right={
            <TextInput.Icon
              icon={showPass ? "eye-off-outline" : "eye-outline"}
              color={theme.subtext}
              onPress={() => setShowPass(!showPass)}
            />
          }
        />
        <Button
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          disabled={loading}
          style={{ marginTop: 8, borderRadius: 10, paddingVertical: 4 }}
          labelStyle={{ fontSize: 16, fontWeight: "bold", color: "#0d1117" }}
          buttonColor={theme.accent}
        >
          Login
        </Button>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: 16,
          }}
        >
          <Text style={{ color: theme.subtext }}>Belum punya akun? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/register")}>
            <Text style={{ color: theme.accent, fontWeight: "bold" }}>
              Daftar sekarang
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
