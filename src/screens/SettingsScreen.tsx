import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { cardShadow } from "../lib/theme";
import {
  DEFAULT_PREFERENCES,
  loadPreferences,
  savePreferences,
  type Preferences,
} from "../lib/preferences";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  onBack: () => void;
}

const ROOM_OPTIONS = [
  "",
  "Room 1",
  "Room 2",
  "Room 3",
  "Chair 1",
  "Chair 2",
  "Suite A",
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90];

export default function SettingsScreen({ onBack }: Props) {
  const { isDark, toggleTheme, theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // ── Theme tokens ─────────────────────────────────────────
  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";
  const labelText = isDark ? "text-slate-500" : "text-slate-400";
  const chipBg = isDark ? "bg-[#252033]" : "bg-purple-50";
  const chipText = isDark ? "text-purple-200" : "text-purple-800";
  const divider = isDark ? "border-slate-800" : "border-slate-100";

  useEffect(() => {
    (async () => {
      const loaded = await loadPreferences();
      setPrefs(loaded);
      setLoading(false);
    })();
  }, []);

  async function update<K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    await savePreferences(next);
    setSavedAt(Date.now());
    setTimeout(() => setSavedAt(null), 1500);
  }

  function resetToDefaults() {
    Alert.alert(
      "Reset all settings?",
      "Your preferences will return to their defaults. This won't delete any patient data.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            setPrefs(DEFAULT_PREFERENCES);
            await savePreferences(DEFAULT_PREFERENCES);
            setSavedAt(Date.now());
            setTimeout(() => setSavedAt(null), 1500);
          },
        },
      ],
      { cancelable: true },
    );
  }

  if (loading) {
    return (
      <View className={`flex-1 items-center justify-center ${bg}`}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <StatusBar style="light" />
      </View>
    );
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
          className="rounded-b-[40px] bg-purple-800 pb-8"
          style={{ paddingTop: insets.top + 12 }}
        >
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
                Settings
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
        </View>

        <View className="px-5 pt-5">
          {/* Saved banner */}
          {savedAt ? (
            <View className="mb-4 flex-row items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <Feather name="check-circle" size={16} color="#047857" />
              <Text className="text-sm font-semibold text-emerald-700">
                Settings saved
              </Text>
            </View>
          ) : null}

          {/* ─── Appearance ─── */}
          <SectionCard
            title="Appearance"
            icon="sun"
            cardBg={cardBg}
            cardBorder={cardBorder}
            divider={divider}
            headingText={headingText}
            style={cardShadow}
          >
            <Text className={`mb-3 text-xs font-bold ${labelText}`}>
              Theme
            </Text>
            <View
              className={`flex-row rounded-full p-1.5 ${
                isDark ? "bg-[#0e0a1a]" : "bg-purple-100"
              }`}
            >
              {(["light", "dark"] as const).map((t) => {
                const active = theme === t;
                return (
                  <Pressable
                    key={t}
                    onPress={() => {
                      if (theme !== t) toggleTheme();
                    }}
                    className={`flex-1 flex-row items-center justify-center gap-2 rounded-full py-3 ${
                      active ? "bg-purple-800" : ""
                    }`}
                  >
                    <Feather
                      name={t === "light" ? "sun" : "moon"}
                      size={14}
                      color={
                        active
                          ? "#ffffff"
                          : isDark
                            ? "#c4b5fd"
                            : "#7c3aed"
                      }
                    />
                    <Text
                      className={`text-xs font-bold capitalize ${
                        active
                          ? "text-white"
                          : isDark
                            ? "text-purple-200"
                            : "text-purple-700"
                      }`}
                    >
                      {t}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </SectionCard>

          {/* ─── Practice defaults ─── */}
          <SectionCard
            title="Practice defaults"
            icon="briefcase"
            cardBg={cardBg}
            cardBorder={cardBorder}
            divider={divider}
            headingText={headingText}
            style={cardShadow}
            marginTop
          >
            <Text className={`mb-3 text-xs font-bold ${labelText}`}>
              Default room for new sessions
            </Text>
            <View className="mb-5 flex-row flex-wrap gap-2">
              {ROOM_OPTIONS.map((r) => {
                const active = prefs.defaultRoom === r;
                const label = r || "None";
                return (
                  <Pressable
                    key={r}
                    onPress={() => update("defaultRoom", r)}
                    className={`rounded-full px-4 py-2.5 ${
                      active ? "bg-purple-800" : chipBg
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        active ? "text-white" : chipText
                      }`}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text className={`mb-3 text-xs font-bold ${labelText}`}>
              Default duration
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {DURATION_OPTIONS.map((d) => {
                const active = prefs.defaultDuration === d;
                return (
                  <Pressable
                    key={d}
                    onPress={() => update("defaultDuration", d)}
                    className={`rounded-full px-4 py-2.5 ${
                      active ? "bg-purple-800" : chipBg
                    }`}
                  >
                    <Text
                      className={`text-[11px] font-bold ${
                        active ? "text-white" : chipText
                      }`}
                    >
                      {d} min
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </SectionCard>

          {/* ─── Notifications ─── */}
          <SectionCard
            title="Notifications"
            icon="bell"
            cardBg={cardBg}
            cardBorder={cardBorder}
            divider={divider}
            headingText={headingText}
            style={cardShadow}
            marginTop
          >
            <View className="gap-3">
              <ToggleRow
                icon="clock"
                label="Starting soon"
                hint="Alert when a session starts within 1 hour"
                value={prefs.notifySoon}
                onToggle={(v) => update("notifySoon", v)}
                isDark={isDark}
                headingText={headingText}
                bodyText={bodyText}
                rowBg={chipBg}
              />

              <ToggleRow
                icon="alert-circle"
                label="Stuck in progress"
                hint="Remind me when a session has been in progress for 2+ hours"
                value={prefs.notifyInProgress}
                onToggle={(v) => update("notifyInProgress", v)}
                isDark={isDark}
                headingText={headingText}
                bodyText={bodyText}
                rowBg={chipBg}
              />

              <ToggleRow
                icon="alert-triangle"
                label="Missed appointments"
                hint="Flag planned sessions that went uncompleted"
                value={prefs.notifyMissed}
                onToggle={(v) => update("notifyMissed", v)}
                isDark={isDark}
                headingText={headingText}
                bodyText={bodyText}
                rowBg={chipBg}
              />
            </View>
          </SectionCard>

          {/* ─── Danger zone ─── */}
          <View className="mt-8">
            <Text
              className={`mb-3 px-1 text-[10px] font-bold uppercase tracking-widest ${bodyText}`}
            >
              Danger zone
            </Text>
            <View
              className={`overflow-hidden rounded-3xl border ${
                isDark ? "border-red-900/40" : "border-red-100"
              } ${cardBg}`}
              style={cardShadow}
            >
              <Pressable
                onPress={resetToDefaults}
                className="flex-row items-center gap-3 px-5 py-4"
              >
                <View
                  className={`h-10 w-10 items-center justify-center rounded-xl ${
                    isDark ? "bg-red-950/40" : "bg-red-50"
                  }`}
                >
                  <Feather name="rotate-ccw" size={16} color="#dc2626" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-red-600">
                    Reset all settings
                  </Text>
                  <Text className={`mt-0.5 text-xs ${bodyText}`}>
                    Restore preferences to their defaults
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color="#f87171" />
              </Pressable>
            </View>
          </View>

          {/* Footer */}
          <View className="mt-6 items-center">
            <Text className={`text-[10px] ${bodyText}`}>
              Changes are saved automatically
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ─── Section wrapper ─── */
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

/* ─── Animated toggle row ─── */
function ToggleRow({
  icon,
  label,
  hint,
  value,
  onToggle,
  isDark,
  headingText,
  bodyText,
  rowBg,
}: {
  icon: string;
  label: string;
  hint: string;
  value: boolean;
  onToggle: (v: boolean) => void;
  isDark: boolean;
  headingText: string;
  bodyText: string;
  rowBg: string;
}) {
  const slideAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: value ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [value, slideAnim]);

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 20],
  });

  return (
    <Pressable
      onPress={() => onToggle(!value)}
      className={`flex-row items-center gap-3 rounded-2xl px-4 py-4 ${rowBg}`}
    >
      <Feather
        name={icon as any}
        size={16}
        color={isDark ? "#c4b5fd" : "#7c3aed"}
      />
      <View className="flex-1">
        <Text className={`text-sm font-bold ${headingText}`}>{label}</Text>
        <Text className={`mt-0.5 text-xs ${bodyText}`}>{hint}</Text>
      </View>

      {/* Animated toggle */}
      <View
        className={`h-6 w-11 rounded-full p-0.5 ${
          value ? "bg-purple-800" : "bg-slate-300"
        }`}
      >
        <Animated.View
          style={{ transform: [{ translateX }] }}
          className="h-5 w-5 rounded-full bg-white shadow-sm"
        />
      </View>
    </Pressable>
  );
}