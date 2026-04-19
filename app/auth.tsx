import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Alert, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Button,
  Card,
  SegmentedButtons,
  Text,
  TextInput,
} from "react-native-paper";

export default function Auth() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("register");

  async function handleSubmit() {
    if (email === null || password === null) {
      Alert.alert("Error", "Email dan password tidak boleh kosong");
      return;
    }

    if (mode === "register") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) {
        Alert.alert("Error", error.message);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        Alert.alert("Error", error.message);
      }
    }
    router.replace("/budget");
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <Card>
        <Card.Content>
          <Text variant="headlineSmall">Authentication</Text>
          <Text variant="bodyMedium">
            Masuk auth buat akun baru untuk lanjut
          </Text>
          <SegmentedButtons
            value={"register"}
            onValueChange={(v) => {
              setMode(v);
            }}
            buttons={[
              {
                label: "Login",
                value: "login",
              },
              {
                label: "Register",
                value: "register",
              },
            ]}
            style={{ marginBottom: 16 }}
          />

          <TextInput
            label="Email"
            placeholder="Masukkan email"
            keyboardType="email-address"
            autoCapitalize="none"
            style={{ marginBottom: 16 }}
            onChangeText={(text) => setEmail(text)}
            value={email}
          />

          <TextInput
            label="Password"
            placeholder="Masukkan password"
            secureTextEntry
            style={{ marginBottom: 16 }}
            onChangeText={(text) => setPassword(text)}
            value={password}
          />
          <Button
            mode="contained"
            onPress={() => {
              handleSubmit();
            }}
          >
            Submit
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}
