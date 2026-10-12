import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";
import type { Patient } from "../types";
import { cardShadow } from "../lib/theme";
import PatientFormModal from "./PatientFormModal";
import BottomNav from "../components/BottomNav";
import ProfileMenu from "../components/ProfileMenu";
import HeaderActions from "../components/HeaderActions";
import type { Session } from "../types";
import { ListSkeleton } from "../components/Skeleton";

interface Props {
  onSelectPatient: (id: string) => void;
  onNavigateHome: () => void;
  onOpenSchedule: () => void;
  onOpenNotes: () => void;
  onOpenProfile: () => void;
  onOpenAbout: () => void;
}

export default function PatientsScreen({
  onSelectPatient,
  onNavigateHome,
  onOpenSchedule,
  onOpenNotes,
  onOpenProfile,
  onOpenAbout,
}: Props) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const headerBg = isDark ? "bg-[#1a1525]" : "bg-white/90";
  const headerBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";
  const rowBorder = isDark ? "border-slate-800" : "border-slate-100";
  const inputBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const inputBorder = isDark ? "border-purple-900/40" : "border-slate-200";
  const inputText = isDark ? "text-white" : "text-slate-900";
  const avatarBg = isDark ? "bg-purple-900/40" : "bg-purple-100";
  const avatarText = isDark ? "text-purple-200" : "text-purple-800";

const load = useCallback(async () => {
  setError("");

  // Patients
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .order("last_name");
  if (error) setError(error.message);
  else setPatients((data as Patient[]) ?? []);

  // Sessions for notifications
  const start = new Date();
  start.setDate(start.getDate() - 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setDate(end.getDate() + 7);
  end.setHours(23, 59, 59, 999);

  const s = await supabase
    .from("sessions")
    .select("*, patients(first_name, last_name)")
    .gte("session_date", start.toISOString())
    .lte("session_date", end.toISOString());

  if (!s.error) setSessions((s.data as Session[]) ?? []);
}, []);
  
  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  const filtered = patients.filter((p) =>
    `${p.first_name} ${p.last_name}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

if (loading) {
  return (
    <>
      <StatusBar style="light" />
      <ListSkeleton />
    </>
  );
}

  return (
    <View className={`flex-1 ${bg}`}>
      <StatusBar style={isDark ? "light" : "dark"} />

<View className="rounded-b-[40px] bg-purple-800 pb-8 pt-8">
  {/* Top row */}
  <View className="flex-row items-center justify-between px-5">
    <ProfileMenu onOpenProfile={onOpenProfile} onOpenAbout={onOpenAbout} />

    <View className="flex-1 flex-row items-center justify-center gap-2">
      <View className="h-6 w-6 items-center justify-center rounded-md bg-white">
        <Text className="text-xs font-extrabold text-purple-800">D</Text>
      </View>
      <Text className="text-lg font-extrabold tracking-tight text-white">
        Patients
      </Text>
    </View>

    <HeaderActions
      sessions={sessions}
      onSelectPatient={(id) => onSelectPatient(id)}
    />
  </View>

  {/* Stats row */}
  <View className="mt-6 flex-row items-center gap-4 px-5">
    <View className="flex-1">
      <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-200">
        Directory
      </Text>
      <Text className="mt-1 text-2xl font-extrabold text-white">
        All patients
      </Text>
      <Text className="mt-1 text-xs text-purple-200">
        {patients.length} patient{patients.length === 1 ? "" : "s"} on record
      </Text>
    </View>
    <Pressable
      onPress={() => setShowAddModal(true)}
      className="flex-row items-center gap-1 rounded-2xl bg-white/15 px-4 py-2.5"
    >
      <Feather name="plus" size={16} color="#ffffff" />
      <Text className="text-xs font-bold text-white">Add</Text>
    </Pressable>
  </View>
</View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7c3aed"
          />
        }
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-5 pt-4">
          <View
            className={`mb-4 flex-row items-center gap-2 rounded-2xl border px-4 py-2 ${inputBorder} ${inputBg}`}
          >
            <Feather name="search" size={18} color="#94a3b8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search patients"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              className={`flex-1 text-sm ${inputText}`}
            />
            {search ? (
              <Pressable onPress={() => setSearch("")}>
                <Feather name="x" size={16} color="#94a3b8" />
              </Pressable>
            ) : null}
          </View>

          {error ? (
            <View className="mb-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          ) : null}

          <View
            className={`overflow-hidden rounded-2xl border ${cardBorder} ${cardBg}`}
            style={cardShadow}
          >
            {filtered.map((p, idx) => (
              <Pressable
                key={p.id}
                onPress={() => onSelectPatient(p.id!)}
                className={`flex-row items-center gap-3 p-4 ${
                  idx !== filtered.length - 1 ? `border-b ${rowBorder}` : ""
                }`}
              >
                <View
                  className={`h-11 w-11 items-center justify-center rounded-full ${avatarBg}`}
                >
                  <Text className={`text-xs font-extrabold ${avatarText}`}>
                    {p.first_name.charAt(0)}
                    {p.last_name.charAt(0)}
                  </Text>
                </View>
                <View className="flex-1">
                  <Text className={`text-sm font-bold ${headingText}`}>
                    {p.first_name} {p.last_name}
                  </Text>
                  <Text className={`mt-1 text-xs ${bodyText}`}>
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

            {filtered.length === 0 && (
              <View className="px-5 py-10">
                <Text
                  className={`text-center text-sm font-semibold ${headingText}`}
                >
                  No patients found
                </Text>
                <Text className={`mt-1 text-center text-sm ${bodyText}`}>
                  Try another name.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Bottom nav */}
      <BottomNav
        active="patients"
        onNavigate={(tab) => {
          if (tab === "home") onNavigateHome();
          if (tab === "schedule") onOpenSchedule();
          if (tab === "notes") onOpenNotes();
        }}
        onAdd={() => setShowAddModal(true)}
      />

      <PatientFormModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={load}
      />
    </View>
  );
}