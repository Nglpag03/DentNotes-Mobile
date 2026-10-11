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

interface Props {
  onBack: () => void;
  onSelectPatient: (id: string) => void;
}

export default function SearchScreen({ onBack, onSelectPatient }: Props) {
  const { isDark } = useTheme();
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
  const inputBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const inputBorder = isDark ? "border-purple-900/40" : "border-slate-200";

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
      <StatusBar style={isDark ? "light" : "dark"} />

      {/* Header */}
      <View className={`border-b px-5 pt-14 pb-4 ${cardBorder}`}>
        <View className="mb-4 flex-row items-center gap-3">
          <Pressable
            onPress={onBack}
            className={`h-10 w-10 items-center justify-center rounded-full border ${cardBorder} ${cardBg}`}
          >
            <Feather
              name="arrow-left"
              size={20}
              color={isDark ? "#ffffff" : "#6d28d9"}
            />
          </Pressable>
          <Text className={`flex-1 text-center text-base font-bold ${headingText}`}>
            Search
          </Text>
          <View className="w-10" />
        </View>

        {/* Search input */}
        <View
          className={`flex-row items-center gap-2 rounded-2xl border px-4 ${inputBg} ${inputBorder}`}
        >
          <Feather name="search" size={18} color="#94a3b8" />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Search patients, treatments, notes..."
            placeholderTextColor="#94a3b8"
            autoCapitalize="none"
            autoCorrect={false}
            className={`flex-1 py-3 text-sm ${headingText}`}
          />
          {query ? (
            <Pressable onPress={() => setQuery("")}>
              <Feather name="x" size={16} color="#94a3b8" />
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Results */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 60 }}
        keyboardShouldPersistTaps="handled"
      >
        {loading ? (
          <View className="items-center py-20">
            <ActivityIndicator size="large" color="#7c3aed" />
          </View>
        ) : !q ? (
          <View className="items-center px-8 py-16">
            <View
              className={`h-16 w-16 items-center justify-center rounded-3xl ${
                isDark ? "bg-purple-950" : "bg-purple-100"
              }`}
            >
              <Feather name="search" size={28} color="#7c3aed" />
            </View>
            <Text className={`mt-4 text-base font-bold ${headingText}`}>
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
              className={`h-16 w-16 items-center justify-center rounded-3xl ${
                isDark ? "bg-purple-950" : "bg-purple-100"
              }`}
            >
              <Feather name="x" size={28} color="#7c3aed" />
            </View>
            <Text className={`mt-4 text-base font-bold ${headingText}`}>
              No results for "{query}"
            </Text>
            <Text className={`mt-2 text-center text-sm ${bodyText}`}>
              Try a different name or keyword.
            </Text>
          </View>
        ) : (
          <View className="px-5 pt-4">
            {/* Patients */}
            {matchedPatients.length > 0 && (
              <View className="mb-6">
                <Text className="mb-3 text-[10px] font-bold uppercase tracking-widest text-purple-600">
                  Patients · {matchedPatients.length}
                </Text>
                <View
                  className={`overflow-hidden rounded-2xl border ${cardBorder} ${cardBg}`}
                  style={cardShadow}
                >
                  {matchedPatients.map((p, idx) => (
                    <Pressable
                      key={p.id}
                      onPress={() => onSelectPatient(p.id!)}
                      className={`flex-row items-center gap-3 p-4 ${
                        idx !== matchedPatients.length - 1
                          ? `border-b ${rowBorder}`
                          : ""
                      }`}
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
                        <Text className={`text-sm font-bold ${headingText}`}>
                          {p.first_name} {p.last_name}
                        </Text>
                        <Text className={`mt-0.5 text-xs ${bodyText}`}>
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

            {/* Sessions */}
            {matchedSessions.length > 0 && (
              <View className="mb-6">
                <Text className="mb-3 text-[10px] font-bold uppercase tracking-widest text-purple-600">
                  Sessions · {matchedSessions.length}
                </Text>
                <View className="gap-3">
                  {matchedSessions.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => onSelectPatient(s.patient_id)}
                      className={`overflow-hidden rounded-2xl border ${cardBorder} ${cardBg}`}
                      style={cardShadow}
                    >
                      <View className="p-4">
                        <View className="flex-row items-start gap-3">
                          <View className={`h-12 w-12 items-center justify-center rounded-2xl ${
                            isDark ? "bg-purple-900/40" : "bg-purple-100"
                          }`}>
                            <Text className={`text-sm font-extrabold ${
                              isDark ? "text-purple-200" : "text-purple-900"
                            }`}>
                              {format(parseISO(s.session_date), "d")}
                            </Text>
                            <Text className={`text-[9px] font-bold uppercase ${
                              isDark ? "text-purple-200" : "text-purple-900"
                            }`}>
                              {format(parseISO(s.session_date), "MMM")}
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Text className={`text-sm font-bold ${headingText}`}>
                              {s.title}
                            </Text>
                            <Text className={`mt-0.5 text-xs ${bodyText}`}>
                              {s.patients?.first_name} {s.patients?.last_name}
                            </Text>
                          </View>
                          <View
                            style={{ backgroundColor: statusColors[s.status]?.bg }}
                            className="rounded-full px-2.5 py-1"
                          >
                            <Text
                              style={{ color: statusColors[s.status]?.text }}
                              className="text-[9px] font-bold"
                            >
                              {s.status}
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
                      </View>
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