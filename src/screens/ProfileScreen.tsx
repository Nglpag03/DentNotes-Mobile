import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { cardShadow } from "../lib/theme";

import { Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { pickAvatarImage, uploadAvatar, deleteOldAvatars } from "../lib/avatar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  onBack: () => void;
}

export default function ProfileScreen({ onBack }: Props) {
  const { session } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const meta = session?.user.user_metadata ?? {};
  const email = session?.user.email ?? "";

  const [firstName, setFirstName] = useState(meta.first_name ?? "");
  const [lastName, setLastName] = useState(meta.last_name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "DR";

  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";
  const labelText = isDark ? "text-slate-500" : "text-slate-400";
  const inputBg = isDark ? "bg-[#252033]" : "bg-purple-50";
  const inputText = isDark ? "text-white" : "text-slate-900";
  const inputBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const insets = useSafeAreaInsets();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
  meta.avatar_url ?? null,
  );
  const [uploading, setUploading] = useState(false);

  const isDirty =
    firstName.trim() !== (meta.first_name ?? "") ||
    lastName.trim() !== (meta.last_name ?? "");

  async function handleSave() {
    if (!firstName.trim() || !lastName.trim()) {
      setError("Both first and last name are required.");
      return;
    }

    setBusy(true);
    setError("");

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      },
    });

    setBusy(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);
  }

  async function handlePickAvatar() {
  try {
    const uri = await pickAvatarImage();
    if (!uri) return;

    setUploading(true);
    setError("");

    const userId = session?.user.id;
    if (!userId) throw new Error("Not signed in.");

    const publicUrl = await uploadAvatar(userId, uri);

const { error: updateError } = await supabase.auth.updateUser({
  data: { avatar_url: publicUrl },
});
if (updateError) throw updateError;

// 👇 Force the session to refresh so AuthContext re-renders
await supabase.auth.refreshSession();

setAvatarUrl(publicUrl);

    setAvatarUrl(publicUrl);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 2000);

    // Best-effort cleanup of old files
    // deleteOldAvatars(userId, publicUrl);
  } catch (err) {
    setError(err instanceof Error ? err.message : "Upload failed");
  } finally {
    setUploading(false);
  }
}

  async function handleResetPassword() {
    if (!email) return;
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Reset password?",
        `We'll email a reset link to ${email}`,
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Send link", onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
    if (!confirmed) return;

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email,
    );
    if (resetError) {
      Alert.alert("Couldn't send reset link", resetError.message);
    } else {
      Alert.alert("Email sent", `Check ${email} for the reset link.`);
    }
  }

  return (
    <View className={`flex-1 ${bg}`}>
      <StatusBar style="light" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero header */}
        <View className="rounded-b-[40px] bg-purple-800 pb-10" 
        style={{ paddingTop: insets.top + 12 }}>
          <View className="flex-row items-center px-5">
            <View className="w-24">
              <Pressable
                onPress={onBack}
                className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
              >
                <Feather name="arrow-left" size={20} color="#ffffff" />
              </Pressable>
            </View>

            <View className="flex-1 flex-row items-center justify-center gap-2">
              <View className="h-6 w-6 items-center justify-center rounded-md bg-white">
                <Text className="text-xs font-extrabold text-purple-800">D</Text>
              </View>
              <Text className="text-lg font-extrabold tracking-tight text-white">
                My Profile
              </Text>
            </View>

            <View className="w-24 items-end">
              <Pressable
                onPress={toggleTheme}
                className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
              >
                <Feather
                  name={isDark ? "sun" : "moon"}
                  size={20}
                  color="#ffffff"
                />
              </Pressable>
            </View>
          </View>

          {/* Big avatar */}
