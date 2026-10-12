import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useTheme } from "../context/ThemeContext";
import { cardShadow } from "../lib/theme";

interface Props {
  onBack: () => void;
}

export default function AboutScreen({ onBack }: Props) {
  const { isDark, toggleTheme } = useTheme();

  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";
  const rowBg = isDark ? "bg-[#252033]" : "bg-purple-50";

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const buildNumber =
    Constants.expoConfig?.android?.versionCode?.toString() ?? "—";

  function openLink(url: string) {
    Linking.openURL(url).catch(() => {
      // Silently ignore if the URL can't open
    });
  }

  return (
    <View className={`flex-1 ${bg}`}>
      <StatusBar style="light" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 60 }}
      >
        {/* Hero header */}
        <View className="rounded-b-[40px] bg-purple-800 pb-10 pt-14">
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
                About
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

          {/* Brand block */}
          <View className="mt-8 items-center">
            <View className="h-24 w-24 items-center justify-center rounded-[28px] bg-white/20">
              <Text className="text-4xl">🦷</Text>
            </View>
            <Text className="mt-4 text-2xl font-extrabold text-white">
              DentNotes
            </Text>
            <Text className="mt-1 text-xs text-purple-200">
              Patient care, clearly documented.
            </Text>
            <View className="mt-3 rounded-full bg-white/15 px-3 py-1">
              <Text className="text-[10px] font-bold text-white">
                Version {appVersion} · Build {buildNumber}
              </Text>
            </View>
          </View>
        </View>

        <View className="px-5 pt-6">
          {/* Legal */}
          <View
            className={`rounded-3xl border p-5 ${cardBorder} ${cardBg}`}
            style={cardShadow}
          >
            <View className="mb-4 flex-row items-center gap-2">
              <Feather name="shield" size={16} color="#7c3aed" />
              <Text className={`text-sm font-bold ${headingText}`}>
                Legal
              </Text>
            </View>

            <Pressable
              onPress={() =>
                openLink("https://dentnotes-react.vercel.app/privacy")
              }
              className={`flex-row items-center gap-3 rounded-2xl px-4 py-4 ${rowBg}`}
            >
              <Feather name="file-text" size={16} color="#7c3aed" />
              <Text className={`flex-1 text-sm font-bold ${headingText}`}>
                Privacy Policy
              </Text>
              <Feather
                name="external-link"
                size={16}
                color={isDark ? "#a78bfa" : "#c4b5fd"}
              />
            </Pressable>

            <Pressable
              onPress={() =>
                openLink("https://dentnotes-react.vercel.app/terms")
              }
              className={`mt-3 flex-row items-center gap-3 rounded-2xl px-4 py-4 ${rowBg}`}
            >
              <Feather name="book" size={16} color="#7c3aed" />
              <Text className={`flex-1 text-sm font-bold ${headingText}`}>
                Terms of Service
              </Text>
              <Feather
                name="external-link"
                size={16}
                color={isDark ? "#a78bfa" : "#c4b5fd"}
              />
            </Pressable>
          </View>

          {/* Support */}
          <View
            className={`mt-5 rounded-3xl border p-5 ${cardBorder} ${cardBg}`}
            style={cardShadow}
          >
            <View className="mb-4 flex-row items-center gap-2">
              <Feather name="help-circle" size={16} color="#7c3aed" />
              <Text className={`text-sm font-bold ${headingText}`}>
                Support
              </Text>
            </View>

            <Pressable
              onPress={() =>
                openLink(
                  "mailto:support@dentnotes.app?subject=DentNotes%20Support",
                )
              }
              className={`flex-row items-center gap-3 rounded-2xl px-4 py-4 ${rowBg}`}
            >
              <Feather name="mail" size={16} color="#7c3aed" />
              <View className="flex-1">
                <Text className={`text-sm font-bold ${headingText}`}>
                  Contact support
                </Text>
                <Text className={`mt-0.5 text-xs ${bodyText}`}>
                  support@dentnotes.app
                </Text>
              </View>
              <Feather
                name="chevron-right"
                size={16}
                color={isDark ? "#a78bfa" : "#c4b5fd"}
              />
            </Pressable>

            <Pressable
              onPress={() =>
                openLink(
                  "https://dentnotes-react.vercel.app/help",
                )
              }
              className={`mt-3 flex-row items-center gap-3 rounded-2xl px-4 py-4 ${rowBg}`}
            >
              <Feather name="book-open" size={16} color="#7c3aed" />
              <View className="flex-1">
                <Text className={`text-sm font-bold ${headingText}`}>
                  Documentation
                </Text>
                <Text className={`mt-0.5 text-xs ${bodyText}`}>
                  Guides and how-tos
                </Text>
              </View>
              <Feather
                name="external-link"
                size={16}
                color={isDark ? "#a78bfa" : "#c4b5fd"}
              />
            </Pressable>
          </View>

          {/* Credits */}
          <View
            className={`mt-5 rounded-3xl border p-5 ${cardBorder} ${cardBg}`}
            style={cardShadow}
          >
            <View className="mb-4 flex-row items-center gap-2">
              <Feather name="info" size={16} color="#7c3aed" />
              <Text className={`text-sm font-bold ${headingText}`}>
                About DentNotes
              </Text>
            </View>

            <Text className={`text-xs leading-5 ${bodyText}`}>
              DentNotes is a clinical documentation app built for dental
              professionals. It helps capture, organize, and retrieve patient
              notes with less friction — so the next detail is always easier to
              reach.
            </Text>
          </View>

          {/* Footer */}
          <View className="mt-8 items-center">
            <Text className={`text-[10px] ${bodyText}`}>
              Made with care for modern dental teams
            </Text>
            <Text className={`mt-1 text-[10px] ${bodyText}`}>
              © {new Date().getFullYear()} DentNotes
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}