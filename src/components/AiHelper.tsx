import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../lib/supabase";
import type { Patient, Session } from "../types";

interface Props {
  patient: Patient;
  sessions: Session[];
}

const QUICK_ACTIONS = [
  "Summarize this patient's history and check-up progress.",
  "Suggest follow-up questions and items to check at the next visit.",
  "Write simple aftercare instructions for this patient in plain language.",
];

const QUICK_LABELS = ["Summarize history", "Suggest follow-ups", "Draft aftercare"];

export default function AiHelper({ patient, sessions }: Props) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const context = [
    `Condition: ${patient.condition || "Not recorded"}`,
    `Allergies: ${patient.allergies || "None"}`,
    `Medications: ${patient.medications || "None"}`,
    ...sessions.map(
      (s) =>
        `- ${s.session_date} | ${s.title} | ${s.status} | ${s.description}` +
        (s.next_steps ? ` | Next: ${s.next_steps}` : ""),
    ),
  ].join("\n");

  async function ask(task: string) {
    if (!task.trim()) return;

    setBusy(true);
    setError("");
    setAnswer("");

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("You must be signed in.");

      const endpoint = process.env.EXPO_PUBLIC_AI_ENDPOINT;
      if (!endpoint) throw new Error("AI endpoint not configured.");

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ task, context }),
    });

    if (!res.ok) {
      // Errors still come back as JSON
      const errJson = await res.json().catch(() => ({}));
      throw new Error(errJson.error || "AI request failed.");
    }

    // Success response is streamed plain text
    const text = await res.text();
    setAnswer(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }

    setBusy(false);
  }

  return (
    <View className="rounded-[24px] border border-purple-100 bg-purple-50 p-5">
      {/* Header */}
      <View className="mb-3 flex-row items-center gap-2">
        <Text className="text-lg">✨</Text>
        <Text className="text-base font-bold text-purple-800">AI helper</Text>
      </View>

      {/* Quick actions */}
      <View className="mb-4 gap-2">
        {QUICK_ACTIONS.map((action, i) => (
          <Pressable
            key={action}
            onPress={() => ask(action)}
            disabled={busy}
            className={`rounded-2xl bg-purple-700 px-4 py-3 ${
              busy ? "opacity-50" : "active:bg-purple-800"
            }`}
          >
            <Text className="text-center text-xs font-bold text-white">
              {QUICK_LABELS[i]}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Custom question */}
      <View className="mb-4 flex-row gap-2">
        <TextInput
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask about this case…"
          placeholderTextColor="#94a3b8"
          editable={!busy}
          multiline
          className="flex-1 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
        />
        <Pressable
          onPress={() => {
            ask(question);
            setQuestion("");
          }}
          disabled={busy || !question.trim()}
          className={`items-center justify-center rounded-2xl px-4 ${
            busy || !question.trim() ? "bg-slate-300" : "bg-purple-800"
          }`}
        >
          <Text className="text-xs font-bold text-white">Ask</Text>
        </Pressable>
      </View>

      {/* Loading */}
      {busy && (
        <View className="flex-row items-center gap-2 py-2">
          <ActivityIndicator size="small" color="#7c3aed" />
          <Text className="text-xs text-slate-500">Thinking…</Text>
        </View>
      )}

      {/* Error */}
      {error ? (
        <View className="mb-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
          <Text className="text-sm text-red-700">{error}</Text>
        </View>
      ) : null}

      {/* Answer */}
      {answer ? (
        <ScrollView
          className="max-h-80 rounded-2xl border border-slate-200 bg-white p-4"
          nestedScrollEnabled
        >
          <Text className="text-sm leading-6 text-slate-700">{answer}</Text>
        </ScrollView>
      ) : null}

      {/* Disclaimer */}
      <Text className="mt-3 text-[10px] leading-4 text-slate-400">
        AI suggestions are not a diagnosis. A licensed dentist makes the final
        decision.
      </Text>
    </View>
  );
}