<View className="mt-8 items-center">
  <Pressable
    onPress={handlePickAvatar}
    disabled={uploading}
    className="relative"
  >
    <View
      className="h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-white/20"
      style={{ borderWidth: 4, borderColor: "rgba(255,255,255,0.3)" }}
    >
 {uploading ? (
  <ActivityIndicator color="#ffffff" />
) : avatarUrl ? (
  <Image
    source={{ uri: avatarUrl, cache: "reload" }}
    style={{ width: 112, height: 112 }}
  />
) : (
  <Text className="text-4xl font-extrabold text-white">
    {initials}
  </Text>
)}
    </View>

    {/* Camera badge */}
    <View
      className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full bg-white"
      style={{
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
      }}
    >
      <Feather name="camera" size={16} color="#7c3aed" />
    </View>
  </Pressable>

  <Text className="mt-4 text-xl font-extrabold text-white">
    Dr. {firstName} {lastName}
  </Text>
  <Text className="mt-1 text-xs text-purple-200">{email}</Text>

  <Pressable
    onPress={handlePickAvatar}
    disabled={uploading}
    className="mt-3 rounded-full bg-white/15 px-4 py-2"
  >
    <Text className="text-xs font-bold text-white">
      {uploading
        ? "Uploading…"
        : avatarUrl
          ? "Change photo"
          : "Add photo"}
    </Text>
  </Pressable>
</View>
        </View>

        <View className="px-5 pt-6">
          {error ? (
            <View className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          ) : null}

          {savedAt ? (
            <View className="mb-4 flex-row items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <Feather name="check-circle" size={16} color="#047857" />
              <Text className="text-sm font-semibold text-emerald-700">
                Profile updated
              </Text>
            </View>
          ) : null}

          {/* Personal info */}
          <View
            className={`rounded-3xl border p-5 ${cardBorder} ${cardBg}`}
            style={cardShadow}
          >
            <View className="mb-4 flex-row items-center gap-2">
              <Feather name="user" size={16} color="#7c3aed" />
              <Text className={`text-sm font-bold ${headingText}`}>
                Personal info
              </Text>
            </View>

            <Text className={`mb-2 text-xs font-bold ${labelText}`}>
              First name
            </Text>
            <TextInput
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Jane"
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
              className={`mb-5 rounded-2xl border px-4 py-4 text-sm ${inputBg} ${inputText} ${inputBorder}`}
            />

            <Text className={`mb-2 text-xs font-bold ${labelText}`}>
              Last name
            </Text>
            <TextInput
              value={lastName}
              onChangeText={setLastName}
              placeholder="Doe"
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
              className={`mb-5 rounded-2xl border px-4 py-4 text-sm ${inputBg} ${inputText} ${inputBorder}`}
            />

            <Text className={`mb-2 text-xs font-bold ${labelText}`}>Email</Text>
            <View
              className={`rounded-2xl border px-4 py-4 ${inputBg} ${inputBorder}`}
            >
              <Text className={`text-sm ${bodyText}`}>{email}</Text>
            </View>

            <Pressable
              onPress={handleSave}
              disabled={busy || !isDirty}
              className={`mt-5 h-12 items-center justify-center rounded-2xl ${
                busy || !isDirty ? "bg-purple-300" : "bg-purple-800"
              }`}
            >
              {busy ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-sm font-bold text-white">
                  {isDirty ? "Save changes" : "Saved"}
                </Text>
              )}
            </Pressable>
          </View>

          {/* Account */}
          <View
            className={`mt-5 rounded-3xl border p-5 ${cardBorder} ${cardBg}`}
            style={cardShadow}
          >
            <View className="mb-4 flex-row items-center gap-2">
              <Feather name="shield" size={16} color="#7c3aed" />
              <Text className={`text-sm font-bold ${headingText}`}>
                Account
              </Text>
            </View>

            <Pressable
              onPress={handleResetPassword}
              className={`flex-row items-center gap-3 rounded-2xl px-4 py-4 ${
                isDark ? "bg-[#252033]" : "bg-purple-50"
              }`}
            >
              <Feather name="lock" size={16} color="#7c3aed" />
              <View className="flex-1">
                <Text className={`text-sm font-bold ${headingText}`}>
                  Reset password
                </Text>
                <Text className={`mt-0.5 text-xs ${bodyText}`}>
                  We'll email you a reset link
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={16}
                color={isDark ? "#a78bfa" : "#c4b5fd"}
              />
            </Pressable>
          </View>

          {/* Meta info */}
          <View className="mt-6 items-center">
            <Text className={`text-[10px] ${bodyText}`}>
              Signed in as {email}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}