import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { format } from "date-fns";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

type FieldName = "title" | "description";

// A malformed date from the server must not crash the form.
function safeParse(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

export default function SessionFormModal({
  visible,
  patientId,
  session: editingSession,
  onClose,
  onSaved,
}: Props) {
  const { session: authSession } = useAuth();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const isEdit = !!editingSession;

  const [title, setTitle] = useState(editingSession?.title ?? "");
  const [description, setDescription] = useState(
    editingSession?.description ?? "",
  );
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    return safeParse(editingSession?.session_date) ?? new Date();
  });
  const [selectedTime, setSelectedTime] = useState<Date>(() => {
    const existing = safeParse(editingSession?.session_date);
    if (existing) return existing;
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
  const [errorField, setErrorField] = useState<FieldName | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const titleRef = useRef<TextInput>(null);
  const descriptionRef = useRef<TextInput>(null);
  const saving = useRef(false);

  // What the form looked like when it opened, so we can tell whether the
  // user has typed anything worth protecting.
  const initial = useRef({
    title: (editingSession?.title ?? "").trim(),
    description: (editingSession?.description ?? "").trim(),
    nextSteps: (editingSession?.next_steps ?? "").trim(),
    room: (editingSession?.room ?? "").trim(),
    status: editingSession?.status ?? ("PLANNED" as SessionStatus),
    dateKey: format(selectedDate, "yyyy-MM-dd"),
    timeKey: format(selectedTime, "HH:mm"),
  });

  const isDirty =
    title.trim() !== initial.current.title ||
    description.trim() !== initial.current.description ||
    nextSteps.trim() !== initial.current.nextSteps ||
    room.trim() !== initial.current.room ||
    status !== initial.current.status ||
    format(selectedDate, "yyyy-MM-dd") !== initial.current.dateKey ||
    format(selectedTime, "HH:mm") !== initial.current.timeKey;

  // Theme tokens
  const sheetBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const inputBg = isDark ? "bg-[#252033]" : "bg-purple-50";
  const inputText = isDark ? "text-white" : "text-slate-900";
  const inputBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const invalidBorder = isDark ? "border-red-500/70" : "border-red-300";
  const labelText = isDark ? "text-slate-400" : "text-slate-500";
  const chipBg = isDark ? "bg-[#252033]" : "bg-purple-100";
  const chipText = isDark ? "text-purple-200" : "text-purple-800";
  const statusTrack = isDark ? "bg-[#252033]" : "bg-purple-100";
  const footerBorder = isDark ? "border-slate-800" : "border-slate-100";
  const cancelBg = isDark ? "bg-[#252033]" : "bg-purple-100";
  const cancelText = isDark ? "text-purple-200" : "text-purple-800";

  const titleBorder = errorField === "title" ? invalidBorder : inputBorder;
  const descriptionBorder =
    errorField === "description" ? invalidBorder : inputBorder;
  
function onDateChange(event: DateTimePickerEvent, date?: Date) {
  if (Platform.OS === "android") setShowDatePicker(false);
  if (event.type === "set" && date) setSelectedDate(date);
}

function onTimeChange(event: DateTimePickerEvent, date?: Date) {
  if (Platform.OS === "android") setShowTimePicker(false);
  if (event.type === "set" && date) setSelectedTime(date);
}

  function openDatePicker() {
    setShowTimePicker(false);
    setShowDatePicker(true);
  }

  function openTimePicker() {
    setShowDatePicker(false);
    setShowTimePicker(true);
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
    setErrorField(null);
    setBusy(false);
    setActiveTemplate(null);
    setShowDatePicker(false);
    setShowTimePicker(false);
  }

  function doApplyTemplate(id: string) {
    const t = SESSION_TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setActiveTemplate(id);
    setTitle(t.title);
    setDescription(t.description);
    setNextSteps(t.next_steps ?? "");
    setError("");
    setErrorField(null);
  }

  function applyTemplate(id: string) {
    if (activeTemplate === id) {
      setActiveTemplate(null);
      setTitle("");
      setDescription("");
      setNextSteps("");
      return;
    }

    // Don't silently wipe text the user already wrote.
    const hasOwnText =
      !activeTemplate &&
      (title.trim() || description.trim() || nextSteps.trim());

    if (hasOwnText) {
      Alert.alert(
        "Replace your text?",
        "Applying a template will replace the title, description and next steps you've already entered.",
        [
          { text: "Keep my text", style: "cancel" },
          { text: "Replace", style: "destructive", onPress: () => doApplyTemplate(id) },
        ],
      );
      return;
    }

    doApplyTemplate(id);
  }

  // Show the problem where the user can see it: scroll the message into
  // view, mark the field, and put the cursor in it. (The Save button is
  // pinned at the bottom, so before, an error at the top of a scrolled
  // form was easy to miss entirely.)
  function fail(message: string, field?: FieldName) {
    setError(message);
    setErrorField(field ?? null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    if (field === "title") titleRef.current?.focus();
    if (field === "description") descriptionRef.current?.focus();
  }

  async function handleSave() {
    if (saving.current) return;

    if (!title.trim()) {
      fail("Title is required.", "title");
      return;
    }
    if (!description.trim()) {
      fail("Description is required.", "description");
      return;
    }

    saving.current = true;
    setBusy(true);
    setError("");
    setErrorField(null);

    const combined = new Date(selectedDate);
    combined.setHours(
      selectedTime.getHours(),
      selectedTime.getMinutes(),
      0,
      0,
    );

    const fields = {
      title: title.trim(),
      description: description.trim(),
      session_date: combined.toISOString(),
      status,
      next_steps: nextSteps.trim() || null,
      room: room.trim() || null,
    };

    try {
      const { error: saveError } = isEdit
        ? // Editing must not change who created the check-up.
          await supabase
            .from("sessions")
            .update(fields)
            .eq("id", editingSession!.id)
        : await supabase.from("sessions").insert({
            ...fields,
            patient_id: patientId,
            user_id: authSession?.user.id,
          });

      if (saveError) {
        console.error("Check-up save failed:", saveError.message);
        fail(
          "Couldn't save this check-up. Please check your connection and try again.",
        );
        return;
      }

      reset();
      onSaved();
      onClose();
    } catch (e) {
      console.error("Check-up save failed:", e);
      fail(
        "Couldn't save this check-up. Please check your connection and try again.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }

  function closeNow() {
    reset();
    onClose();
  }

  // Closing by accident (backdrop tap, X, Android back) used to throw
  // away everything typed. Now it asks first, but only if there is
  // something to lose.
  function handleClose() {
    if (busy) return;

    if (!isDirty) {
      closeNow();
      return;
    }

    Alert.alert(
      "Discard changes?",
      isEdit
        ? "Your edits to this check-up won't be saved."
        : "This check-up hasn't been saved yet.",
      [
        { text: "Keep editing", style: "cancel" },
        { text: "Discard", style: "destructive", onPress: closeNow },
      ],
    );
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
        <Pressable
          onPress={handleClose}
          accessibilityLabel="Close form"
          className="absolute inset-0"
        >
          <BlurView
            intensity={Platform.OS === "ios" ? 60 : 30}
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
                <Text
                  accessibilityRole="header"
                  className="text-3xl font-extrabold text-white"
                >
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
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
                className="h-10 w-10 items-center justify-center rounded-full bg-white/10 active:opacity-70"
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
              ref={scrollRef}
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
                <View
                  accessibilityRole="alert"
                  accessibilityLiveRegion="assertive"
                  className={`mb-4 rounded-2xl border px-4 py-3 ${
                    isDark
                      ? "border-red-900/40 bg-red-950/40"
                      : "border-red-100 bg-red-50"
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      isDark ? "text-red-300" : "text-red-700"
                    }`}
                  >
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Quick templates */}
              <Text className={`mb-3 text-xs font-bold ${labelText}`}>
                Quick templates
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
                className="mb-3"
              >
                {SESSION_TEMPLATES.map((t) => {
                  const active = activeTemplate === t.id;
                  return (
                    <Pressable
                      key={t.id}
                      onPress={() => applyTemplate(t.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`${t.label} template`}
                      accessibilityState={{ selected: active }}
                      className={`flex-row items-center gap-1.5 rounded-full px-3 py-2.5 active:opacity-80 ${
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
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>
                Title <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                ref={titleRef}
                value={title}
                onChangeText={(v) => {
                  setTitle(v);
                  setActiveTemplate(null);
                  if (errorField === "title") {
                    setErrorField(null);
                    setError("");
                  }
                }}
                accessibilityLabel="Title, required"
                placeholder="e.g. Routine cleaning"
                placeholderTextColor="#94a3b8"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => descriptionRef.current?.focus()}
                className={`mb-5 rounded-2xl border px-4 py-4 text-sm ${inputBg} ${inputText} ${titleBorder}`}
              />

              {/* Description */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>
                Description <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                ref={descriptionRef}
                value={description}
                onChangeText={(v) => {
                  setDescription(v);
                  setActiveTemplate(null);
                  if (errorField === "description") {
                    setErrorField(null);
                    setError("");
                  }
                }}
                accessibilityLabel="Description, required"
                placeholder="Clinical findings, treatment performed…"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className={`mb-5 min-h-[110] rounded-2xl border px-4 py-4 text-sm ${inputBg} ${inputText} ${descriptionBorder}`}
              />

              {/* Date + Time row */}
              <View className="mb-5 flex-row gap-3">
                <View className="flex-1">
                  <Text className={`mb-2 text-xs font-bold ${labelText}`}>
                    Date
                  </Text>
                  <Pressable
                    onPress={openDatePicker}
                    accessibilityRole="button"
                    accessibilityLabel={`Date, ${format(selectedDate, "EEEE, MMMM d, yyyy")}`}
                    accessibilityHint="Opens the date picker"
                    className={`flex-row items-center gap-2 rounded-2xl border px-4 py-4 active:opacity-80 ${inputBg} ${inputBorder}`}
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
                    onPress={openTimePicker}
                    accessibilityRole="button"
                    accessibilityLabel={`Time, ${format(selectedTime, "h:mm a")}`}
                    accessibilityHint="Opens the time picker"
                    className={`flex-row items-center gap-2 rounded-2xl border px-4 py-4 active:opacity-80 ${inputBg} ${inputBorder}`}
                  >
                    <Feather name="clock" size={16} color="#7c3aed" />
                    <Text className={`flex-1 text-sm ${inputText}`}>
                      {format(selectedTime, "h:mm a")}
                    </Text>
                  </Pressable>
                </View>
              </View>

              {/* Native pickers.
                  Android shows its own dialog (the extra "Done" button and
                  wrapper used to sit behind it), iOS shows them inline. */}
{showDatePicker && Platform.OS === "android" && (
  <DateTimePicker
    value={selectedDate}
    mode="date"
    onChange={onDateChange}
  />
)}
{showDatePicker && Platform.OS === "ios" && (
  <View className="mb-5">
    <DateTimePicker
      value={selectedDate}
      mode="date"
      display="inline"
      onChange={onDateChange}
      themeVariant={isDark ? "dark" : "light"}
    />
    <Pressable
      onPress={() => setShowDatePicker(false)}
      accessibilityRole="button"
      accessibilityLabel="Done choosing date"
      className="mt-2 items-center rounded-full bg-purple-800 py-3 active:opacity-80"
    >
      <Text className="text-sm font-bold text-white">Done</Text>
    </Pressable>
  </View>
)}

{showTimePicker && Platform.OS === "android" && (
  <DateTimePicker
    value={selectedTime}
    mode="time"
    onChange={onTimeChange}
  />
)}
{showTimePicker && Platform.OS === "ios" && (
  <View className="mb-5">
    <DateTimePicker
      value={selectedTime}
      mode="time"
      display="spinner"
      minuteInterval={5}
      onChange={onTimeChange}
      themeVariant={isDark ? "dark" : "light"}
    />
      <Pressable
        onPress={() => setShowTimePicker(false)}
        accessibilityRole="button"
        accessibilityLabel="Done choosing time"
        className="mt-2 items-center rounded-full bg-purple-800 py-3 active:opacity-80"
      >
        <Text className="text-sm font-bold text-white">Done</Text>
      </Pressable>
  </View>
)}

              {/* Room */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>
                Room / Location
              </Text>
              <TextInput
                value={room}
                onChangeText={setRoom}
                accessibilityLabel="Room or location"
                placeholder="e.g. Room 1, Chair 2, Suite A"
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
                className={`mb-3 rounded-2xl border px-4 py-4 text-sm ${inputBg} ${inputText} ${inputBorder}`}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ gap: 6, paddingVertical: 4 }}
                className="mb-5"
              >
                {ROOM_PRESETS.map((r) => {
                  const active = room === r;
                  return (
                    <Pressable
                      key={r}
                      onPress={() => setRoom(active ? "" : r)}
                      accessibilityRole="button"
                      accessibilityLabel={r}
                      accessibilityState={{ selected: active }}
                      className={`rounded-full px-3.5 py-2 active:opacity-80 ${
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
                      accessibilityRole="button"
                      accessibilityLabel={`Status: ${STATUS_LABEL[s]}`}
                      accessibilityState={{ selected: active }}
                      style={
                        active
                          ? { backgroundColor: statusColors[s]?.bg }
                          : undefined
                      }
                      className="flex-1 items-center rounded-full py-3 active:opacity-80"
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
                accessibilityLabel="Next steps"
                placeholder="e.g. Return in 6 months"
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                className={`min-h-[70] rounded-2xl border px-4 py-4 text-sm ${inputBg} ${inputText} ${inputBorder}`}
              />
            </ScrollView>

            {/* Fixed footer */}
            <View
              className={`border-t px-6 pt-4 ${footerBorder}`}
              // Keeps the buttons clear of the iPhone home indicator.
              style={{ paddingBottom: Math.max(16, insets.bottom) }}
            >
              <View className="flex-row gap-3">
                <Pressable
                  onPress={handleClose}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  className={`flex-1 items-center justify-center rounded-full py-4 active:opacity-80 ${cancelBg}`}
                >
                  <Text className={`text-sm font-bold ${cancelText}`}>
                    Cancel
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleSave}
                  disabled={busy}
                  accessibilityRole="button"
                  accessibilityLabel={isEdit ? "Update check-up" : "Save check-up"}
                  accessibilityState={{ disabled: busy, busy }}
                  className={`flex-1 items-center justify-center rounded-full py-4 ${
                    busy ? "bg-purple-400" : "bg-purple-800 active:opacity-90"
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