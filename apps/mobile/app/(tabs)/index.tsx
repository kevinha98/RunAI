import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

// Mock data — replace with real Supabase queries
const TODAY_SESSION = {
  type: "Threshold Run",
  distance: "10 km",
  targetPace: "4:50/km",
  description:
    "Comfortably hard effort. Should feel controlled but demanding. Hit 4:50/km ± 5 seconds.",
  phase: "Build",
  week: 5,
};

const METRICS = [
  { label: "This week", value: "14 km", sub: "of 47 km target" },
  { label: "Predicted HM", value: "1:52", sub: "-4 min from start" },
  { label: "Load", value: "68%", sub: "Optimal zone" },
];

export default function TodayScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good morning, Kevin 👋</Text>
            <Text style={styles.subtext}>Week 5 · Build Phase · 11 weeks to race day</Text>
          </View>
        </View>

        {/* Today's session */}
        <View style={styles.todayCard}>
          <View style={styles.todayBadge}>
            <Text style={styles.todayBadgeText}>TODAY</Text>
          </View>
          <Text style={styles.sessionType}>{TODAY_SESSION.type}</Text>
          <Text style={styles.sessionMeta}>
            {TODAY_SESSION.distance} · Target {TODAY_SESSION.targetPace}
          </Text>
          <Text style={styles.sessionDesc}>{TODAY_SESSION.description}</Text>
          <TouchableOpacity style={styles.startButton} activeOpacity={0.8}>
            <Ionicons name="play" size={18} color="#000" />
            <Text style={styles.startButtonText}>Start Workout</Text>
          </TouchableOpacity>
        </View>

        {/* Metrics */}
        <View style={styles.metricsRow}>
          {METRICS.map((m) => (
            <View key={m.label} style={styles.metricCard}>
              <Text style={styles.metricValue}>{m.value}</Text>
              <Text style={styles.metricLabel}>{m.label}</Text>
              <Text style={styles.metricSub}>{m.sub}</Text>
            </View>
          ))}
        </View>

        {/* Coach insight */}
        <View style={styles.coachCard}>
          <View style={styles.coachHeader}>
            <View style={styles.coachIcon}>
              <Ionicons name="sparkles" size={16} color="#22c55e" />
            </View>
            <Text style={styles.coachTitle}>Coach Insight</Text>
          </View>
          <Text style={styles.coachText}>
            "Your easy pace dropped 8 seconds this week — great aerobic development. Today's threshold
            is the key session. Hit the pace and Saturday's long run becomes much more manageable."
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 16 },

  header: { marginBottom: 4 },
  greeting: { fontSize: 22, fontWeight: "700", color: "#fff" },
  subtext: { fontSize: 13, color: "#71717a", marginTop: 2 },

  todayCard: {
    backgroundColor: "#141414",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#22c55e33",
  },
  todayBadge: {
    backgroundColor: "#22c55e22",
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    marginBottom: 10,
  },
  todayBadgeText: { color: "#22c55e", fontSize: 10, fontWeight: "700", letterSpacing: 1 },
  sessionType: { fontSize: 24, fontWeight: "700", color: "#fff", marginBottom: 4 },
  sessionMeta: { fontSize: 14, color: "#a1a1aa", marginBottom: 10 },
  sessionDesc: { fontSize: 13, color: "#71717a", lineHeight: 19, marginBottom: 16 },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#22c55e",
    borderRadius: 14,
    paddingVertical: 14,
  },
  startButtonText: { color: "#000", fontSize: 15, fontWeight: "600" },

  metricsRow: { flexDirection: "row", gap: 10 },
  metricCard: {
    flex: 1,
    backgroundColor: "#141414",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  metricValue: { fontSize: 20, fontWeight: "700", color: "#fff" },
  metricLabel: { fontSize: 11, color: "#52525b", marginTop: 2 },
  metricSub: { fontSize: 10, color: "#22c55e", marginTop: 2 },

  coachCard: {
    backgroundColor: "#141414",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1f1f1f",
  },
  coachHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  coachIcon: {
    width: 28,
    height: 28,
    backgroundColor: "#22c55e22",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  coachTitle: { fontSize: 14, fontWeight: "600", color: "#fff" },
  coachText: { fontSize: 13, color: "#a1a1aa", lineHeight: 19 },
});
