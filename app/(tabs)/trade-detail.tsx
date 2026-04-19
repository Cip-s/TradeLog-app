import { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions,
  Alert,
  Modal,
} from "react-native";
import { Text, Button } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useLocalSearchParams, router } from "expo-router";
import { supabase } from "@/lib/supabase";
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

const { width } = Dimensions.get("window");

export default function TradeDetailScreen() {
  const { theme: T } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  useEffect(() => {
    async function ambilDetail() {
      const { data, error } = await supabase
        .from("trades")
        .select("*")
        .eq("id", id)
        .single();
      if (!error && data) setTrade(data);
      setLoading(false);
    }
    if (id) ambilDetail();
  }, [id]);

  async function hapusTrade() {
    Alert.alert("Hapus Trade", "Yakin ingin menghapus trade ini?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          await supabase.from("trades").delete().eq("id", id);
          router.back();
        },
      },
    ]);
  }

  if (loading) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: T.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: T.subtext }}>Memuat...</Text>
      </SafeAreaView>
    );
  }

  if (!trade) {
    return (
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: T.bg,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: T.subtext }}>Data tidak ditemukan</Text>
        <Button
          onPress={() => router.back()}
          textColor={T.accent}
          style={{ marginTop: 12 }}
        >
          Kembali
        </Button>
      </SafeAreaView>
    );
  }

  const isProfit = trade.type === "profit";
  const colorPnL = isProfit ? T.accent : T.negative;

  const formatTanggal = (tgl: string) =>
    new Date(tgl).toLocaleDateString("id-ID", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 20,
          paddingHorizontal: 16,
          paddingBottom: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={T.text} />
          <Text style={{ color: T.text, fontSize: 16 }}>Kembali</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={hapusTrade}>
          <MaterialCommunityIcons
            name="delete-outline"
            size={24}
            color={T.negative}
          />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero Card PnL */}
        <View
          style={{
            backgroundColor: T.card,
            marginHorizontal: 16,
            borderRadius: 20,
            padding: 24,
            marginBottom: 16,
            alignItems: "center",
            borderLeftWidth: 5,
            borderLeftColor: colorPnL,
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
              name={isProfit ? "trending-up" : "trending-down"}
              size={28}
              color={colorPnL}
            />
            <Text style={{ color: colorPnL, fontSize: 40, fontWeight: "bold" }}>
              {isProfit ? "+" : "-"}${trade.amount.toFixed(2)}
            </Text>
          </View>
          <View
            style={{
              backgroundColor: colorPnL + "22",
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderRadius: 20,
            }}
          >
            <Text style={{ color: colorPnL, fontWeight: "bold", fontSize: 14 }}>
              {isProfit ? "PROFIT" : "LOSS"}
            </Text>
          </View>
        </View>

        {/* Info Grid */}
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
              alignItems: "center",
            }}
          >
            <MaterialCommunityIcons
              name="calendar-outline"
              size={22}
              color={T.accent}
            />
            <Text style={{ color: T.subtext, fontSize: 11, marginTop: 6 }}>
              Tanggal
            </Text>
            <Text
              style={{
                color: T.text,
                fontWeight: "600",
                fontSize: 13,
                textAlign: "center",
                marginTop: 2,
              }}
            >
              {formatTanggal(trade.tanggal)}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              backgroundColor: T.card,
              borderRadius: 14,
              padding: 16,
              alignItems: "center",
            }}
          >
            <MaterialCommunityIcons
              name="clock-outline"
              size={22}
              color={T.accent}
            />
            <Text style={{ color: T.subtext, fontSize: 11, marginTop: 6 }}>
              Jam Masuk
            </Text>
            <Text
              style={{
                color: T.text,
                fontWeight: "bold",
                fontSize: 20,
                marginTop: 2,
              }}
            >
              {trade.jam?.slice(0, 5) ?? "-"}
            </Text>
          </View>
        </View>

        {/* Note */}
        {trade.note && (
          <View
            style={{
              backgroundColor: T.card,
              marginHorizontal: 16,
              borderRadius: 16,
              padding: 18,
              marginBottom: 12,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <MaterialCommunityIcons
                name="note-text-outline"
                size={20}
                color={T.accent}
              />
              <Text style={{ color: T.text, fontSize: 16, fontWeight: "bold" }}>
                Note
              </Text>
            </View>
            <Text style={{ color: T.subtext, fontSize: 14, lineHeight: 22 }}>
              {trade.note}
            </Text>
          </View>
        )}

        {/* Lesson */}
        {trade.lesson && (
          <View
            style={{
              backgroundColor: T.card,
              marginHorizontal: 16,
              borderRadius: 16,
              padding: 18,
              marginBottom: 12,
              borderLeftWidth: 3,
              borderLeftColor: T.accent,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 10,
              }}
            >
              <MaterialCommunityIcons
                name="lightbulb-outline"
                size={20}
                color={T.accent}
              />
              <Text style={{ color: T.text, fontSize: 16, fontWeight: "bold" }}>
                Lesson
              </Text>
            </View>
            <Text style={{ color: T.subtext, fontSize: 14, lineHeight: 22 }}>
              {trade.lesson}
            </Text>
          </View>
        )}

        {/* Gambar Before & After */}
        {trade.image_before || trade.image_after ? (
          <View style={{ marginHorizontal: 16, marginBottom: 16 }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 12,
              }}
            >
              <MaterialCommunityIcons
                name="image-outline"
                size={20}
                color={T.accent}
              />
              <Text style={{ color: T.text, fontSize: 16, fontWeight: "bold" }}>
                Screenshot Setup
              </Text>
            </View>

            {trade.image_before && (
              <View style={{ marginBottom: 12 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: T.negative,
                    }}
                  />
                  <Text
                    style={{
                      color: T.subtext,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    BEFORE
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setZoomImage(trade.image_before)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: trade.image_before }}
                    style={{
                      width: "100%",
                      height: 200,
                      borderRadius: 14,
                      backgroundColor: T.border,
                    }}
                    resizeMode="cover"
                  />
                  <View
                    style={{
                      position: "absolute",
                      bottom: 10,
                      right: 10,
                      backgroundColor: "rgba(0,0,0,0.5)",
                      borderRadius: 8,
                      padding: 6,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="magnify-plus-outline"
                      size={18}
                      color="#fff"
                    />
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {trade.image_after && (
              <View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 8,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: T.accent,
                    }}
                  />
                  <Text
                    style={{
                      color: T.subtext,
                      fontSize: 13,
                      fontWeight: "600",
                    }}
                  >
                    AFTER
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setZoomImage(trade.image_after)}
                  activeOpacity={0.9}
                >
                  <Image
                    source={{ uri: trade.image_after }}
                    style={{
                      width: "100%",
                      height: 200,
                      borderRadius: 14,
                      backgroundColor: T.border,
                    }}
                    resizeMode="cover"
                  />
                  <View
                    style={{
                      position: "absolute",
                      bottom: 10,
                      right: 10,
                      backgroundColor: "rgba(0,0,0,0.5)",
                      borderRadius: 8,
                      padding: 6,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="magnify-plus-outline"
                      size={18}
                      color="#fff"
                    />
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          <View
            style={{
              backgroundColor: T.card,
              marginHorizontal: 16,
              borderRadius: 16,
              padding: 24,
              marginBottom: 16,
              alignItems: "center",
            }}
          >
            <MaterialCommunityIcons
              name="image-off-outline"
              size={36}
              color={T.border}
            />
            <Text style={{ color: T.subtext, fontSize: 13, marginTop: 8 }}>
              Tidak ada screenshot setup
            </Text>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* Modal Zoom Gambar */}
      <Modal visible={!!zoomImage} transparent animationType="fade">
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.95)",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <TouchableOpacity
            onPress={() => setZoomImage(null)}
            style={{
              position: "absolute",
              top: 50,
              right: 20,
              zIndex: 10,
              backgroundColor: "rgba(255,255,255,0.15)",
              borderRadius: 20,
              padding: 8,
            }}
          >
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {zoomImage && (
            <Image
              source={{ uri: zoomImage }}
              style={{
                width: width - 16,
                height: width - 16,
                borderRadius: 12,
              }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
