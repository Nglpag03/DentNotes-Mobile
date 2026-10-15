import { useEffect, useRef, useState } from "react";
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
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

type FieldName = "name" | "phone" | "email" | "age";

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export default function PatientFormModal({ visible, onClose, onSaved }: Props) {
  const { session } = useAuth();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [age, setAge] = useState("");
  // No default: pre-selecting "Female" recorded a gender nobody chose.
  const [gender, setGender] = useState("");
  const [reasons, setReasons] = useState<string[]>([]);
  const [allergies, setAllergies] = useState("");
  const [medications, setMedications] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [errorField, setErrorField] = useState<FieldName | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const nameRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const ageRef = useRef<TextInput>(null);
  const allergiesRef = useRef<TextInput>(null);
  const medicationsRef = useRef<TextInput>(null);
  const saving = useRef(false);

  // Theme tokens
  const sheetBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const labelText = isDark ? "text-slate-400" : "text-slate-500";
  const inputBg = isDark ? "bg-[#252033]" : "bg-purple-50";
  const inputText = isDark ? "text-white" : "text-slate-900";
  const inputBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const invalidBorder = isDark ? "border-red-500/70" : "border-red-300";
  const chipBg = isDark ? "bg-[#252033]" : "bg-purple-100";
  const chipText = isDark ? "text-purple-200" : "text-purple-800";
  const cancelBg = isDark ? "bg-[#252033]" : "bg-purple-100";
  const cancelText = isDark ? "text-purple-200" : "text-purple-800";
  const trackBg = isDark ? "bg-[#252033]" : "bg-purple-100";
  const footerBorder = isDark ? "border-slate-800" : "border-slate-100";

  const borderFor = (field: FieldName) =>
    errorField === field ? invalidBorder : inputBorder;

  const isDirty =
    fullName.trim() !== "" ||
    phone.trim() !== "" ||
    email.trim() !== "" ||
    age !== "" ||
    gender !== "" ||
    reasons.length > 0 ||
    allergies.trim() !== "" ||
    medications.trim() !== "" ||
    notes.trim() !== "";

  // Open with the cursor already in the name field. The short delay lets
  // the slide-in animation finish first.
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => nameRef.current?.focus(), 350);
    return () => clearTimeout(timer);
  }, [visible]);

  function reset() {
    setFullName("");
    setPhone("");
    setEmail("");
    setAge("");
    setGender("");
    setReasons([]);
    setAllergies("");
    setMedications("");
    setNotes("");
    setError("");
    setErrorField(null);
    setBusy(false);
  }

  // Editing a field that has an error clears that error.
  function clearErrorFor(field: FieldName) {
    if (errorField === field) {
      setErrorField(null);
      setError("");
    }
  }

  function toggleReason(reason: string) {
    setReasons((prev) =>
      prev.includes(reason)
        ? prev.filter((r) => r !== reason)
        : [...prev, reason],
    );
  }

  // Show the problem where the user can see it: scroll the message into
  // view, mark the field, and put the cursor in it. (Save is pinned at the
  // bottom, so an error at the top of a scrolled form was easy to miss.)
  function fail(message: string, field?: FieldName) {
    setError(message);
    setErrorField(field ?? null);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    const refs = {
      name: nameRef,
      phone: phoneRef,
      email: emailRef,
      age: ageRef,
    };
    if (field) refs[field].current?.focus();
  }

  // Case-insensitive exact match on first + last name.
  async function findDuplicate(first: string, last: string) {
    try {
      const esc = (v: string) => v.replace(/[\\%_]/g, "\\$&");
      let query = supabase
        .from("patients")
        .select("id")
        .ilike("first_name", esc(first))
        .limit(1);
      if (last) query = query.ilike("last_name", esc(last));

      const { data, error: dupError } = await query;
      if (dupError) return false; // never block saving because of this check
      return (data?.length ?? 0) > 0;
    } catch {
      return false;
    }
  }

  function confirmDuplicate(name: string) {
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        "Patient may already exist",
        `A patient named "${name}" is already on record. Add another one anyway?`,
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Add anyway", onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
  }

  async function handleSave() {
    if (saving.current) return;

    // Validate in the order the fields appear on screen.
    if (!fullName.trim()) {
      fail("Full name is required.", "name");
      return;
    }

    if (phone.trim()) {
      const digits = phone.replace(/\D/g, "");
      if (digits.length < 7 || digits.length > 15) {
        fail("Please enter a valid phone number.", "phone");
        return;
      }
    }

    if (email.trim() && !isValidEmail(email)) {
      fail("Please enter a valid email address.", "email");
      return;
    }

    let ageValue: number | null = null;
    if (age !== "") {
      ageValue = parseInt(age, 10);
      if (isNaN(ageValue) || ageValue < 0 || ageValue > 120) {
        fail("Please enter a valid age (0–120).", "age");
        return;
      }
    }

    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.slice(1).join(" ") || "";

    saving.current = true;
    setBusy(true);
    setError("");
    setErrorField(null);

    try {
      // Receptionists often re-enter someone who is already on file.
      if (await findDuplicate(firstName, lastName)) {
        const proceed = await confirmDuplicate(fullName.trim());
        if (!proceed) return;
      }

      const { error: insertError } = await supabase.from("patients").insert({
        first_name: firstName,
        last_name: lastName,
        phone: phone.trim() || null,
        email: email.trim().toLowerCase() || null,
        age: ageValue,
        gender: gender || null,
        condition: reasons.join(", "),
        allergies: allergies.trim() || null,
        medications: medications.trim() || null,
        notes: notes.trim() || null,
        user_id: session?.user.id,
      });

      if (insertError) {
        console.error("Patient save failed:", insertError.message);
        fail(
          "Couldn't save this patient. Please check your connection and try again.",
        );
        return;
      }

      reset();
      onSaved();
      onClose();
    } catch (e) {
      console.error("Patient save failed:", e);
      fail(
        "Couldn't save this patient. Please check your connection and try again.",
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

  // Closing by accident (backdrop tap, X, Android back) used to throw away
  // everything typed. Now it asks first, but only if there is something
  // to lose.
  function handleClose() {
    if (busy) return;

    if (!isDirty) {
      closeNow();
      return;
    }

    Alert.alert(
      "Discard this patient?",
      "The details you entered won't be saved.",
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
            className="flex-1"
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
                  New patient
                </Text>
                <Text className="mt-2 text-xs text-purple-200">
                  Create a record in seconds
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
              <Feather name="user-plus" size={32} color="#7c3aed" />
            </View>
          </View>

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

              {/* Full name */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>
                Full name <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                ref={nameRef}
                value={fullName}
                onChangeText={(v) => {
                  setFullName(v);
                  clearErrorFor("name");
                }}
                accessibilityLabel="Full name, required"
                placeholder="e.g. Maya Thompson"
                placeholderTextColor="#94a3b8"
                autoCapitalize="words"
                returnKeyType="next"
                blurOnSubmit={false}
                onSubmitEditing={() => phoneRef.current?.focus()}
                className={`mb-5 rounded-2xl border px-4 py-4 text-sm ${inputBg} ${inputText} ${borderFor("name")}`}
              />

              {/* Phone */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>Phone</Text>
              <View
                className={`mb-5 flex-row items-center gap-3 rounded-2xl border px-4 ${inputBg} ${borderFor("phone")}`}
              >
                <Feather name="phone" size={16} color="#7c3aed" />
                <TextInput
                  ref={phoneRef}
                  value={phone}
                  onChangeText={(v) => {
                    setPhone(v);
                    clearErrorFor("phone");
                  }}
                  accessibilityLabel="Phone"
                  placeholder="+63 917 123 4567"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                  autoComplete="off"
                  className={`flex-1 py-4 text-sm ${inputText}`}
                />
              </View>

              {/* Email */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>Email</Text>
              <View
                className={`mb-5 flex-row items-center gap-3 rounded-2xl border px-4 ${inputBg} ${borderFor("email")}`}
              >
                <Feather name="mail" size={16} color="#7c3aed" />
                <TextInput
                  ref={emailRef}
                  value={email}
                  onChangeText={(v) => {
                    setEmail(v);
                    clearErrorFor("email");
                  }}
                  accessibilityLabel="Email"
                  placeholder="name@mail.com"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => ageRef.current?.focus()}
                  className={`flex-1 py-4 text-sm ${inputText}`}
                />
              </View>

              {/* Age */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>Age</Text>
              <TextInput
                ref={ageRef}
                value={age}
                // Digits only (Android's number pad also offers "." and "-").
                onChangeText={(v) => {
                  setAge(v.replace(/\D/g, ""));
                  clearErrorFor("age");
                }}
                accessibilityLabel="Age"
                placeholder="e.g. 32"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                maxLength={3}
                className={`mb-5 rounded-2xl border px-4 py-4 text-sm ${inputBg} ${inputText} ${borderFor("age")}`}
              />

              {/* Gender */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>
                Gender
              </Text>
              <View className={`mb-5 flex-row rounded-full p-1.5 ${trackBg}`}>
                {GENDERS.map((g) => {
                  const active = gender === g;
                  return (
                    <Pressable
                      key={g}
                      // Tap the selected option again to clear it.
                      onPress={() => setGender(active ? "" : g)}
                      accessibilityRole="button"
                      accessibilityLabel={`Gender: ${g}`}
                      accessibilityState={{ selected: active }}
                      className={`flex-1 items-center rounded-full py-3 active:opacity-80 ${
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
              <Text className={`mb-3 text-xs font-bold ${labelText}`}>
                Reason for visit
              </Text>
              <View className="mb-5 flex-row flex-wrap gap-2.5">
                {REASONS.map((r) => {
                  const active = reasons.includes(r);
                  return (
                    <Pressable
                      key={r}
                      onPress={() => toggleReason(r)}
                      accessibilityRole="button"
                      accessibilityLabel={r}
                      accessibilityState={{ selected: active }}
                      className={`rounded-full px-4 py-2.5 active:opacity-80 ${
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

              {/* Allergies: safety-critical, so it has its own field and
                  shows up highlighted on the patient's record. */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>
                Allergies
              </Text>
              <View
                className={`mb-5 flex-row items-center gap-3 rounded-2xl border px-4 ${inputBg} ${inputBorder}`}
              >
                <Feather name="alert-triangle" size={16} color="#7c3aed" />
                <TextInput
                  ref={allergiesRef}
                  value={allergies}
                  onChangeText={setAllergies}
                  accessibilityLabel="Allergies"
                  placeholder="e.g. Penicillin, latex"
                  placeholderTextColor="#94a3b8"
                  returnKeyType="next"
                  blurOnSubmit={false}
                  onSubmitEditing={() => medicationsRef.current?.focus()}
                  className={`flex-1 py-4 text-sm ${inputText}`}
                />
              </View>

              {/* Medications */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>
                Current medications
              </Text>
              <View
                className={`mb-5 flex-row items-center gap-3 rounded-2xl border px-4 ${inputBg} ${inputBorder}`}
              >
                <Feather name="clipboard" size={16} color="#7c3aed" />
                <TextInput
                  ref={medicationsRef}
                  value={medications}
                  onChangeText={setMedications}
                  accessibilityLabel="Current medications"
                  placeholder="e.g. Metformin, aspirin"
                  placeholderTextColor="#94a3b8"
                  className={`flex-1 py-4 text-sm ${inputText}`}
                />
              </View>

              {/* Notes */}
              <Text className={`mb-2 text-xs font-bold ${labelText}`}>Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                accessibilityLabel="Notes"
                placeholder="Medical history, anything else to remember..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                className={`min-h-[110] rounded-2xl border px-4 py-4 text-sm ${inputBg} ${inputText} ${inputBorder}`}
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
                  accessibilityLabel="Save patient"
                  accessibilityState={{ disabled: busy, busy }}
                  className={`flex-1 items-center justify-center rounded-full py-4 ${
                    busy ? "bg-purple-400" : "bg-purple-800 active:opacity-90"
                  }`}
                >
                  {busy ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text className="text-sm font-bold text-white">
                      Save patient
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