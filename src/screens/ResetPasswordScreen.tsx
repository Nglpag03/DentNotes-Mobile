
import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../lib/supabase";
import { Alert } from "react-native";
type Props = {
  onComplete: () => void;
};

export default function ResetPasswordScreen({ onComplete }: Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleReset() {
    if (busy) return;

    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Your password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    Keyboard.dismiss();
    setBusy(true);

    try {
      const { data, error: updateError } =
        await supabase.auth.updateUser({ password });

      if (updateError) {
        setError(
          "Unable to update your password. Your reset link may have expired. Please request a new one."
        );
        return;
      }

      if (!data.user) {
        setError(
          "Your recovery session could not be verified. Please request a new reset link."
        );
        return;
      }

    await supabase.auth.signOut();
    Alert.alert("Password updated", "You can now sign in with your new password.");
    onComplete();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 bg-[#faf8fc]">
      <StatusBar style="dark" />

      <View className="absolute inset-x-0 top-0 h-72 overflow-hidden">
        <LinearGradient
          colors={["#a855f7", "#7c3aed", "#faf8fc"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1, opacity: 0.35 }}
        />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          className="px-6"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: "center",
            paddingVertical: 28,
          }}
        >
          <View className="mb-8 items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-[22px] bg-purple-700 shadow-xl shadow-purple-900/30">
              <Text className="text-3xl">🦷</Text>
            </View>

            <Text className="text-3xl font-extrabold tracking-tight text-purple-950">
              DentNotes
            </Text>

            <Text className="mt-2 text-sm text-slate-500">
              Create a new password.
            </Text>
          </View>

          <View className="rounded-[28px] border border-purple-100 bg-white p-6 shadow-2xl shadow-purple-950/10">
            <Text className="text-xl font-bold text-slate-900">
              Reset your password
            </Text>

            <Text className="mt-1 text-sm leading-5 text-slate-500">
              Choose a new password for your DentNotes account.
            </Text>

            {message ? (
              <View className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <Text className="text-sm leading-5 text-emerald-700">
                  {message}
                </Text>
              </View>
            ) : null}

            {error ? (
              <View className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <Text className="text-sm leading-5 text-red-700">
                  {error}
                </Text>
              </View>
            ) : null}

            <Text className="mb-2 mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">
              New password
            </Text>

            <View className="h-12 flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 pr-3">
              <TextInput
                accessibilityLabel="New password"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  setError("");
                  setMessage("");
                }}
                placeholder="At least 8 characters"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
                className="h-12 flex-1 px-4 text-sm text-slate-900"
              />

              <Pressable
                onPress={() => setShowPassword((value) => !value)}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                hitSlop={10}
                className="px-1 py-2"
              >
                <Text className="text-xs font-bold text-purple-700">
                  {showPassword ? "Hide" : "Show"}
                </Text>
              </Pressable>
            </View>

            <Text className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-slate-500">
              Confirm new password
            </Text>

            <View className="h-12 flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 pr-3">
              <TextInput
                accessibilityLabel="Confirm new password"
                value={confirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  setError("");
                  setMessage("");
                }}
                placeholder="Enter your password again"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!busy}
                onSubmitEditing={handleReset}
                className="h-12 flex-1 px-4 text-sm text-slate-900"
              />

              <Pressable
                onPress={() => setShowConfirmPassword((value) => !value)}
                accessibilityRole="button"
                accessibilityLabel={
                  showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                }
                hitSlop={10}
                className="px-1 py-2"
              >
                <Text className="text-xs font-bold text-purple-700">
                  {showConfirmPassword ? "Hide" : "Show"}
                </Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handleReset}
              disabled={busy}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy }}
              className={`mt-6 h-12 flex-row items-center justify-center rounded-2xl ${
                busy ? "bg-purple-400" : "bg-purple-700"
              }`}
            >
              {busy ? (
                <>
                  <ActivityIndicator color="white" />
                  <Text className="ml-2 text-sm font-bold text-white">
                    Updating password...
                  </Text>
                </>
              ) : (
                <Text className="text-base font-bold text-white">
                  Update password
                </Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
