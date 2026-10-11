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
import { Feather } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { BlurView } from "expo-blur";


interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

const REASONS = [
  "Check-up",
  "Cleaning",
  "Filling",
  "Root canal",
  "Whitening",
  "Braces",
  "Extraction",
];

const GENDERS = ["Female", "Male", "Other"];

export default function PatientFormModal({ visible, onClose, onSaved }: Props) {
  const { session } = useAuth();
  const { isDark } = useTheme();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Female");
  const [reasons, setReasons] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Theme tokens
  const sheetBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const labelText = isDark ? "text-slate-400" : "text-slate-500";
  const inputBg = isDark ? "bg-[#252033]" : "bg-purple-50";
  const inputText = isDark ? "text-white" : "text-slate-900";
  const inputBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const chipBg = isDark ? "bg-[#252033]" : "bg-purple-100";
  const chipText = isDark ? "text-purple-200" : "text-purple-800";
  const cancelBg = isDark ? "bg-[#252033]" : "bg-purple-100";
  const cancelText = isDark ? "text-purple-200" : "text-purple-800";

  function reset() {
    setFullName("");
    setPhone("");
    setEmail("");
    setAge("");
    setGender("Female");
    setReasons([]);
    setNotes("");
    setError("");
    setBusy(false);
  }

  function toggleReason(reason: string) {
    setReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason],
    );
  }

  async function handleSave() {
    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    // Split "John Doe" → first_name="John", last_name="Doe"
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ") || "";

    setBusy(true);
    setError("");

    const { error: insertError } = await supabase.from("patients").insert({
      first_name: firstName,
      last_name: lastName,
      phone: phone.trim() || null,
      email: email.trim() || null,
      age: age ? parseInt(age, 10) : null,
      gender: gender,
      condition: reasons.join(", "),
      notes: notes.trim() || null,
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
      <View className="flex-1 justify-end">
        {/* Blurred backdrop (tappable to close) */}
        <Pressable onPress={handleClose} className="absolute inset-0">
          <BlurView
            intensity={Platform.OS === "ios" ? 60 : 100}
            tint="dark"
            className="flex-1"
          />
          <View className="absolute inset-0 bg-purple-950/40" />
        </Pressable>

        {/* Sheet */}
        <View className={`h-[92%] rounded-t-[32px] ${sheetBg}`}>

          {/* Hero header */}
          <View className="rounded-t-[32px] bg-purple-800 px-6 pb-16 pt-6">
            <View className="flex-row items-start justify-between">
              <View>
                <Text className="text-2xl font-extrabold text-white">
                  New patient
                </Text>
                <Text className="mt-1 text-xs text-purple-200">
                  Create a record in seconds
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
          <View className="-mt-10 items-center">
            <View
              className={`h-20 w-20 items-center justify-center rounded-full ${sheetBg}`}
              style={{
                borderWidth: 4,
                borderColor: isDark ? "#1a1525" : "#ffffff",
              }}
            >
              <Feather name="user-plus" size={28} color="#7c3aed" />
            </View>
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            className="flex-1"
          >
            <ScrollView
              contentContainerStyle={{
                padding: 24,
                paddingTop: 16,
                paddingBottom: 24,
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

              {/* Full name */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>
                Full name
              </Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="e.g. Maya Thompson"
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
                className={`mb-4 rounded-2xl border px-4 py-3.5 text-sm ${inputBg} ${inputText} ${inputBorder}`}
              />

              {/* Phone */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>Phone</Text>
              <View
                className={`mb-4 flex-row items-center gap-2 rounded-2xl border px-4 ${inputBg} ${inputBorder}`}
              >
                <Feather name="phone" size={16} color="#7c3aed" />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+1 555 0123"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  className={`flex-1 py-3.5 text-sm ${inputText}`}
                />
              </View>

              {/* Email */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>Email</Text>
              <View
                className={`mb-4 flex-row items-center gap-2 rounded-2xl border px-4 ${inputBg} ${inputBorder}`}
              >
                <Feather name="mail" size={16} color="#7c3aed" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@mail.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  className={`flex-1 py-3.5 text-sm ${inputText}`}
                />
              </View>

              {/* Age */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>Age</Text>
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="e.g. 32"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                maxLength={3}
                className={`mb-4 rounded-2xl border px-4 py-3.5 text-sm ${inputBg} ${inputText} ${inputBorder}`}
              />

              {/* Gender */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>Gender</Text>
              <View
                className={`mb-4 flex-row rounded-full p-1 ${
                  isDark ? "bg-[#252033]" : "bg-purple-100"
                }`}
              >
                {GENDERS.map((g) => {
                  const active = gender === g;
                  return (
                    <Pressable
                      key={g}
                      onPress={() => setGender(g)}
                      className={`flex-1 items-center rounded-full py-2.5 ${
                        active ? "bg-purple-800" : ""
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          active
                            ? "text-white"
                            : isDark
                              ? "text-purple-200"
                              : "text-purple-700"
                        }`}
                      >
                        {g}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Reason for visit */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>
                Reason for visit
              </Text>
              <View className="mb-4 flex-row flex-wrap gap-2">
                {REASONS.map((r) => {
                  const active = reasons.includes(r);
                  return (
                    <Pressable
                      key={r}
                      onPress={() => toggleReason(r)}
                      className={`rounded-full px-4 py-2.5 ${
                        active ? "bg-purple-800" : chipBg
                      }`}
                    >
                      <Text
                        className={`text-xs font-bold ${
                          active ? "text-white" : chipText
                        }`}
                      >
                        {r}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Notes */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Allergies, medical history..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className={`min-h-[100] rounded-2xl border px-4 py-3.5 text-sm ${inputBg} ${inputText} ${inputBorder}`}
              />
            </ScrollView>

            {/* Fixed footer — always visible */}
            <View
              className={`border-t px-6 py-4 ${
                isDark ? "border-slate-800" : "border-slate-100"
              }`}
            >
              <View className="flex-row gap-3">
                <Pressable
                  onPress={handleClose}
                  className={`flex-1 items-center justify-center rounded-full py-4 ${cancelBg}`}
                >
                  <Text className={`text-sm font-bold ${cancelText}`}>Cancel</Text>
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
                    <Text className="text-sm font-bold text-white">Save patient</Text>
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