import { useState, useCallback, useRef } from "react";
import { View, ScrollView, TouchableOpacity, Animated } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useFocusEffect, router } from "expo-router";
import { useTheme } from "@/context/themecontext";
import Svg, { Path, G, Text as SvgText } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";

type Trade = {
  id: number;
  type: "profit" | "loss";
  amount: number;
  tanggal: string;
};

const PERIODS = ["This Week", "This Month", "This Year", "All Time"];
const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    Math.abs(n),
  );

function PieChart({
  winRate,
  accentColor,
  negColor,
}: {
  winRate: number;
  accentColor: string;
  negColor: string;
}) {
  const size = 170;
  const cx = size / 2;
  const cy = size / 2;
  const r = 65;
  const lossRate = 100 - winRate;

  function polarToXY(angleDeg: number) {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function slicePath(startDeg: number, endDeg: number) {
    if (endDeg - startDeg >= 360) endDeg = 359.99;
    const s = polarToXY(startDeg);
    const e = polarToXY(endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
  }

  // Label posisi tengah slice
  function midPoint(startDeg: number, endDeg: number) {
    const mid = (startDeg + endDeg) / 2;
    const rad = ((mid - 90) * Math.PI) / 180;
    const dist = r * 0.62;
    return { x: cx + dist * Math.cos(rad), y: cy + dist * Math.sin(rad) };
  }

  const winEnd = (winRate / 100) * 360;
  const winMid = midPoint(0, winEnd);
  const lossMid = midPoint(winEnd, 360);

  return (
    <SafeAreaView style={{ alignItems: "center", marginVertical: 12 }}>
      <Svg width={size} height={size}>
        {winRate === 0 ? (
          <Path d={slicePath(0, 359.99)} fill={negColor} />
        ) : winRate === 100 ? (
          <Path d={slicePath(0, 359.99)} fill={accentColor} />
        ) : (
          <G>
            <Path d={slicePath(0, winEnd)} fill={accentColor} />
            <Path d={slicePath(winEnd, 360)} fill={negColor} />
            {/* Label persentase di dalam slice */}
            {winRate > 12 && (
              <SvgText
                x={winMid.x}
                y={winMid.y + 5}
                fontSize={13}
                fontWeight="bold"
                fill="#fff"
                textAnchor="middle"
              >
                {winRate.toFixed(0)}%
              </SvgText>
            )}
            {lossRate > 12 && (
              <SvgText
                x={lossMid.x}
                y={lossMid.y + 5}
                fontSize={13}
                fontWeight="bold"
                fill="#fff"
                textAnchor="middle"
              >
                {lossRate.toFixed(0)}%
              </SvgText>
            )}
          </G>
        )}
      </Svg>
    </SafeAreaView>
  );
}

export default function AnalyticsScreen() {
  const { theme: T } = useTheme();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [period, setPeriod] = useState("This Month");
  const [detailOpen, setDetailOpen] = useState(false);
  const detailAnim = useRef(new Animated.Value(0)).current;

  async function ambilTrades() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("trades")
      .select("id, type, amount, tanggal")
      .eq("user_id", user.id)
      .order("tanggal", { ascending: true });
    if (data) setTrades(data);
  }

  useFocusEffect(
    useCallback(() => {
      ambilTrades();
    }, []),
  );

  function filterByPeriod(data: Trade[]) {
    const now = new Date();
    return data.filter((t) => {
      const d = new Date(t.tanggal);
      if (period === "This Week") {
        const start = new Date(now);
        start.setDate(now.getDate() - now.getDay() + 1);
        start.setHours(0, 0, 0, 0);
        return d >= start;
      }
      if (period === "This Month")
        return (
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      if (period === "This Year") return d.getFullYear() === now.getFullYear();
      return true;
    });
  }

  const filtered = filterByPeriod(trades);
  const profits = filtered.filter((t) => t.type === "profit");
  const losses = filtered.filter((t) => t.type === "loss");
  const totalProfit = profits.reduce((s, t) => s + t.amount, 0);
  const totalLoss = losses.reduce((s, t) => s + t.amount, 0);
  const netPnL = totalProfit - totalLoss;
  const winRate =
    filtered.length > 0 ? (profits.length / filtered.length) * 100 : 0;
  const lossRate = 100 - winRate;
  const profitFactor =
    totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? 999 : 0;
  const avgProfit = profits.length > 0 ? totalProfit / profits.length : 0;
  const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;
  const expectancy = (winRate / 100) * avgProfit - (lossRate / 100) * avgLoss;
  const uniqueDays = [...new Set(filtered.map((t) => t.tanggal))];
  const tradingDays = uniqueDays.length;
  const dailyAvg = tradingDays > 0 ? netPnL / tradingDays : 0;
  const highestProfit =
    profits.length > 0 ? Math.max(...profits.map((t) => t.amount)) : 0;
  const highestLoss =
    losses.length > 0 ? Math.max(...losses.map((t) => t.amount)) : 0;

  function toggleDetail() {
    const toVal = detailOpen ? 0 : 1;
    setDetailOpen(!detailOpen);
    Animated.timing(detailAnim, {
      toValue: toVal,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }

  const detailH = detailAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 140],
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <Text
        style={{
          color: T.text,
          fontSize: 24,
          fontWeight: "bold",
          textAlign: "center",
          paddingTop: 20,
          paddingBottom: 12,
        }}
      >
        Analytics
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Drawdown banner */}
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/chart" as any)}
          style={{
            backgroundColor: T.card,
            marginHorizontal: 16,
            marginBottom: 12,
            borderRadius: 16,
            padding: 20,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <View>
            <Text
              style={{
                color: T.text,
                fontSize: 16,
                fontWeight: "bold",
                marginBottom: 6,
              }}
            >
              Drawdown chart
            </Text>
            <MaterialCommunityIcons
              name="chart-areaspline"
              size={36}
              color={T.accent}
            />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Text style={{ color: T.text, fontSize: 15 }}>See the chart</Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={18}
              color={T.text}
            />
          </View>
        </TouchableOpacity>

        {/* Period Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
        >
          <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 8 }}>
            {PERIODS.map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => setPeriod(p)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: period === p ? T.accent : T.card,
                }}
              >
                <Text
                  style={{
                    color: period === p ? "#0d1117" : T.subtext,
                    fontWeight: "600",
                  }}
                >
                  {p}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Win Rate Pie Chart */}
        <View
          style={{
            backgroundColor: T.card,
            marginHorizontal: 16,
            marginBottom: 12,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <Text
            style={{
              color: T.text,
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 4,
            }}
          >
            Win Rate
          </Text>
          {filtered.length === 0 ? (
            <Text
              style={{
                color: T.subtext,
                textAlign: "center",
                paddingVertical: 24,
              }}
            >
              Belum ada data trade
            </Text>
          ) : (
            <>
              <PieChart
                winRate={winRate}
                accentColor={T.accent}
                negColor={T.negative}
              />
              {/* Legend */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-around",
                  marginTop: 4,
                }}
              >
                {[
                  {
                    label: "Profit",
                    count: profits.length,
                    pct: winRate,
                    color: T.accent,
                  },
                  {
                    label: "Loss",
                    count: losses.length,
                    pct: lossRate,
                    color: T.negative,
                  },
                  {
                    label: "Total",
                    count: filtered.length,
                    pct: null,
                    color: T.subtext,
                  },
                ].map((item) => (
                  <View key={item.label} style={{ alignItems: "center" }}>
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: item.color,
                        marginBottom: 4,
                      }}
                    />
                    <Text style={{ color: T.subtext, fontSize: 11 }}>
                      {item.label}
                    </Text>
                    <Text
                      style={{
                        color: item.color,
                        fontWeight: "bold",
                        fontSize: 16,
                      }}
                    >
                      {item.count}
                    </Text>
                    {item.pct !== null && (
                      <Text style={{ color: item.color, fontSize: 11 }}>
                        {item.pct.toFixed(1)}%
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Profit & Loss */}
        <View
          style={{
            backgroundColor: T.card,
            marginHorizontal: 16,
            marginBottom: 12,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <Text
            style={{
              color: T.text,
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 16,
            }}
          >
            Profit and Loss
          </Text>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <View>
              <Text style={{ color: T.subtext, fontSize: 12, marginBottom: 4 }}>
                Total Profit
              </Text>
              <Text
                style={{ color: T.accent, fontSize: 18, fontWeight: "bold" }}
              >
                +{usd(totalProfit)}
              </Text>
            </View>
            <View>
              <Text style={{ color: T.subtext, fontSize: 12, marginBottom: 4 }}>
                Total Loss
              </Text>
              <Text
                style={{ color: T.negative, fontSize: 18, fontWeight: "bold" }}
              >
                -{usd(totalLoss)}
              </Text>
            </View>
          </View>
          <View
            style={{ height: 1, backgroundColor: T.border, marginBottom: 16 }}
          />
          <Text style={{ color: T.subtext, fontSize: 12, textAlign: "center" }}>
            Net PnL
          </Text>
          <Text
            style={{
              color: netPnL >= 0 ? T.accent : T.negative,
              fontSize: 32,
              fontWeight: "bold",
              textAlign: "center",
              marginTop: 4,
            }}
          >
            {netPnL >= 0 ? "+" : "-"}
            {usd(netPnL)}
          </Text>
          <TouchableOpacity
            onPress={toggleDetail}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 16,
              gap: 6,
            }}
          >
            <Text style={{ color: T.subtext, fontSize: 13 }}>Details</Text>
            <MaterialCommunityIcons
              name={detailOpen ? "chevron-up" : "chevron-down"}
              size={18}
              color={T.subtext}
            />
          </TouchableOpacity>
          <Animated.View style={{ height: detailH, overflow: "hidden" }}>
            <View style={{ paddingTop: 12, gap: 10 }}>
              {[
                {
                  label: "Daily Average PnL",
                  value: `${dailyAvg >= 0 ? "+" : "-"}${usd(dailyAvg)}`,
                  color: dailyAvg >= 0 ? T.accent : T.negative,
                },
                {
                  label: "Trading Days",
                  value: `${tradingDays}`,
                  color: T.text,
                },
                {
                  label: "Highest Profit",
                  value: `+${usd(highestProfit)}`,
                  color: T.accent,
                },
                {
                  label: "Highest Loss",
                  value: `-${usd(highestLoss)}`,
                  color: T.negative,
                },
              ].map((item) => (
                <View
                  key={item.label}
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                  }}
                >
                  <Text style={{ color: T.subtext, fontSize: 13 }}>
                    {item.label}
                  </Text>
                  <Text style={{ color: item.color, fontWeight: "600" }}>
                    {item.value}
                  </Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* Profit Factor & Expectancy */}
        <View
          style={{
            backgroundColor: T.card,
            marginHorizontal: 16,
            marginBottom: 12,
            borderRadius: 16,
            padding: 20,
          }}
        >
          <Text
            style={{
              color: T.text,
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 16,
            }}
          >
            Profit Factor & Expectancy
          </Text>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {[
              {
                label: "Profit Factor",
                value: profitFactor === 999 ? "∞" : profitFactor.toFixed(2),
                color: profitFactor >= 1 ? T.accent : T.negative,
                desc:
                  profitFactor >= 1.5
                    ? "Excellent"
                    : profitFactor >= 1
                      ? "Good"
                      : "Needs work",
              },
              {
                label: "Expectancy",
                value: `${expectancy >= 0 ? "+" : "-"}${usd(expectancy)}`,
                color: expectancy >= 0 ? T.accent : T.negative,
                desc: "Per trade avg",
              },
            ].map((item) => (
              <View
                key={item.label}
                style={{
                  flex: 1,
                  backgroundColor: T.bg,
                  borderRadius: 12,
                  padding: 14,
                  alignItems: "center",
                }}
              >
                <Text
                  style={{ color: T.subtext, fontSize: 12, marginBottom: 6 }}
                >
                  {item.label}
                </Text>
                <Text
                  style={{
                    color: item.color,
                    fontSize: 20,
                    fontWeight: "bold",
                  }}
                >
                  {item.value}
                </Text>
                <Text style={{ color: T.subtext, fontSize: 11, marginTop: 4 }}>
                  {item.desc}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
