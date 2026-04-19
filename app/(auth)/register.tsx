import { useState } from "react";
import { Alert, View, TouchableOpacity } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { router } from "expo-router";
import { useTheme } from "@/context/themecontext";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Register() {
  const { theme } = useTheme();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    if (!username || !email || !password)
      return Alert.alert("Error", "Semua field harus diisi");
    if (password.length < 6)
      return Alert.alert("Error", "Password minimal 6 karakter");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setLoading(false);
      return Alert.alert("Gagal Daftar", error.message);
    }
    if (data.user)
      await supabase
        .from("profiles")
        .insert({ id: data.user.id, username: username.trim() });
    setLoading(false);
    Alert.alert("Berhasil!", "Akun dibuat. Silakan login.", [
      { text: "OK", onPress: () => router.replace("/(auth)/login") },
    ]);
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
          name="account-plus-outline"
          size={56}
          color={theme.accent}
        />
        <Text
          style={{
            fontSize: 30,
            fontWeight: "bold",
            color: theme.text,
            marginTop: 10,
          }}
        >
          Buat Akun
        </Text>
        <Text style={{ fontSize: 13, color: theme.subtext, marginTop: 4 }}>
          Mulai catat trade kamu hari ini
        </Text>
      </View>
      <View style={{ gap: 12 }}>
        <TextInput
          label="Username"
          value={username}
          onChangeText={setUsername}
          mode="outlined"
          autoCapitalize="none"
          style={{ backgroundColor: theme.inputBg }}
          theme={inputTheme}
          textColor={theme.text}
          outlineColor={theme.border}
          activeOutlineColor={theme.accent}
          left={<TextInput.Icon icon="account-outline" color={theme.subtext} />}
        />
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
          label="Password (min. 6 karakter)"
          value={password}
          onChangeText={setPassword}
          mode="outlined"
          secureTextEntry
          style={{ backgroundColor: theme.inputBg }}
          theme={inputTheme}
          textColor={theme.text}
          outlineColor={theme.border}
          activeOutlineColor={theme.accent}
          left={<TextInput.Icon icon="lock-outline" color={theme.subtext} />}
        />
        <Button
          mode="contained"
          onPress={handleRegister}
          loading={loading}
          disabled={loading}
          style={{ marginTop: 8, borderRadius: 10, paddingVertical: 4 }}
          labelStyle={{ fontSize: 16, fontWeight: "bold", color: "#0d1117" }}
          buttonColor={theme.accent}
        >
          Daftar
        </Button>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "center",
            marginTop: 16,
          }}
        >
          <Text style={{ color: theme.subtext }}>Sudah punya akun? </Text>
          <TouchableOpacity onPress={() => router.replace("/(auth)/login")}>
            <Text style={{ color: theme.accent, fontWeight: "bold" }}>
              Login
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
