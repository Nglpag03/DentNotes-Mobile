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
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import type { Session, SessionStatus } from "../types";
import { SESSION_TEMPLATES } from "../lib/sessionTemplates";
import { statusColors } from "../lib/theme";

interface Props {
  visible: boolean;
  patientId: string;
  session?: Session | null;
  onClose: () => void;
  onSaved: () => void;
}

const STATUSES: SessionStatus[] = ["PLANNED", "IN PROGRESS", "COMPLETED"];

const STATUS_LABEL: Record<SessionStatus, string> = {
  PLANNED: "Planned",
  "IN PROGRESS": "In Progress",
  COMPLETED: "Completed",
};

const ROOM_PRESETS = [
  "Room 1",
  "Room 2",
  "Room 3",
  "Chair 1",
  "Chair 2",
  "Suite A",
];

export default function SessionFormModal({
  visible,
  patientId,
  session: editingSession,
  onClose,
  onSaved,
}: Props) {
  const { session: authSession } = useAuth();
  const { isDark } = useTheme();
  const isEdit = !!editingSession;

  const [title, setTitle] = useState(editingSession?.title ?? "");
  const [description, setDescription] = useState(
    editingSession?.description ?? "",
  );
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (editingSession?.session_date)
      return parseISO(editingSession.session_date);
    return new Date();
  });
  const [selectedTime, setSelectedTime] = useState<Date>(() => {
    if (editingSession?.session_date)
      return parseISO(editingSession.session_date);
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [status, setStatus] = useState<SessionStatus>(
    editingSession?.status ?? "PLANNED",
  );
  const [nextSteps, setNextSteps] = useState(editingSession?.next_steps ?? "");
  const [room, setRoom] = useState(editingSession?.room ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  // Theme tokens
  const sheetBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const inputBg = isDark ? "bg-[#252033]" : "bg-purple-50";
  const inputText = isDark ? "text-white" : "text-slate-900";
  const inputBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const labelText = isDark ? "text-slate-400" : "text-slate-500";
  const chipBg = isDark ? "bg-[#252033]" : "bg-purple-100";
  const chipText = isDark ? "text-purple-200" : "text-purple-800";
  const statusTrack = isDark ? "bg-[#252033]" : "bg-purple-100";
  const footerBorder = isDark ? "border-slate-800" : "border-slate-100";
  const cancelBg = isDark ? "bg-[#252033]" : "bg-purple-100";
  const cancelText = isDark ? "text-purple-200" : "text-purple-800";

  function onDateChange(event: DateTimePickerEvent, date?: Date) {
    setShowDatePicker(false);
    if (event.type === "set" && date) setSelectedDate(date);
  }

  function onTimeChange(event: DateTimePickerEvent, time?: Date) {
    setShowTimePicker(false);
    if (event.type === "set" && time) setSelectedTime(time);
  }

  function reset() {
    setTitle("");
    setDescription("");
    setSelectedDate(new Date());
    const t = new Date();
    t.setHours(9, 0, 0, 0);
    setSelectedTime(t);
    setStatus("PLANNED");
    setNextSteps("");
    setRoom("");
    setError("");
    setBusy(false);
    setActiveTemplate(null);
  }

  function applyTemplate(id: string) {
    const t = SESSION_TEMPLATES.find((x) => x.id === id);
    if (!t) return;

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

    const combined = new Date(selectedDate);
    combined.setHours(
      selectedTime.getHours(),
      selectedTime.getMinutes(),
      0,
      0,
    );
    const isoDate = combined.toISOString();

    const payload = {
      patient_id: patientId,
      title: title.trim(),
      description: description.trim(),
      session_date: isoDate,
      status,
      next_steps: nextSteps.trim() || null,
      room: room.trim() || null,
      user_id: authSession?.user.id,
    };

    const { error: insertError } = isEdit
      ? await supabase
          .from("sessions")
          .update(payload)
          .eq("id", editingSession!.id)
      : await supabase.from("sessions").insert(payload);

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
      <View className="flex-1 justify-end">
        {/* Blurred backdrop */}
        <Pressable onPress={handleClose} className="absolute inset-0">
          <BlurView
            intensity={Platform.OS === "ios" ? 60 : 100}
            tint="dark"
            style={{ flex: 1 }}
          />
          <View className="absolute inset-0 bg-purple-950/40" />
        </Pressable>

        {/* Sheet */}
        <View className={`h-[94%] rounded-t-[32px] ${sheetBg}`}>
          {/* Hero header */}
          <View className="rounded-t-[32px] bg-purple-800 px-6 pb-20 pt-8">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-3xl font-extrabold text-white">
                  {isEdit ? "Edit check-up" : "New check-up"}
                </Text>
                <Text className="mt-2 text-xs text-purple-200">
                  {isEdit
                    ? "Update this clinical note"
                    : "Record a clinical note in seconds"}
                </Text>
              </View>
              <Pressable
                onPress={handleClose}
                className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
              >
                <Feather name="x" size={20} color="#ffffff" />
              </Pressable>
            </View>
          </View>

          {/* Floating icon badge */}
          <View className="-mt-12 items-center">
            <View
              className={`h-24 w-24 items-center justify-center rounded-full ${sheetBg}`}
              style={{
                borderWidth: 5,
                borderColor: isDark ? "#1a1525" : "#ffffff",
                shadowColor: "#7c3aed",
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              <Feather
                name={isEdit ? "edit-2" : "file-text"}
                size={32}
                color="#7c3aed"
              />
            </View>
          </View>

          {/* Body + Footer */}
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="flex-1"
          >
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: 24,
                paddingTop: 8,
                paddingBottom: 32,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              className="flex-1"
            >
              {error ? (
                <View className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                  <Text className="text-sm text-red-700">{error}</Text>
                </View>
              ) : null}

              {/* Quick templates */}
              <Text className={`mb-3 text-xs font-bold ${labelText}`}>
                Quick templates
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                className="mb-3"
              >
                {SESSION_TEMPLATES.map((t) => {
                  const active = activeTemplate === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => applyTemplate(t.id)}
                      className={`flex-row items-center gap-1.5 rounded-full px-3 py-2.5 ${
                        active ? "bg-purple-800" : chipBg
                      }`}
                    >
                      <Text className="text-sm">{t.emoji}</Text>
                      <Text
                        className={`text-xs font-bold ${
                          active ? "text-white" : chipText
                        }`}
                      >
                        {t.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
              {activeTemplate ? (
                <Text className="mb-5 text-[11px] text-purple-500">
                  Template applied — edit any field to customize.
                </Text>
              ) : (
                <View className="mb-3" />
              )}

              {/* Title */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>Title</Text>
              <TextInput
                value={title}
                onChangeText={(v) => {
                  setTitle(v);
                  setActiveTemplate(null);
                }}
                placeholder="e.g. Routine cleaning"
                placeholderTextColor="#94a3b8"
                className={`mb-5 rounded-2xl border px-4 py-4 text-sm ${inputBg} ${inputText} ${inputBorder}`}
              />

              {/* Description */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>
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
                className={`mb-5 min-h-[110] rounded-2xl border px-4 py-4 text-sm ${inputBg} ${inputText} ${inputBorder}`}
              />

              {/* Date + Time row */}
              <View className="mb-5 flex-row gap-3">
                <View className="flex-1">
                  <Text className={`mb-2 text-xs font-bold ${labelText}`}>
                    Date
                  </Text>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    className={`flex-row items-center gap-2 rounded-2xl border px-4 py-4 ${inputBg} ${inputBorder}`}
                  >
                    <Feather name="calendar" size={16} color="#7c3aed" />
                    <Text className={`flex-1 text-sm ${inputText}`}>
                      {format(selectedDate, "MMM d, yyyy")}
                    </Text>
                  </Pressable>
                </View>

                <View className="flex-1">
                  <Text className={`mb-2 text-xs font-bold ${labelText}`}>
                    Time
                  </Text>
                  <Pressable
                    onPress={() => setShowTimePicker(true)}
                    className={`flex-row items-center gap-2 rounded-2xl border px-4 py-4 ${inputBg} ${inputBorder}`}
                  >
                    <Feather name="clock" size={16} color="#7c3aed" />
                    <Text className={`flex-1 text-sm ${inputText}`}>
                      {format(selectedTime, "h:mm a")}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Native pickers */}
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === "ios" ? "inline" : "default"}
                  onChange={onDateChange}
                  themeVariant={isDark ? "dark" : "light"}
                />
              )}

              {showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onTimeChange}
                  themeVariant={isDark ? "dark" : "light"}
                />
              )}

              {/* Room */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>
                Room / Location
              </Text>
              <TextInput
                value={room}
                onChangeText={setRoom}
                placeholder="e.g. Room 1, Chair 2, Suite A"
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
                className={`mb-3 rounded-2xl border px-4 py-4 text-sm ${inputBg} ${inputText} ${inputBorder}`}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
                className="mb-5"
              >
                {ROOM_PRESETS.map((r) => {
                  const active = room === r;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setRoom(active ? "" : r)}
                      className={`rounded-full px-3.5 py-2 ${
                        active ? "bg-purple-800" : chipBg
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-bold ${
                          active ? "text-white" : chipText
                        }`}
                      >
                        {r}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Status */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>
                Status
              </Text>
              <View className={`mb-5 flex-row rounded-full p-1.5 ${statusTrack}`}>
                {STATUSES.map((s) => {
                  const active = status === s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => setStatus(s)}
                      style={
                        active
                          ? { backgroundColor: statusColors[s]?.bg }
                          : undefined
                      }
                      className="flex-1 items-center rounded-full py-3"
                    >
                      <Text
                        style={
                          active
                            ? { color: statusColors[s]?.text }
                            : undefined
                        }
                        className={`text-[11px] font-bold ${
                          active ? "" : labelText
                        }`}
                      >
                        {STATUS_LABEL[s]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Next steps */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>
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
                className={`min-h-[70] rounded-2xl border px-4 py-4 text-sm ${inputBg} ${inputText} ${inputBorder}`}
              />
            </ScrollView>

            {/* Fixed footer */}
            <View className={`border-t px-6 py-4 ${footerBorder}`}>
              <View className="flex-row gap-3">
                <Pressable
                  onPress={handleClose}
                  className={`flex-1 items-center justify-center rounded-full py-4 ${cancelBg}`}
                >
                  <Text className={`text-sm font-bold ${cancelText}`}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={busy}
                  className={`flex-1 items-center justify-center rounded-full py-4 ${
                    busy ? "bg-purple-400" : "bg-purple-800"
                  }`}
                >
                  {busy ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text className="text-sm font-bold text-white">
                      {isEdit ? "Update" : "Save"}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </View>
    </Modal>
  );
}