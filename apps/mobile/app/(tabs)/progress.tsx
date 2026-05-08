import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const STATS = [
  { label: "Total distance", value: "284 km", sub: "Last 12 weeks" },
  { label: "Total runs", value: "38", sub: "Avg 3.2/week" },
  { label: "Avg pace improvement", value: "−0:42/km", sub: "Since start" },
  { label: "Predicted race time", value: "1:52:00", sub: "Half Marathon" },
];

const RECENT = [
  { date: "Mon 5 May", type: "Easy Run", km: 8.2, pace: "5:43/km", hr: 138 },
  { date: "Tue 6 May", type: "Strength", km: null, pace: "45 min", hr: 122 },
  { date: "Sat 3 May", type: "Long Run", km: 16.4, pace: "5:58/km", hr: 151 },
  { date: "Thu 1 May", type: "Threshold", km: 9.8, pace: "4:53/km", hr: 172 },
];

export default function ProgressScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Progress</Text>

        <View style={styles.statsGrid}>
          {STATS.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statSub}>{s.sub}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Recent Activities</Text>
        {RECENT.map((r) => (
          <View key={r.date} style={styles.activityRow}>
            <View style={styles.activityLeft}>
              <Text style={styles.activityDate}>{r.date}</Text>
              <Text style={styles.activityType}>{r.type}</Text>
            </View>
            <View style={styles.activityRight}>
              {r.km && <Text style={styles.activityKm}>{r.km} km</Text>}
              <Text style={styles.activityPace}>{r.pace}</Text>
              <Text style={styles.activityHr}>❤ {r.hr}</Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  content: { padding: 20, gap: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 4 },

  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#141414",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  statValue: { fontSize: 22, fontWeight: "700", color: "#22c55e" },
  statLabel: { fontSize: 11, color: "#52525b", marginTop: 2 },
  statSub: { fontSize: 10, color: "#3f3f46", marginTop: 1 },

  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#fff", marginTop: 8 },

  activityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#141414",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  activityLeft: { gap: 2 },
  activityDate: { fontSize: 11, color: "#52525b" },
  activityType: { fontSize: 14, fontWeight: "600", color: "#fff" },
  activityRight: { alignItems: "flex-end", gap: 2 },
  activityKm: { fontSize: 14, fontWeight: "600", color: "#22c55e" },
  activityPace: { fontSize: 12, color: "#a1a1aa" },
  activityHr: { fontSize: 11, color: "#71717a" },
});
