import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";
import type { Patient, Session } from "../types";
import { cardShadow, statusColors } from "../lib/theme";
import { Skeleton } from "../components/Skeleton";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  onBack: () => void;
  onSelectPatient: (id: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  PLANNED: "Upcoming",
  "IN PROGRESS": "In Progress",
  COMPLETED: "Done",
};

export default function SearchScreen({ onBack, onSelectPatient }: Props) {
  const { isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);

  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";
  const rowBorder = isDark ? "border-slate-800" : "border-slate-100";
  const pillBg = isDark ? "bg-purple-950" : "bg-purple-100";
  const pillText = isDark ? "text-purple-200" : "text-purple-800";
  const insets = useSafeAreaInsets();
  const load = useCallback(async () => {
    const p = await supabase.from("patients").select("*").order("last_name");
    if (!p.error) setPatients((p.data as Patient[]) ?? []);

    const s = await supabase
      .from("sessions")
      .select("*, patients(first_name, last_name)")
      .order("session_date", { ascending: false })
      .limit(200);
    if (!s.error) setSessions((s.data as Session[]) ?? []);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  const q = query.trim().toLowerCase();

  const matchedPatients = useMemo(() => {
    if (!q) return [];
    return patients
      .filter((p) =>
        `${p.first_name} ${p.last_name} ${p.condition ?? ""}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 10);
  }, [q, patients]);

  const matchedSessions = useMemo(() => {
    if (!q) return [];
    return sessions
      .filter((s) =>
        `${s.title ?? ""} ${s.description ?? ""} ${s.patients?.first_name ?? ""} ${s.patients?.last_name ?? ""}`
          .toLowerCase()
          .includes(q),
      )
      .slice(0, 15);
  }, [q, sessions]);

  const hasResults = matchedPatients.length > 0 || matchedSessions.length > 0;

  return (
    <View className={`flex-1 ${bg}`}>
      <StatusBar style="light" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* ───── Hero header ───── */}
        <View className="rounded-b-[40px] bg-purple-800 pb-10" style={{ paddingTop: insets.top + 12 }}>
          {/* Top row */}
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
                Search
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

          {/* Search input inside the hero */}
          <View className="mt-6 px-5">
            <View className="flex-row items-center gap-3 rounded-2xl bg-white/15 px-4 py-3.5">
              <Feather name="search" size={18} color="#ffffff" />
              <TextInput
                autoFocus
                value={query}
                onChangeText={setQuery}
                placeholder="Search patients, treatments, notes..."
                placeholderTextColor="#d8b4fe"
                autoCapitalize="none"
                autoCorrect={false}
                className="flex-1 text-sm text-white"
              />
              {query ? (
                <Pressable
                  onPress={() => setQuery("")}
                  className="h-6 w-6 items-center justify-center rounded-full bg-white/20"
                >
                  <Feather name="x" size={14} color="#ffffff" />
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>

        {/* ───── Results ───── */}
 {loading ? (
  <View className="px-5 pt-6">
    <View className="mb-3 flex-row items-center gap-2">
      <Skeleton width={70} height={12} rounded={6} />
      <Skeleton width={28} height={20} rounded={10} />
    </View>
    <View className="gap-3">
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          className={`flex-row items-center gap-3 rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
        >
          <Skeleton width={44} height={44} rounded={22} />
          <View className="flex-1 gap-2">
            <Skeleton width="55%" height={14} rounded={6} />
            <Skeleton width="75%" height={12} rounded={6} />
          </View>
        </View>
      ))}
    </View>
  </View>
) : !q ? (
          <View className="items-center px-8 py-16">
            <View
              className={`h-20 w-20 items-center justify-center rounded-3xl ${
                isDark ? "bg-purple-950" : "bg-purple-100"
              }`}
            >
              <Feather name="search" size={32} color="#7c3aed" />
            </View>
            <Text className={`mt-5 text-lg font-extrabold ${headingText}`}>
              Search your records
            </Text>
            <Text className={`mt-2 text-center text-sm ${bodyText}`}>
              Find patients by name, condition, treatment, or any word in a
              session note.
            </Text>
          </View>
        ) : !hasResults ? (
          <View className="items-center px-8 py-16">
            <View
              className={`h-20 w-20 items-center justify-center rounded-3xl ${
                isDark ? "bg-purple-950" : "bg-purple-100"
              }`}
            >
              <Feather name="x" size={32} color="#7c3aed" />
            </View>
            <Text className={`mt-5 text-lg font-extrabold ${headingText}`}>
              No results
            </Text>
            <Text className={`mt-2 text-center text-sm ${bodyText}`}>
              Nothing matches "{query}". Try a different keyword.
            </Text>
          </View>
        ) : (
          <View className="px-5 pt-6">
            {/* Patients section */}
            {matchedPatients.length > 0 && (
              <View className="mb-6">
                <View className="mb-3 flex-row items-center gap-2">
                  <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
                    Patients
                  </Text>
                  <View className={`rounded-full px-2 py-0.5 ${pillBg}`}>
                    <Text className={`text-[10px] font-bold ${pillText}`}>
                      {matchedPatients.length}
                    </Text>
                  </View>
                </View>

                <View className="gap-3">
                  {matchedPatients.map((p) => (
                    <Pressable
                      key={p.id}
                      onPress={() => onSelectPatient(p.id!)}
                      className={`flex-row items-center gap-3 rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
                      style={cardShadow}
                    >
                      <View
                        className={`h-11 w-11 items-center justify-center rounded-full ${
                          isDark ? "bg-purple-900/40" : "bg-purple-100"
                        }`}
                      >
                        <Text
                          className={`text-xs font-extrabold ${
                            isDark ? "text-purple-200" : "text-purple-800"
                          }`}
                        >
                          {p.first_name.charAt(0)}
                          {p.last_name.charAt(0)}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text
                          className={`text-sm font-extrabold ${headingText}`}
                          numberOfLines={1}
                        >
                          {p.first_name} {p.last_name}
                        </Text>
                        <Text
                          className={`mt-0.5 text-xs ${bodyText}`}
                          numberOfLines={1}
                        >
                          {p.condition || "No condition recorded"}
                        </Text>
                      </View>
                      <Feather
                        name="chevron-right"
                        size={16}
                        color={isDark ? "#a78bfa" : "#c4b5fd"}
                      />
                    </Pressable>
                  ))}
                </View>
              </View>
            )}

            {/* Sessions section */}
            {matchedSessions.length > 0 && (
              <View className="mb-6">
                <View className="mb-3 flex-row items-center gap-2">
                  <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
                    Sessions
                  </Text>
                  <View className={`rounded-full px-2 py-0.5 ${pillBg}`}>
                    <Text className={`text-[10px] font-bold ${pillText}`}>
                      {matchedSessions.length}
                    </Text>
                  </View>
                </View>

                <View className="gap-3">
                  {matchedSessions.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => onSelectPatient(s.patient_id)}
                      className={`overflow-hidden rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
                      style={cardShadow}
                    >
                      <View className="flex-row items-start gap-3">
                        <View
                          className={`h-12 w-12 items-center justify-center rounded-xl ${
                            isDark ? "bg-purple-900/40" : "bg-purple-100"
                          }`}
                        >
                          <Text
                            className={`text-sm font-extrabold ${
                              isDark ? "text-purple-200" : "text-purple-900"
                            }`}
                          >
                            {format(parseISO(s.session_date), "d")}
                          </Text>
                          <Text
                            className={`text-[9px] font-bold uppercase ${
                              isDark ? "text-purple-200" : "text-purple-900"
                            }`}
                          >
                            {format(parseISO(s.session_date), "MMM")}
                          </Text>
                        </View>

                        <View className="flex-1">
                          <Text
                            className={`text-sm font-extrabold ${headingText}`}
                            numberOfLines={1}
                          >
                            {s.title}
                          </Text>
                          <Text
                            className={`mt-0.5 text-xs ${bodyText}`}
                            numberOfLines={1}
                          >
                            {s.patients?.first_name} {s.patients?.last_name}
                          </Text>
                        </View>

                        <View
                          style={{
                            backgroundColor: statusColors[s.status]?.bg,
                          }}
                          className="rounded-full px-2.5 py-1"
                        >
                          <Text
                            style={{ color: statusColors[s.status]?.text }}
                            className="text-[9px] font-bold"
                          >
                            {STATUS_LABEL[s.status] || s.status}
                          </Text>
                        </View>
                      </View>

                      {s.description ? (
                        <Text
                          className={`mt-3 text-xs leading-5 ${bodyText}`}
                          numberOfLines={2}
                        >
                          {s.description}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}