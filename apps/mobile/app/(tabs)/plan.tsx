import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const WEEKS = Array.from({ length: 16 }, (_, i) => ({
  week: i + 1,
  phase: i < 4 ? "Base" : i < 10 ? "Build" : i < 14 ? "Peak" : "Taper",
  totalKm: Math.round(30 + i * 2.5 - (i >= 13 ? (i - 12) * 8 : 0)),
  done: i < 4,
  current: i === 4,
}));

export default function PlanScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Half Marathon Plan</Text>
        <Text style={styles.sub}>16 weeks · Race day Aug 22, 2026</Text>

        <View style={styles.phaseLegend}>
          {["Base", "Build", "Peak", "Taper"].map((p) => (
            <View key={p} style={styles.legendItem}>
              <View style={[styles.legendDot, styles[`phase${p}` as keyof typeof styles]]} />
              <Text style={styles.legendText}>{p}</Text>
            </View>
          ))}
        </View>

        {WEEKS.map((w) => (
          <View
            key={w.week}
            style={[styles.weekRow, w.current && styles.weekRowCurrent, w.done && styles.weekRowDone]}
          >
            <View style={[styles.weekBadge, styles[`phase${w.phase}` as keyof typeof styles]]}>
              <Text style={styles.weekBadgeText}>{w.week}</Text>
            </View>
            <View style={styles.weekInfo}>
              <Text style={[styles.weekLabel, w.done && styles.weekLabelDone]}>
                Week {w.week} {w.current ? "(Current)" : ""}
              </Text>
              <Text style={styles.weekPhase}>{w.phase} · {w.totalKm} km</Text>
            </View>
            {w.done && <Text style={styles.check}>✓</Text>}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { padding: 20, gap: 8 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff" },
  sub: { fontSize: 13, color: "#71717a", marginBottom: 12 },

  phaseLegend: { flexDirection: "row", gap: 16, marginBottom: 8 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: "#71717a" },

  weekRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#141414",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  weekRowCurrent: { borderColor: "#22c55e44" },
  weekRowDone: { opacity: 0.5 },

  weekBadge: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  weekBadgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },

  weekInfo: { flex: 1 },
  weekLabel: { fontSize: 14, fontWeight: "600", color: "#fff" },
  weekLabelDone: { color: "#52525b" },
  weekPhase: { fontSize: 12, color: "#71717a", marginTop: 1 },
  check: { color: "#22c55e", fontSize: 16 },

  // Phase colors
  phaseBase: { backgroundColor: "#3b82f655" },
  phaseBuild: { backgroundColor: "#22c55e55" },
  phasePeak: { backgroundColor: "#f59e0b55" },
  phaseTaper: { backgroundColor: "#8b5cf655" },
} as any);
