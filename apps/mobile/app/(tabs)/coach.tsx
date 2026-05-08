import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

type Message = { id: string; role: "user" | "assistant"; content: string };

const INITIAL: Message = {
  id: "0",
  role: "assistant",
  content: "Hey! Ask me anything about your training, today's session, or how to race faster. I know your plan inside out.",
};

const SUGGESTIONS = [
  "Why am I doing a threshold run today?",
  "I feel tired — should I rest?",
  "How do I pace my long run?",
];

export default function CoachScreen() {
  const [messages, setMessages] = useState<Message[]>([INITIAL]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!input.trim() || loading) return;
    const text = input.trim();
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    setLoading(true);

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: "",
    };
    setMessages((p) => [...p, assistantMsg]);

    try {
      const res = await fetch(`${API_URL}/api/coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No body");
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ") && line !== "data: [DONE]") {
            try {
              const parsed = JSON.parse(line.slice(6));
              const delta = parsed.choices?.[0]?.delta?.content ?? "";
              if (delta) {
                setMessages((p) =>
                  p.map((m) =>
                    m.id === assistantMsg.id ? { ...m, content: m.content + delta } : m
                  )
                );
              }
            } catch {
              //
            }
          }
        }
      }
    } catch {
      setMessages((p) =>
        p.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: "Couldn't reach the coach right now. Check your connection." }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.coachIcon}>
            <Ionicons name="sparkles" size={18} color="#22c55e" />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Coach</Text>
            <Text style={styles.headerSub}>● Powered by Claude</Text>
          </View>
        </View>

        {/* Messages */}
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          renderItem={({ item }) => (
            <View
              style={[
                styles.bubble,
                item.role === "user" ? styles.userBubble : styles.aiBubble,
              ]}
            >
              {item.content ? (
                <Text
                  style={[
                    styles.bubbleText,
                    item.role === "user" && styles.userBubbleText,
                  ]}
                >
                  {item.content}
                </Text>
              ) : (
                <ActivityIndicator size="small" color="#22c55e" />
              )}
            </View>
          )}
        />

        {/* Suggestions */}
        {messages.length === 1 && (
          <View style={styles.suggestions}>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.chip}
                onPress={() => {
                  setInput(s);
                }}
              >
                <Text style={styles.chipText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your coach..."
            placeholderTextColor="#52525b"
            onSubmitEditing={send}
            returnKeyType="send"
            multiline={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!input.trim() || loading}
          >
            <Ionicons name="arrow-up" size={18} color="#000" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0a0a0a" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1f1f1f",
    backgroundColor: "#0d0d0d",
  },
  coachIcon: {
    width: 36,
    height: 36,
    backgroundColor: "#22c55e22",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 15, fontWeight: "600", color: "#fff" },
  headerSub: { fontSize: 11, color: "#22c55e" },

  messageList: { padding: 16, gap: 12 },

  bubble: {
    maxWidth: "80%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: { backgroundColor: "#22c55e", alignSelf: "flex-end" },
  aiBubble: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#1f1f1f",
    alignSelf: "flex-start",
  },
  bubbleText: { fontSize: 14, color: "#e4e4e7", lineHeight: 20 },
  userBubbleText: { color: "#000", fontWeight: "500" },

  suggestions: { paddingHorizontal: 16, gap: 8, paddingBottom: 8 },
  chip: {
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#1f1f1f",
    borderRadius: 100,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontSize: 12, color: "#a1a1aa" },

  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#1f1f1f",
    backgroundColor: "#0d0d0d",
  },
  input: {
    flex: 1,
    backgroundColor: "#141414",
    borderWidth: 1,
    borderColor: "#1f1f1f",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#fff",
  },
  sendBtn: {
    width: 40,
    height: 40,
    backgroundColor: "#22c55e",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { opacity: 0.4 },
});
