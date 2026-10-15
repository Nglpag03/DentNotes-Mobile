import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppState,
  Keyboard,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  onSelectPatient: (id: string) => void;
  onNavigateHome: () => void;
  onOpenSchedule: () => void;
  onOpenNotes: () => void;
  onOpenProfile: () => void;
  onOpenAbout: () => void;
  onOpenSettings: () => void;
}

// Refresh on return to the app if the data is older than this.
const STALE_AFTER_MS = 5 * 60 * 1000;

// Lower-case and strip accents so "jose" finds "José".
function normalize(value: string) {
  const lower = value.toLowerCase();
  try {
    return lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  } catch {
    return lower.trim();
  }
}

// Deterministic pastel avatar color per patient.
// Avoids red (reserved for alerts).
const AVATAR_HUES = [260, 280, 220, 200, 175, 150, 40, 20];

function avatarColor(id: string | undefined) {
  if (!id) return { bg: "hsl(260, 70%, 92%)", text: "hsl(260, 55%, 30%)" };
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0;
  }
  const hue = AVATAR_HUES[Math.abs(hash) % AVATAR_HUES.length];
  return {
    bg: `hsl(${hue}, 70%, 92%)`,
    text: `hsl(${hue}, 55%, 30%)`,
  };
}

export default function PatientsScreen({
  onSelectPatient,
  onNavigateHome,
  onOpenSchedule,
  onOpenNotes,
  onOpenProfile,
  onOpenAbout,
  onOpenSettings,
}: Props) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [loadFailed, setLoadFailed] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";

  const inputBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const inputBorder = isDark ? "border-purple-900/40" : "border-slate-200";
  const inputText = isDark ? "text-white" : "text-slate-900";
  const insets = useSafeAreaInsets();

  // Guards against an older, slower request overwriting a newer one.
  const loadId = useRef(0);
  const lastLoadedAt = useRef(0);

  const load = useCallback(async () => {
    const id = ++loadId.current;

    // Only today's pending appointments are needed (for the header bell),
    // the same data the dashboard gives it.
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date();
    dayEnd.setHours(23, 59, 59, 999);

    try {
      // Both requests run at the same time instead of one after another.
      const [p, s] = await Promise.all([
        supabase
          .from("patients")
          // Only the columns this screen shows.
          .select("id, first_name, last_name, condition")
          .order("last_name")
          .order("first_name"),
        supabase
          .from("sessions")
          .select("*, patients(first_name, last_name)")
          .neq("status", "COMPLETED")
          .gte("session_date", dayStart.toISOString())
          .lte("session_date", dayEnd.toISOString())
          .order("session_date", { ascending: true }),
      ]);

      if (id !== loadId.current) return;

      if (p.error) {
        console.error("Patients load failed:", p.error.message);
        setLoadFailed(true);
      } else {
        setPatients((p.data as Patient[]) ?? []);
        setLoadFailed(false);
        lastLoadedAt.current = Date.now();
      }

      // The bell is secondary: if it fails, don't alarm the user.
      if (!s.error) setSessions((s.data as Session[]) ?? []);
    } catch (e) {
      if (id !== loadId.current) return;
      console.error("Patients load failed:", e);
      setLoadFailed(true);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  // Back in the app after a while? Refresh quietly.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (
        state === "active" &&
        Date.now() - lastLoadedAt.current > STALE_AFTER_MS
      ) {
        void load();
      }
    });
    return () => sub.remove();
  }, [load]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  // Smarter search: every word typed must match somewhere in the name or
  // condition, in any order ("doe jane" finds Jane Doe), ignoring accents
  // and stray spaces.
  const filtered = useMemo(() => {
    const tokens = normalize(search).split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return patients;

    return patients.filter((p) => {
      const haystack = normalize(
        `${p.first_name ?? ""} ${p.last_name ?? ""} ${p.condition ?? ""}`,
      );
      return tokens.every((t) => haystack.includes(t));
    });
  }, [patients, search]);

  const isFiltered = search.trim().length > 0;

