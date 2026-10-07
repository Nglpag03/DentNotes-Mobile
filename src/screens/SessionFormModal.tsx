import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { format } from "date-fns";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { SessionStatus } from "../types";
import { SESSION_TEMPLATES } from "../lib/sessionTemplates";

interface Props {
  visible: boolean;
  patientId: string;
  onClose: () => void;
  onSaved: () => void;
}

const STATUSES: SessionStatus[] = ["PLANNED", "IN PROGRESS", "COMPLETED"];

export default function SessionFormModal({
  visible,
  patientId,
  onClose,
  onSaved,
}: Props) {
  const { session } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [status, setStatus] = useState<SessionStatus>("PLANNED");
  const [nextSteps, setNextSteps] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  function reset() {
    setTitle("");
    setDescription("");
    setSessionDate(new Date().toISOString().slice(0, 10));
    setStatus("PLANNED");
    setNextSteps("");
    setError("");
    setBusy(false);
    setActiveTemplate(null);
  }
  function applyTemplate(id: string) {
  const t = SESSION_TEMPLATES.find((x) => x.id === id);
  if (!t) return;

  // Tap the same template again to toggle off
  if (activeTemplate === id) {
    setActiveTemplate(null);
    setTitle("");
    setDescription("");
    setNextSteps("");
    return;
  }

  setActiveTemplate(id);
  setTitle(t.title);
  setDescription(t.description);
  setNextSteps(t.next_steps ?? "");
}

  async function handleSave() {
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    setBusy(true);
    setError("");

    // Build an ISO timestamp for the chosen day (midnight local time)
    const isoDate = new Date(`${sessionDate}T09:00:00`).toISOString();

    const { error: insertError } = await supabase.from("sessions").insert({
      patient_id: patientId,
      title: title.trim(),
      description: description.trim(),
      session_date: isoDate,
      status,
      next_steps: nextSteps.trim() || null,
      user_id: session?.user.id,
    });

    setBusy(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    reset();
    onSaved();
    onClose();
  }

  function handleClose() {
    reset();
    onClose();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          className="max-h-[90%]"
        >
          <View className="rounded-t-[32px] bg-white">
            {/* Header */}
            <View className="flex-row items-center justify-between border-b border-slate-100 px-6 py-4">
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
                  New check-up
                </Text>
                <Text className="mt-1 text-lg font-bold text-slate-950">
                  Add a session
                </Text>
              </View>
              <Pressable
                onPress={handleClose}
                className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
              >
                <Text className="text-lg text-slate-500">✕</Text>
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {error ? (
                <View className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                  <Text className="text-sm text-red-700">{error}</Text>
                </View>
              ) : null}

              {/* Quick templates */}
              <View className="mb-5">
                <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Quick templates
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                >
                  {SESSION_TEMPLATES.map((t) => {
                    const active = activeTemplate === t.id;
                    return (
                      <Pressable
                        key={t.id}
                        onPress={() => applyTemplate(t.id)}
                        className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2 ${
                          active
                            ? "border-purple-800 bg-purple-800"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <Text className="text-sm">{t.emoji}</Text>
                        <Text
                          className={`text-xs font-bold ${
                            active ? "text-white" : "text-slate-600"
                          }`}
                        >
                          {t.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
                {activeTemplate ? (
                  <Text className="mt-2 text-[11px] text-purple-700">
                    Template applied — edit any field to customize.
                  </Text>
                ) : null}
              </View>

              {/* Title */}
              <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Title
              </Text>
              <TextInput
                value={title}
                onChangeText={(v) => {
                  setTitle(v);
                  setActiveTemplate(null);
                }}
                placeholder="e.g. Routine cleaning"
                placeholderTextColor="#94a3b8"
                className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              />

              {/* Description */}
              <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Description
              </Text>
              <TextInput
                value={description}
               onChangeText={(v) => {
                  setDescription(v);
                  setActiveTemplate(null);
                }}
                placeholder="Clinical findings, treatment performed…"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className="mb-4 min-h-[100] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              />

              {/* Date */}
              <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Date
              </Text>
              <TextInput
                value={sessionDate}
                onChangeText={setSessionDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor="#94a3b8"
                autoCapitalize="none"
                autoCorrect={false}
                className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              />

              {/* Status */}
              <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Status
              </Text>
              <View className="mb-4 flex-row rounded-2xl bg-slate-100 p-1">
                {STATUSES.map((s) => {
                  const active = status === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setStatus(s)}
                      className={`flex-1 rounded-xl py-2.5 ${
                        active ? "bg-white" : ""
                      }`}
                    >
                      <Text
                        className={`text-center text-[11px] font-bold ${
                          active ? "text-purple-800" : "text-slate-500"
                        }`}
                      >
                        {s === "IN PROGRESS"
                          ? "In Progress"
                          : s.charAt(0) + s.slice(1).toLowerCase()}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Next steps */}
              <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Next steps
              </Text>
              <TextInput
                value={nextSteps}
                onChangeText={(v) => {
                  setNextSteps(v);
                  setActiveTemplate(null);
                }}
                placeholder="e.g. Return in 6 months"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                className="mb-6 min-h-[60] rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
              />

              {/* Save */}
              <Pressable
                onPress={handleSave}
                disabled={busy}
                className={`h-12 items-center justify-center rounded-2xl ${
                  busy ? "bg-purple-400" : "bg-purple-700"
                }`}
              >
                {busy ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-base font-bold text-white">
                    Save check-up
                  </Text>
                )}
              </Pressable>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}