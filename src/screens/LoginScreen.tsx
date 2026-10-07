import { useState } from "react";
import {
  ActivityIndicator,
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
import { useAuth } from "../context/AuthContext";

type Mode = "login" | "signup";

export default function LoginScreen() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleSubmit() {
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    if (mode === "signup") {
      if (!firstName.trim() || !lastName.trim()) {
        setError("Please enter your first and last name.");
        setBusy(false);
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        setBusy(false);
        return;
      }

      const result = await signUp(email, password, firstName, lastName);
      setBusy(false);

      if (result.error) {
        setError(result.error);
      } else if (result.needsConfirmation) {
        setMessage("Check your email to confirm your account, then sign in.");
        setMode("login");
        setPassword("");
      }
      // If no error and no confirmation needed, the auth listener will
      // automatically switch the screen.
    } else {
      const result = await signIn(email, password);
      setBusy(false);
      if (result.error) setError(result.error);
      // On success, the auth listener switches to the dashboard.
    }
  }

  function switchMode() {
    setMode(mode === "login" ? "signup" : "login");
    setError("");
    setMessage("");
    setPassword("");
  }

  return (
    <View className="flex-1 bg-[#faf8fc]">
      <StatusBar style="dark" />

      {/* Purple gradient blobs at the top */}
      <View className="absolute inset-x-0 top-0 h-72 overflow-hidden">
        <LinearGradient
          colors={["#a855f7", "#7c3aed", "#faf8fc"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ flex: 1, opacity: 0.35 }}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
          keyboardShouldPersistTaps="handled"
          className="px-6"
        >
          {/* Logo + branding */}
          <View className="mb-8 items-center">
            <View className="mb-4 h-16 w-16 items-center justify-center rounded-[22px] bg-purple-700 shadow-xl shadow-purple-900/30">
              <Text className="text-3xl">🦷</Text>
            </View>
            <Text className="text-3xl font-extrabold tracking-tight text-purple-950">
              DentNotes
            </Text>
            <Text className="mt-2 text-sm text-slate-500">
              Patient care, clearly documented.
            </Text>
          </View>

          {/* Card */}
          <View className="rounded-[28px] border border-purple-100 bg-white p-6 shadow-2xl shadow-purple-950/10">
            <Text className="text-xl font-bold text-slate-900">
              {mode === "login" ? "Welcome back" : "Create an account"}
            </Text>
            <Text className="mt-1 text-sm text-slate-500">
              {mode === "login"
                ? "Sign in to access your patient notes."
                : "Start documenting your patient care today."}
            </Text>

            {message ? (
              <View className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                <Text className="text-sm text-emerald-700">{message}</Text>
              </View>
            ) : null}

            {error ? (
              <View className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
                <Text className="text-sm text-red-700">{error}</Text>
              </View>
            ) : null}

            {/* First + Last name (signup only) */}
            {mode === "signup" ? (
              <View className="mt-4 flex-row gap-3">
                <View className="flex-1">
                  <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    First name
                  </Text>
                  <TextInput
                    autoCapitalize="words"
                    value={firstName}
                    onChangeText={setFirstName}
                    placeholder="Jane"
                    placeholderTextColor="#94a3b8"
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900"
                  />
                </View>
                <View className="flex-1">
                  <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    Last name
                  </Text>
                  <TextInput
                    autoCapitalize="words"
                    value={lastName}
                    onChangeText={setLastName}
                    placeholder="Doe"
                    placeholderTextColor="#94a3b8"
                    className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900"
                  />
                </View>
              </View>
            ) : null}

            {/* Email */}
            <View className="mt-4">
              <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Email address
              </Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                placeholder="doctor@clinic.com"
                placeholderTextColor="#94a3b8"
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900"
              />
            </View>

            {/* Password */}
            <View className="mt-4">
              <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                Password
              </Text>
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                className="h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900"
              />
            </View>

            {/* Submit */}
            <Pressable
              onPress={handleSubmit}
              disabled={busy}
              className={`mt-6 h-12 items-center justify-center rounded-2xl ${
                busy ? "bg-purple-400" : "bg-purple-700"
              }`}
            >
              {busy ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-base font-bold text-white">
                  {mode === "login" ? "Sign in" : "Create account"}
                </Text>
              )}
            </Pressable>

            <Text className="mt-4 text-center text-xs leading-relaxed text-slate-400">
              Secure access for authorized dental professionals only.
            </Text>

            {/* Mode toggle */}
            <View className="mt-4 flex-row justify-center border-t border-slate-100 pt-4">
              <Text className="text-sm text-slate-500">
                {mode === "login"
                  ? "Don't have an account? "
                  : "Already have an account? "}
              </Text>
              <Pressable onPress={switchMode}>
                <Text className="text-sm font-bold text-purple-700">
                  {mode === "login" ? "Sign up" : "Sign in"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}