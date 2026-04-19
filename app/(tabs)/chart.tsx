import { useState, useCallback } from "react";
import { View, ScrollView, TouchableOpacity, Dimensions } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { useFocusEffect, router } from "expo-router";
import { useTheme } from "@/context/themecontext";
import Svg, {
  Path,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";

type Trade = {
  id: number;
  type: "profit" | "loss";
  amount: number;
  tanggal: string;
};
type DayData = { label: string; pnl: number; dateKey: string };

const PERIODS = ["Daily", "Weekly", "Monthly", "All Time"];
const { width } = Dimensions.get("window");
const CHART_W = width - 32;
const CHART_H = 240;
const PAD = { top: 24, right: 16, bottom: 32, left: 48 };
const usd = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n,
  );

export default function ChartScreen() {
  const { theme: T } = useTheme();
  const [allTrades, setAllTrades] = useState<Trade[]>([]);
  const [period, setPeriod] = useState("Daily");

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
    if (data) setAllTrades(data);
  }

  useFocusEffect(
    useCallback(() => {
      ambilTrades();
    }, []),
  );

  function filterTrades(): Trade[] {
    const now = new Date();
    return allTrades.filter((t) => {
      const d = new Date(t.tanggal);
      if (period === "Daily") {
        const c = new Date(now);
        c.setDate(now.getDate() - 30);
        return d >= c;
      }
      if (period === "Weekly") {
        const c = new Date(now);
        c.setDate(now.getDate() - 84);
        return d >= c;
      }
      if (period === "Monthly") {
        const c = new Date(now);
        c.setMonth(now.getMonth() - 12);
        return d >= c;
      }
      return true;
    });
  }

  function groupData(): DayData[] {
    const filtered = filterTrades();
    const map: Record<string, { pnl: number; label: string }> = {};
    filtered.forEach((t) => {
      const d = new Date(t.tanggal);
      let key = "",
        label = "";
      if (period === "Daily") {
        key = t.tanggal;
        label = d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      } else if (period === "Weekly") {
        const mon = new Date(d);
        mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
        key = mon.toISOString().split("T")[0];
        label = mon.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        });
      } else {
        key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        label = d.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });
      }
      if (!map[key]) map[key] = { pnl: 0, label };
      map[key].pnl += t.type === "profit" ? t.amount : -t.amount;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => ({ dateKey: k, pnl: v.pnl, label: v.label }));
  }

  const rawData = groupData();
  function toCumulative(data: DayData[]): DayData[] {
    let r = 0;
    return data.map((d) => {
      r += d.pnl;
      return { ...d, pnl: r };
    });
  }
  const chartData = toCumulative(rawData);
  const totalPnL =
    chartData.length > 0 ? chartData[chartData.length - 1].pnl : 0;
  const filtered = filterTrades();
  const uniqueDays = [...new Set(filtered.map((t) => t.tanggal))];
  const dailyAvg = uniqueDays.length > 0 ? totalPnL / uniqueDays.length : 0;
  const dailyPnLs = rawData.map((d) => d.pnl);
  const highProfit = dailyPnLs.length > 0 ? Math.max(...dailyPnLs) : 0;
  const highLoss = dailyPnLs.length > 0 ? Math.min(...dailyPnLs) : 0;

  function buildChart() {
    if (chartData.length < 2) return null;
    const vals = chartData.map((d) => d.pnl);
    const minV = Math.min(0, ...vals),
      maxV = Math.max(0, ...vals);
    const range = maxV - minV || 1;
    const iW = CHART_W - PAD.left - PAD.right,
      iH = CHART_H - PAD.top - PAD.bottom;
    const toX = (i: number) => PAD.left + (i / (chartData.length - 1)) * iW;
    const toY = (v: number) => PAD.top + ((maxV - v) / range) * iH;
    const points = chartData.map((d, i) => ({ x: toX(i), y: toY(d.pnl) }));
    const zeroY = toY(0);
    let line = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++)
      line += ` L ${points[i].x} ${points[i].y}`;
    const last = points[points.length - 1];
    const fill = `${line} L ${last.x} ${zeroY} L ${points[0].x} ${zeroY} Z`;
    const step = (maxV - minV) / 4;
    const yLbls = Array.from({ length: 5 }, (_, i) => minV + step * i);
    const xStep = Math.max(1, Math.floor(chartData.length / 4));
    const xIdxs: number[] = [];
    for (let i = 0; i < chartData.length; i += xStep) xIdxs.push(i);
    if (xIdxs[xIdxs.length - 1] !== chartData.length - 1)
      xIdxs.push(chartData.length - 1);
    return { line, fill, points, zeroY, yLbls, xIdxs, minV, maxV, range, iH };
  }

  const chart = buildChart();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: T.bg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 20,
          paddingHorizontal: 16,
          marginBottom: 16,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ marginRight: 12 }}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color={T.text} />
        </TouchableOpacity>
        <Text style={{ color: T.text, fontSize: 20, fontWeight: "bold" }}>
          P&L Chart
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Period selector */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: T.card,
            marginHorizontal: 16,
            borderRadius: 30,
            padding: 4,
            marginBottom: 20,
          }}
        >
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPeriod(p)}
              style={{
                flex: 1,
                paddingVertical: 8,
                borderRadius: 26,
                backgroundColor: period === p ? T.accent : "transparent",
                alignItems: "center",
              }}
            >
              <Text
                style={{
                  color: period === p ? "#0d1117" : T.subtext,
                  fontWeight: "bold",
                  fontSize: 13,
                }}
              >
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ paddingHorizontal: 16, marginBottom: 20 }}>
          <Text style={{ color: T.subtext, fontSize: 13 }}>Drawdown PnL</Text>
          <Text
            style={{
              color: totalPnL >= 0 ? T.accent : T.negative,
              fontSize: 36,
              fontWeight: "bold",
              marginTop: 2,
            }}
          >
            {totalPnL >= 0 ? "+" : ""}
            {usd(totalPnL)}
          </Text>
          <Text style={{ color: T.subtext, fontSize: 12, marginTop: 4 }}>
            Last {rawData.length}{" "}
            {period === "Daily"
              ? "Sessions"
              : period === "Weekly"
                ? "Weeks"
                : "Months"}
          </Text>
        </View>

        <View
          style={{
            marginHorizontal: 16,
            backgroundColor: T.card,
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: 20,
          }}
        >
          {!chart ? (
            <View
              style={{
                height: CHART_H,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialCommunityIcons
                name="chart-line"
                size={40}
                color={T.border}
              />
              <Text style={{ color: T.subtext, marginTop: 8 }}>
                Minimal 2 data untuk chart
              </Text>
            </View>
          ) : (
            <Svg width={CHART_W} height={CHART_H}>
              <Defs>
                <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={T.accent} stopOpacity="0.4" />
                  <Stop offset="1" stopColor={T.accent} stopOpacity="0.02" />
                </LinearGradient>
              </Defs>
              {chart.yLbls.map((v, i) => {
                const y =
                  PAD.top +
                  ((chart.maxV - v) / chart.range) *
                    (CHART_H - PAD.top - PAD.bottom);
                return (
                  <Line
                    key={i}
                    x1={PAD.left}
                    y1={y}
                    x2={CHART_W - PAD.right}
                    y2={y}
                    stroke={T.border}
                    strokeWidth={0.5}
                    strokeDasharray="4,4"
                  />
                );
              })}
              <Line
                x1={PAD.left}
                y1={chart.zeroY}
                x2={CHART_W - PAD.right}
                y2={chart.zeroY}
                stroke={T.subtext}
                strokeWidth={1}
                strokeDasharray="4,4"
              />
              <Path d={chart.fill} fill="url(#grad)" />
              <Path
                d={chart.line}
                stroke={T.accent}
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {chart.xIdxs.map((idx) => {
                const pt = chart.points[idx];
                return (
                  <SvgText
                    key={idx}
                    x={pt.x}
                    y={CHART_H - 6}
                    fontSize={9}
                    fill={T.subtext}
                    textAnchor="middle"
                  >
                    {chartData[idx]?.label}
                  </SvgText>
                );
              })}
              {chart.yLbls.map((v, i) => {
                const y =
                  PAD.top +
                  ((chart.maxV - v) / chart.range) *
                    (CHART_H - PAD.top - PAD.bottom);
                return (
                  <SvgText
                    key={i}
                    x={PAD.left - 4}
                    y={y + 4}
                    fontSize={9}
                    fill={T.subtext}
                    textAnchor="end"
                  >
                    {v.toFixed(1)}
                  </SvgText>
                );
              })}
            </Svg>
          )}
        </View>

        <View
          style={{
            backgroundColor: T.card,
            marginHorizontal: 16,
            borderRadius: 16,
            padding: 20,
            marginBottom: 20,
          }}
        >
          <Text
            style={{
              color: T.text,
              fontSize: 16,
              fontWeight: "bold",
              marginBottom: 14,
            }}
          >
            Details
          </Text>
          {[
            {
              label: "Daily Average PnL",
              value: `${dailyAvg >= 0 ? "+" : ""}${usd(dailyAvg)}`,
            },
            { label: "Trading Days", value: `${uniqueDays.length}` },
            { label: "Highest Profit Day", value: `+${usd(highProfit)}` },
            { label: "Highest Loss Day", value: `${usd(highLoss)}` },
          ].map((item) => (
            <View
              key={item.label}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <Text style={{ color: T.subtext, fontSize: 13 }}>
                {item.label}
              </Text>
              <Text style={{ color: T.text, fontWeight: "600" }}>
                {item.value}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