if (loading) {
  return (
    <View className="flex-1">
      <StatusBar style="light" />
      <ListSkeleton />
      <BottomNav
        active="patients"
        onNavigate={(tab) => {
          if (tab === "home") onNavigateHome();
          if (tab === "schedule") onOpenSchedule();
          if (tab === "notes") onOpenNotes();
        }}
        onAdd={() => setShowAddModal(true)}
      />
    </View>
  );
}

  return (
    <View className={`flex-1 ${bg}`}>
      {/* The header behind the status bar is always purple, so the icons
          must always be light (they were dark in light mode). */}
      <StatusBar style="light" />

      <View
        className="rounded-b-[40px] bg-purple-800 pb-10"
        style={{ paddingTop: insets.top + 12 }}
      >
        {/* Top row */}
        <View className="flex-row items-center justify-between px-5">
          <View className="w-24">
            <ProfileMenu
              onOpenProfile={onOpenProfile}
              onOpenAbout={onOpenAbout}
              onOpenSettings={onOpenSettings}
            />
          </View>

          <View className="flex-1 flex-row items-center justify-center gap-2">
            <View className="h-6 w-6 items-center justify-center rounded-md bg-white">
              <Text className="text-xs font-extrabold text-purple-800">D</Text>
            </View>
            <Text
              accessibilityRole="header"
              className="text-lg font-extrabold tracking-tight text-white"
            >
              Patients
            </Text>
          </View>

          <HeaderActions
            sessions={sessions}
            onOpenSchedule={onOpenSchedule}
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
              {patients.length} patient{patients.length === 1 ? "" : "s"} on
              record
            </Text>
          </View>
          <Pressable
            onPress={() => setShowAddModal(true)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Add patient"
            className="flex-row items-center gap-1 rounded-2xl bg-white/15 px-4 py-2.5 active:opacity-70"
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
            colors={["#7c3aed"]}
          />
        }
        keyboardShouldPersistTaps="handled"
        // Scrolling the list puts the keyboard away so it never hides results.
        keyboardDismissMode="on-drag"
      >
        <View className="px-5 pt-5">
          {/* Search card */}
          <View
            className={`mb-4 flex-row items-center gap-2 rounded-2xl border px-4 py-2.5 ${inputBorder} ${inputBg}`}
            style={cardShadow}
          >
            <Feather name="search" size={18} color="#94a3b8" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search patients"
              placeholderTextColor="#94a3b8"
              accessibilityLabel={`Search patients. ${patients.length} on record.`}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => Keyboard.dismiss()}
              className={`flex-1 text-sm ${inputText}`}
            />
            {search ? (
              <Pressable
                onPress={() => setSearch("")}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <Feather name="x" size={16} color="#94a3b8" />
              </Pressable>
            ) : null}
          </View>

          {/* Count + clear link when searching */}
          {patients.length > 0 ? (
            <View className="mb-3 flex-row items-center justify-between">
              <Text
                className={`text-[11px] font-bold uppercase tracking-widest ${bodyText}`}
              >
                {isFiltered
                  ? `${filtered.length} of ${patients.length}`
                  : `${patients.length} patient${patients.length === 1 ? "" : "s"}`}
              </Text>
              {isFiltered ? (
                <Pressable
                  onPress={() => setSearch("")}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  className="active:opacity-70"
                >
                  <Text className="text-[11px] font-bold text-purple-600">
                    Clear
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {loadFailed ? (
            <View
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              className={`mb-3 flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${
                isDark
                  ? "border-red-900/40 bg-red-950/40"
                  : "border-red-100 bg-red-50"
              }`}
            >
              <Text
                className={`flex-1 text-sm ${
                  isDark ? "text-red-300" : "text-red-700"
                }`}
              >
                Couldn't load your patients.
                {patients.length > 0 ? " What you see may be out of date." : ""}
              </Text>
              <Pressable
                onPress={onRefresh}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Retry loading patients"
                className="active:opacity-70"
              >
                <Text
                  className={`text-sm font-bold ${
                    isDark ? "text-red-300" : "text-red-700"
                  }`}
                >
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : null}

          {filtered.length > 0 ? (
            <View className="gap-3">
              {filtered.map((p) => {
                const colors = avatarColor(p.id);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => onSelectPatient(p.id!)}
                    accessibilityRole="button"
                    accessibilityLabel={`${p.first_name ?? ""} ${p.last_name ?? ""}, ${p.condition || "No condition recorded"}`}
                    accessibilityHint="Opens patient record"
                    className={`flex-row items-center gap-4 rounded-2xl border p-4 active:opacity-80 ${cardBorder} ${cardBg}`}
                    style={cardShadow}
                  >
                    {/* Avatar — deterministic color per patient */}
                    <View
                      className="h-12 w-12 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: colors.bg }}
                    >
                      <Text
                        className="text-sm font-extrabold"
                        style={{ color: colors.text }}
                      >
                        {(p.first_name ?? "").charAt(0)}
                        {(p.last_name ?? "").charAt(0)}
                      </Text>
                    </View>

                    {/* Name + condition */}
                    <View className="min-w-0 flex-1">
                      <Text
                        className={`text-base font-extrabold leading-tight ${headingText}`}
                        numberOfLines={1}
                      >
                        {p.first_name} {p.last_name}
                      </Text>
                      <Text
                        className={`mt-0.5 text-sm ${bodyText}`}
                        numberOfLines={1}
                      >
                        {p.condition || "No condition recorded"}
                      </Text>
                    </View>

                    {/* Chevron */}
                    <Feather
                      name="chevron-right"
                      size={18}
                      color={isDark ? "#a78bfa" : "#c4b5fd"}
                    />
                  </Pressable>
                );
              })}
            </View>
          ) : loadFailed && patients.length === 0 ? null : (
            // (When loading failed and there is nothing to show, the error
            // banner above is the message. "Add your first patient" would be
            // misleading.)
            <View
              className={`items-center rounded-2xl border border-dashed px-5 py-14 ${
                isDark
                  ? "border-purple-900/60 bg-[#1a1525]"
                  : "border-purple-200 bg-white"
              }`}
            >
              <View
                className={`h-16 w-16 items-center justify-center rounded-2xl ${
                  isDark ? "bg-purple-950" : "bg-purple-50"
                }`}
              >
                <Feather
                  name={isFiltered ? "search" : "users"}
                  size={28}
                  color="#7c3aed"
                />
              </View>
              <Text className={`mt-4 text-base font-bold ${headingText}`}>
                {isFiltered ? "No matches" : "No patients found"}
              </Text>
              <Text className={`mt-1 text-center text-sm ${bodyText}`}>
                {isFiltered
                  ? `Nothing matches "${search.trim()}".`
                  : "Tap + to add your first patient."}
              </Text>
              {isFiltered ? (
                <Pressable
                  onPress={() => setSearch("")}
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  className="mt-4 rounded-full bg-purple-700 px-5 py-2.5 active:opacity-80"
                >
                  <Text className="text-xs font-bold text-white">
                    Clear search
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
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
        onSaved={() => {
          // Clear the filter so the new patient isn't hidden by it.
          setSearch("");
          load();
        }}
      />
    </View>
  );
}