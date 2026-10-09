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
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function PatientFormModal({ visible, onClose, onSaved }: Props) {
  const { session } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [condition, setCondition] = useState("");
  const [allergies, setAllergies] = useState("");
  const [medications, setMedications] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setFirstName("");
    setLastName("");
    setCondition("");
    setAllergies("");
    setMedications("");
    setError("");
    setBusy(false);
  }

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      setError("First and last name are required.");
      return;
    }

    setBusy(true);
    setError("");

    const { error: insertError } = await supabase.from("patients").insert({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      condition: condition.trim() || null,
      allergies: allergies.trim() || null,
      medications: medications.trim() || null,
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
                  New patient
                </Text>
                <Text className="mt-1 text-lg font-bold text-slate-950">
                  Add a patient
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

              {/* First + Last name */}
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    First name
                  </Text>
                  <TextInput
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Jane"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="words"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Last name
                  </Text>
                  <TextInput
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Doe"
                    placeholderTextColor="#94a3b8"
                    autoCapitalize="words"
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                  />
                </View>
              </View>

              {/* Condition */}
              <View className="mt-4">
                <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Primary condition
                </Text>
                <TextInput
                  value={condition}
                  onChangeText={setCondition}
                  placeholder="e.g. Orthodontic treatment"
                  placeholderTextColor="#94a3b8"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </View>

              {/* Allergies */}
              <View className="mt-4">
                <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Allergies
                </Text>
                <TextInput
                  value={allergies}
                  onChangeText={setAllergies}
                  placeholder="e.g. Penicillin, latex"
                  placeholderTextColor="#94a3b8"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </View>

              {/* Medications */}
              <View className="mt-4">
                <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                  Medications
                </Text>
                <TextInput
                  value={medications}
                  onChangeText={setMedications}
                  placeholder="e.g. Ibuprofen 400mg"
                  placeholderTextColor="#94a3b8"
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900"
                />
              </View>

              {/* Save */}
              <Pressable
                onPress={handleSave}
                disabled={busy}
                className={`mt-6 h-12 items-center justify-center rounded-2xl ${
                  busy ? "bg-purple-400" : "bg-purple-700"
                }`}
              >
                {busy ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-base font-bold text-white">
                    Save patient
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