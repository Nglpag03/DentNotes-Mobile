import { useCallback, useEffect, useRef } from "react";
import {
  Alert,
  BackHandler,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useTheme } from "../context/ThemeContext";
import { cardShadow } from "../lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  onBack: () => void;
}

const SUPPORT_EMAIL = "support@dentnotes.app";

export default function AboutScreen({ onBack }: Props) {
  const { isDark, toggleTheme } = useTheme();
  const insets = useSafeAreaInsets();

  // ── Theme tokens ─────────────────────────────────────────
  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";
  const labelText = isDark ? "text-slate-500" : "text-slate-400";
  const rowBg = isDark ? "bg-[#252033]" : "bg-purple-50";
  const divider = isDark ? "border-slate-800" : "border-slate-100";

  const appVersion = Constants.expoConfig?.version ?? "1.0.0";
  const buildNumber =
    (Platform.OS === "ios"
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode?.toString()) ?? "—";

  // Handle Android back button
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        onBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [onBack]);

  // Prevent rapid repeat taps
  const opening = useRef(false);

  const openLink = useCallback(async (url: string) => {
    if (opening.current) return;
    opening.current = true;

    try {
      await Linking.openURL(url);
    } catch {
      if (url.startsWith("mailto:")) {
        Alert.alert(
          "No email app found",
          `You can reach us at ${SUPPORT_EMAIL} from any email app.`,
        );
      } else {
        Alert.alert(
          "Couldn't open link",
          "Please check your internet connection and try again.",
        );
      }
    } finally {
      setTimeout(() => {
        opening.current = false;
      }, 800);
    }
  }, []);

  function contactSupport() {
    const subject = encodeURIComponent("DentNotes Support");
    const body = encodeURIComponent(
      `\n\n---\nApp: DentNotes ${appVersion} (build ${buildNumber})\nDevice: ${Platform.OS} ${Platform.Version}\n`,
    );
    void openLink(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`);
  }

  return (
    <View className={`flex-1 ${bg}`}>
      <StatusBar style="light" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* ─── Hero ─── */}
        <View
          className="rounded-b-[40px] bg-purple-800 pb-16"
          style={{ paddingTop: insets.top + 12 }}
        >
          <View className="flex-row items-center px-5">
            <View className="w-24">
              <Pressable
                onPress={onBack}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                className="h-11 w-11 items-center justify-center rounded-full bg-white/10 active:opacity-70"
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
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={
                  isDark ? "Switch to light mode" : "Switch to dark mode"
                }
                className="h-11 w-11 items-center justify-center rounded-full bg-white/10 active:opacity-70"
              >
                <Feather
                  name={isDark ? "sun" : "moon"}
                  size={20}
                  color="#ffffff"
                />
              </Pressable>
            </View>
          </View>
        </View>

        {/* ─── Brand block — peeks into hero ─── */}
        <View className="-mt-12 items-center px-5">
          <View
            className={`h-24 w-24 items-center justify-center rounded-[28px] ${cardBg}`}
            style={{
              borderWidth: 4,
              borderColor: "#7c3aed",
              shadowColor: "#7c3aed",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Feather name="feather" size={36} color="#7c3aed" />
          </View>

          <Text className={`mt-4 text-2xl font-extrabold ${headingText}`}>
            DentNotes
          </Text>
          <Text className={`mt-1 text-xs ${bodyText}`}>
            Patient care, clearly documented.
          </Text>

          <View
            className={`mt-3 flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${
              isDark ? "bg-purple-950" : "bg-purple-100"
            }`}
          >
            <Feather name="package" size={11} color="#7c3aed" />
            <Text className="text-[10px] font-bold text-purple-700">
              v{appVersion} · Build {buildNumber}
            </Text>
          </View>
        </View>

        <View className="px-5 pt-6">
          {/* ─── Legal ─── */}
          <SectionCard
            title="Legal"
            icon="shield"
            cardBg={cardBg}
            cardBorder={cardBorder}
            divider={divider}
            headingText={headingText}
            style={cardShadow}
          >
            <LinkRow
              icon="file-text"
              label="Privacy Policy"
              hint="How we handle your data"
              onPress={() =>
                openLink("https://dentnotes-react.vercel.app/privacy")
              }
              rowBg={rowBg}
              headingText={headingText}
              bodyText={bodyText}
              isDark={isDark}
            />

            <View className="h-3" />

            <LinkRow
              icon="book"
              label="Terms of Service"
              hint="The rules of using DentNotes"
              onPress={() =>
                openLink("https://dentnotes-react.vercel.app/terms")
              }
              rowBg={rowBg}
              headingText={headingText}
              bodyText={bodyText}
              isDark={isDark}
            />
          </SectionCard>

          {/* ─── Support ─── */}
          <SectionCard
            title="Support"
            icon="help-circle"
            cardBg={cardBg}
            cardBorder={cardBorder}
            divider={divider}
            headingText={headingText}
            style={cardShadow}
            marginTop
          >
            <LinkRow
              icon="mail"
              label="Contact support"
              hint={SUPPORT_EMAIL}
              onPress={contactSupport}
              rowBg={rowBg}
              headingText={headingText}
              bodyText={bodyText}
              isDark={isDark}
              chevron="chevron-right"
            />

            <View className="h-3" />

            <LinkRow
              icon="book-open"
              label="Documentation"
              hint="Guides and how-tos"
              onPress={() =>
                openLink("https://dentnotes-react.vercel.app/help")
              }
              rowBg={rowBg}
              headingText={headingText}
              bodyText={bodyText}
              isDark={isDark}
            />
          </SectionCard>

          {/* ─── About text ─── */}
          <SectionCard
            title="About DentNotes"
            icon="info"
            cardBg={cardBg}
            cardBorder={cardBorder}
            divider={divider}
            headingText={headingText}
            style={cardShadow}
            marginTop
          >
            <Text className={`text-sm leading-6 ${bodyText}`}>
              DentNotes is a clinical documentation app built for dental
              professionals. It helps capture, organize, and retrieve patient
              notes with less friction — so the next detail is always easier to
              reach.
            </Text>
          </SectionCard>

          {/* ─── Footer ─── */}
          <View className="mt-8 items-center">
            <View className="flex-row items-center gap-1.5">
              <Feather name="heart" size={11} color="#a855f7" />
              <Text className={`text-[10px] ${bodyText}`}>
                Made with care for modern dental teams
              </Text>
            </View>
            <Text className={`mt-2 text-[10px] ${labelText}`}>
              © {new Date().getFullYear()} DentNotes. All rights reserved.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ─── Section card wrapper ─── */
function SectionCard({
  title,
  icon,
  children,
  cardBg,
  cardBorder,
  divider,
  headingText,
  style,
  marginTop,
}: {
  title: string;
  icon: string;
  children: React.ReactNode;
  cardBg: string;
  cardBorder: string;
  divider: string;
  headingText: string;
  style?: object;
  marginTop?: boolean;
}) {
  return (
    <View
      className={`overflow-hidden rounded-3xl border ${cardBorder} ${cardBg} ${
        marginTop ? "mt-5" : ""
      }`}
      style={style}
    >
      <View
        className={`flex-row items-center gap-2 border-b px-5 py-4 ${divider}`}
      >
        <Feather name={icon as any} size={16} color="#7c3aed" />
        <Text className={`text-sm font-bold ${headingText}`}>{title}</Text>
      </View>
      <View className="p-5">{children}</View>
    </View>
  );
}

/* ─── Link row ─── */
function LinkRow({
  icon,
  label,
  hint,
  onPress,
  rowBg,
  headingText,
  bodyText,
  isDark,
  chevron = "external-link",
}: {
  icon: string;
  label: string;
  hint: string;
  onPress: () => void;
  rowBg: string;
  headingText: string;
  bodyText: string;
  isDark: boolean;
  chevron?: "external-link" | "chevron-right";
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`flex-row items-center gap-3 rounded-2xl px-4 py-4 active:opacity-70 ${rowBg}`}
    >
      <View
        className={`h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          isDark ? "bg-purple-950" : "bg-purple-100"
        }`}
      >
        <Feather name={icon as any} size={16} color="#7c3aed" />
      </View>

      <View className="min-w-0 flex-1">
        <Text className={`text-sm font-bold ${headingText}`}>{label}</Text>
        <Text className={`mt-0.5 text-xs ${bodyText}`} numberOfLines={1}>
          {hint}
        </Text>
      </View>

      <Feather
        name={chevron}
        size={16}
        color={isDark ? "#a78bfa" : "#c4b5fd"}
      />
    </Pressable>
  );
}