import { useState, useCallback } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  Dimensions,
} from "react-native";
import { Text, TextInput, Button, SegmentedButtons } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { router, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useGoal } from "@/context/goalcontext";
import { useTheme } from "@/context/themecontext";
import { SafeAreaView } from "react-native-safe-area-context";

type Trade = {
  id: number;
  type: "profit" | "loss";
  amount: number;
  note: string | null;
  lesson: string | null;
  tanggal: string;
  jam: string;
  image_before: string | null;
  image_after: string | null;
};

const usd = (n: number) =>
  (n >= 0 ? "+" : "") +
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS = ["MON", "TUE", "WED", "THU", "FRI"];
const { width } = Dimensions.get("window");

export default function CalendarScreen() {
  const { theme } = useTheme();
  const { monthlyGoal, setMonthlyGoal } = useGoal();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [trades, setTrades] = useState<Trade[]>([]);

  const [showDialog, setShowDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [formType, setFormType] = useState<"profit" | "loss">("profit");
  const [formAmount, setFormAmount] = useState("");
  const [formNote, setFormNote] = useState("");
  const [formLesson, setFormLesson] = useState("");
  const [imageBefore, setImageBefore] = useState<string | null>(null);
  const [imageAfter, setImageAfter] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [goalInput, setGoalInput] = useState("");

  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailTrades, setDetailTrades] = useState<Trade[]>([]);
  const [detailDate, setDetailDate] = useState("");

  const inputTheme = {
    colors: { primary: theme.accent, background: theme.inputBg },
  };

  async function ambilData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: tradeData } = await supabase
      .from("trades")
      .select("*")
      .eq("user_id", user.id)
      .order("tanggal", { ascending: true });
    if (tradeData) setTrades(tradeData);

    const bulanStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    const { data: goalData } = await supabase
      .from("monthly_goals")
      .select("goal")
      .eq("user_id", user.id)
      .eq("bulan", bulanStr)
      .maybeSingle();
    setMonthlyGoal(goalData?.goal ?? null);
  }

  useFocusEffect(
    useCallback(() => {
      ambilData();
    }, [year, month]),
  );

  function getPnlPerDay(dateStr: string) {
    const dayTrades = trades.filter((t) => t.tanggal === dateStr);
    if (dayTrades.length === 0) return null;
    return dayTrades.reduce(
      (s, t) => s + (t.type === "profit" ? t.amount : -t.amount),
      0,
    );
  }

  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  const totalPnL = trades
    .filter((t) => t.tanggal.startsWith(monthStr))
    .reduce((s, t) => s + (t.type === "profit" ? t.amount : -t.amount), 0);

  const goalProgress =
    monthlyGoal && monthlyGoal > 0
      ? Math.min(Math.max((totalPnL / monthlyGoal) * 100, 0), 100)
      : 0;

  function buildCalendarDays() {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (number | null)[] = [];
    let offset = firstDay.getDay() - 1;
    if (offset < 0) offset = 6;
    for (let i = 0; i < offset && i < 5; i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const dow = new Date(year, month, d).getDay();
      if (dow !== 0 && dow !== 6) days.push(d);
    }
    return days;
  }

  const calDays = buildCalendarDays();
  const cellW = Math.floor((width - 32 - 24) / 5);

  function openAdd(dateStr: string) {
    setSelectedDate(dateStr);
    setFormType("profit");
    setFormAmount("");
    setFormNote("");
    setFormLesson("");
    setImageBefore(null);
    setImageAfter(null);
    setShowDialog(true);
  }

  function handleDayPress(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dayTrades = trades.filter((t) => t.tanggal === dateStr);
    if (dayTrades.length > 0) {
      setDetailTrades(dayTrades);
      setDetailDate(dateStr);
      setShowDetailDialog(true);
    } else {
      openAdd(dateStr);
    }
  }

  async function pickImage(setter: (uri: string) => void) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Izin diperlukan", "Izinkan akses galeri");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) setter(result.assets[0].uri);
  }

  // Konversi gambar ke base64 string — disimpan langsung ke database, tidak perlu Storage bucket
  async function imageToBase64(uri: string): Promise<string | null> {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result); // sudah dalam format data:image/...;base64,...
        };
        reader.onerror = () => reject(null);
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.log("base64 error:", e);
      return null;
    }
  }

  async function simpanTrade() {
    if (!formAmount || parseFloat(formAmount) <= 0)
      return Alert.alert("Error", "Masukkan jumlah yang valid");
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return;
    }

    let urlBefore: string | null = null;
    let urlAfter: string | null = null;

    if (imageBefore) urlBefore = await imageToBase64(imageBefore);
    if (imageAfter) urlAfter = await imageToBase64(imageAfter);

    const { error } = await supabase.from("trades").insert({
      user_id: user.id,
      type: formType,
      amount: parseFloat(formAmount),
      note: formNote || null,
      lesson: formLesson || null,
      tanggal: selectedDate,
      jam: new Date().toTimeString().slice(0, 8),
      image_before: urlBefore,
      image_after: urlAfter,
    });

    setSaving(false);
    if (error) return Alert.alert("Error", error.message);
    setShowDialog(false);
    ambilData();
  }

  async function hapusTrade(id: number) {
    Alert.alert("Hapus Trade", "Yakin ingin menghapus?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          await supabase.from("trades").delete().eq("id", id);
          setShowDetailDialog(false);
          ambilData();
        },
      },
    ]);
  }

  // FIX: Gunakan INSERT lalu UPDATE (bukan upsert) agar tidak perlu constraint
  async function simpanGoal() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const bulanStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    const goalVal = parseFloat(goalInput) || 0;

    // Cek apakah sudah ada data goal bulan ini
    const { data: existing } = await supabase
      .from("monthly_goals")
      .select("id")
      .eq("user_id", user.id)
      .eq("bulan", bulanStr)
      .maybeSingle();

    let error;
    if (existing?.id) {
      // Sudah ada → UPDATE
      ({ error } = await supabase
        .from("monthly_goals")
        .update({ goal: goalVal })
        .eq("id", existing.id));
    } else {
      // Belum ada → INSERT
      ({ error } = await supabase
        .from("monthly_goals")
        .insert({ user_id: user.id, bulan: bulanStr, goal: goalVal }));
    }

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setMonthlyGoal(goalVal);
    setShowGoalDialog(false);
    Alert.alert("Berhasil", "Monthly goal disimpan!");
  }

  const T = theme;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Nav bulan */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            paddingHorizontal: 20,
            paddingTop: 20,
            marginBottom: 16,
          }}
        >
          <TouchableOpacity
            onPress={() => {
              if (month === 0) {
                setMonth(11);
                setYear((y) => y - 1);
              } else setMonth((m) => m - 1);
            }}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color={T.text}
            />
          </TouchableOpacity>
          <Text style={{ color: T.text, fontSize: 20, fontWeight: "bold" }}>
            {MONTHS[month]} {year}
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (month === 11) {
                setMonth(0);
                setYear((y) => y + 1);
              } else setMonth((m) => m + 1);
            }}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={28}
              color={T.text}
            />
          </TouchableOpacity>
        </View>

        {/* Kartu PnL & Goal */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            gap: 12,
            marginBottom: 16,
          }}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: T.card,
              borderRadius: 14,
              padding: 16,
              justifyContent: "center",
            }}
          >
            <Text style={{ color: T.subtext, fontSize: 12, marginBottom: 6 }}>
              Total P&L
            </Text>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "bold",
                color: totalPnL >= 0 ? T.accent : T.negative,
              }}
            >
              {usd(totalPnL)}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: T.card,
              borderRadius: 14,
              padding: 16,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Text style={{ color: T.subtext, fontSize: 12 }}>
                Monthly goal
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setGoalInput(monthlyGoal?.toString() ?? "");
                  setShowGoalDialog(true);
                }}
              >
                <MaterialCommunityIcons
                  name="pencil-outline"
                  size={18}
                  color={T.accent}
                />
              </TouchableOpacity>
            </View>
            <View
              style={{
                height: 6,
                backgroundColor: T.border,
                borderRadius: 3,
                marginVertical: 8,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 6,
                  backgroundColor: T.accent,
                  borderRadius: 3,
                  width: `${goalProgress}%` as any,
                }}
              />
            </View>
            <View
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <Text style={{ color: T.accent, fontSize: 11 }}>
                {monthlyGoal ? usd(totalPnL) : "$0.00"}
              </Text>
              <Text style={{ color: T.accent, fontSize: 11 }}>
                {monthlyGoal ? usd(monthlyGoal) : "Not set yet"}
              </Text>
            </View>
          </View>
        </View>

        {/* Header hari */}
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: 16,
            marginBottom: 6,
          }}
        >
          {DAYS.map((d) => (
            <Text
              key={d}
              style={{
                flex: 1,
                textAlign: "center",
                color: T.subtext,
                fontSize: 11,
                fontWeight: "bold",
              }}
            >
              {d}
            </Text>
          ))}
        </View>

        {/* Grid kalender */}
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            paddingHorizontal: 16,
            gap: 6,
          }}
        >
          {calDays.map((day, i) => {
            if (!day)
              return (
                <View
                  key={`e-${i}`}
                  style={{ width: cellW, height: cellW * 1.1 }}
                />
              );
            const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const pnl = getPnlPerDay(dateStr);
            const isToday =
              day === today.getDate() &&
              month === today.getMonth() &&
              year === today.getFullYear();
            return (
              <TouchableOpacity
                key={day}
                onPress={() => handleDayPress(day)}
                style={{
                  width: cellW,
                  height: cellW * 1.1,
                  backgroundColor:
                    pnl !== null && pnl > 0
                      ? T.accent
                      : pnl !== null && pnl < 0
                        ? T.negative
                        : T.card,
                  borderRadius: 10,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: isToday && pnl === null ? 1.5 : 0,
                  borderColor: T.accent,
                }}
              >
                <Text
                  style={{
                    color: pnl !== null ? "#fff" : T.subtext,
                    fontSize: 13,
                    fontWeight: "600",
                  }}
                >
                  {day}
                </Text>
                {pnl !== null ? (
                  <Text
                    style={{
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: "bold",
                      marginTop: 2,
                    }}
                  >
                    {pnl >= 0 ? "+" : ""}
                    {pnl.toFixed(2)}
                  </Text>
                ) : (
                  <Text style={{ color: T.border, fontSize: 14, marginTop: 2 }}>
                    —
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* MODAL TAMBAH TRADE */}
      <Modal visible={showDialog} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.75)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: T.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
            }}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 580 }}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 16,
                }}
              >
                <Text
                  style={{ color: T.text, fontSize: 20, fontWeight: "bold" }}
                >
                  New Trade
                </Text>
                <TouchableOpacity onPress={() => setShowDialog(false)}>
                  <MaterialCommunityIcons
                    name="close"
                    size={24}
                    color={T.subtext}
                  />
                </TouchableOpacity>
              </View>
              <SegmentedButtons
                value={formType}
                onValueChange={(v) => setFormType(v as "profit" | "loss")}
                buttons={[
                  {
                    value: "profit",
                    label: "Profit",
                    style:
                      formType === "profit"
                        ? { backgroundColor: T.dark ? "#1a3d2e" : "#d0f5eb" }
                        : {},
                  },
                  {
                    value: "loss",
                    label: "Loss",
                    style:
                      formType === "loss"
                        ? { backgroundColor: T.dark ? "#3d1a1a" : "#fde8ec" }
                        : {},
                  },
                ]}
                style={{ marginBottom: 12 }}
              />
              <Text
                style={{ color: T.subtext, fontSize: 13, marginBottom: 12 }}
              >
                {selectedDate}
              </Text>
              <TextInput
                label="P&L (USD)"
                value={formAmount}
                onChangeText={setFormAmount}
                keyboardType="decimal-pad"
                mode="outlined"
                style={{ backgroundColor: T.inputBg, marginBottom: 10 }}
                theme={inputTheme}
                textColor={T.text}
                outlineColor={T.border}
                activeOutlineColor={T.accent}
                left={<TextInput.Icon icon="currency-usd" color={T.subtext} />}
              />
              <TextInput
                label="Note (opsional)"
                value={formNote}
                onChangeText={setFormNote}
                mode="outlined"
                style={{ backgroundColor: T.inputBg, marginBottom: 10 }}
                theme={inputTheme}
                textColor={T.text}
                outlineColor={T.border}
                activeOutlineColor={T.accent}
                left={
                  <TextInput.Icon icon="note-text-outline" color={T.subtext} />
                }
              />
              <TextInput
                label="Lesson (opsional)"
                value={formLesson}
                onChangeText={setFormLesson}
                mode="outlined"
                style={{ backgroundColor: T.inputBg, marginBottom: 16 }}
                theme={inputTheme}
                textColor={T.text}
                outlineColor={T.border}
                activeOutlineColor={T.accent}
                left={
                  <TextInput.Icon icon="lightbulb-outline" color={T.subtext} />
                }
              />

              <Text
                style={{
                  color: T.subtext,
                  fontSize: 13,
                  fontWeight: "600",
                  marginBottom: 10,
                }}
              >
                Screenshot Setup
              </Text>
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 20 }}>
                {[
                  {
                    label: "BEFORE",
                    state: imageBefore,
                    setter: setImageBefore,
                  },
                  { label: "AFTER", state: imageAfter, setter: setImageAfter },
                ].map(({ label, state, setter }) => (
                  <TouchableOpacity
                    key={label}
                    onPress={() => pickImage(setter)}
                    style={{
                      flex: 1,
                      height: 110,
                      backgroundColor: T.bg,
                      borderRadius: 12,
                      borderWidth: 1.5,
                      borderColor: state ? T.accent : T.border,
                      borderStyle: "dashed",
                      alignItems: "center",
                      justifyContent: "center",
                      overflow: "hidden",
                    }}
                  >
                    {state ? (
                      <Image
                        source={{ uri: state }}
                        style={{ width: "100%", height: "100%" }}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={{ alignItems: "center" }}>
                        <MaterialCommunityIcons
                          name="camera-plus-outline"
                          size={28}
                          color={T.subtext}
                        />
                        <Text
                          style={{
                            color: T.subtext,
                            fontSize: 12,
                            marginTop: 6,
                            fontWeight: "600",
                          }}
                        >
                          {label}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <Button
                mode="contained"
                onPress={simpanTrade}
                loading={saving}
                buttonColor={T.accent}
                labelStyle={{
                  color: "#0d1117",
                  fontWeight: "bold",
                  fontSize: 15,
                }}
                style={{ borderRadius: 12, paddingVertical: 2 }}
              >
                Simpan Trade
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL DETAIL */}
      <Modal visible={showDetailDialog} transparent animationType="slide">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.75)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: T.card,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              paddingBottom: 40,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text style={{ color: T.text, fontSize: 18, fontWeight: "bold" }}>
                {detailDate}
              </Text>
              <TouchableOpacity onPress={() => setShowDetailDialog(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color={T.subtext}
                />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 420 }}>
              {detailTrades.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => {
                    setShowDetailDialog(false);
                    router.push({
                      pathname: "/(tabs)/trade-detail",
                      params: { id: t.id.toString() },
                    } as any);
                  }}
                  style={{
                    backgroundColor: T.bg,
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 10,
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: "bold",
                          color: t.type === "profit" ? T.accent : T.negative,
                        }}
                      >
                        {t.type === "profit" ? "+" : "-"}${t.amount.toFixed(2)}
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
                          name="clock-outline"
                          size={12}
                          color={T.subtext}
                        />
                        <Text style={{ color: T.subtext, fontSize: 12 }}>
                          {t.jam?.slice(0, 5)}
                        </Text>
                      </View>
                      {t.note && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            marginTop: 4,
                          }}
                        >
                          <MaterialCommunityIcons
                            name="note-text-outline"
                            size={12}
                            color={T.subtext}
                          />
                          <Text style={{ color: T.subtext, fontSize: 12 }}>
                            {t.note}
                          </Text>
                        </View>
                      )}
                      {t.lesson && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            marginTop: 4,
                          }}
                        >
                          <MaterialCommunityIcons
                            name="lightbulb-outline"
                            size={12}
                            color={T.accent}
                          />
                          <Text style={{ color: T.accent, fontSize: 12 }}>
                            {t.lesson}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      {(t.image_before || t.image_after) && (
                        <MaterialCommunityIcons
                          name="image-outline"
                          size={16}
                          color={T.subtext}
                        />
                      )}
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={20}
                        color={T.subtext}
                      />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Button
              mode="outlined"
              onPress={() => {
                setShowDetailDialog(false);
                openAdd(detailDate);
              }}
              textColor={T.accent}
              style={{ marginTop: 12, borderColor: T.accent, borderRadius: 10 }}
            >
              + Tambah Trade Lagi
            </Button>
          </View>
        </View>
      </Modal>

      {/* MODAL GOAL */}
      <Modal visible={showGoalDialog} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.75)",
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <View
            style={{ backgroundColor: T.card, borderRadius: 20, padding: 24 }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 4,
              }}
            >
              <MaterialCommunityIcons
                name="target"
                size={22}
                color={T.accent}
              />
              <Text style={{ color: T.text, fontSize: 18, fontWeight: "bold" }}>
                Set Monthly Goal
              </Text>
            </View>
            <Text style={{ color: T.subtext, fontSize: 12, marginBottom: 16 }}>
              {MONTHS[month]} {year}
            </Text>
            <TextInput
              label="Target Profit (USD)"
              value={goalInput}
              onChangeText={setGoalInput}
              keyboardType="decimal-pad"
              mode="outlined"
              style={{ backgroundColor: T.inputBg, marginBottom: 16 }}
              theme={inputTheme}
              textColor={T.text}
              outlineColor={T.border}
              activeOutlineColor={T.accent}
              left={<TextInput.Icon icon="currency-usd" color={T.subtext} />}
            />
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button
                mode="outlined"
                onPress={() => setShowGoalDialog(false)}
                textColor={T.subtext}
                style={{ flex: 1, borderColor: T.border }}
              >
                Batal
              </Button>
              <Button
                mode="contained"
                onPress={simpanGoal}
                buttonColor={T.accent}
                labelStyle={{ color: "#0d1117" }}
                style={{ flex: 1 }}
              >
                Simpan
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
