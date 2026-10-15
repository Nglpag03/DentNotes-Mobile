import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { format } from "date-fns";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import type { Patient, Session, SessionStatus } from "../types";
import { cardShadow, statusColors } from "../lib/theme";
import BottomNav from "../components/BottomNav";
import WeeklyBarChart from "../components/WeeklyBarChart";
import { DashboardSkeleton } from "../components/Skeleton";
import PatientFormModal from "./PatientFormModal";
import SearchBar from "../components/SearchBar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SessionDetailSheet from "../components/SessionDetailSheet";
import SessionFormModal from "./SessionFormModal";
import ProfileMenu from "../components/ProfileMenu";
import HeaderActions from "../components/HeaderActions";
import Avatar from "../components/Avatar";

interface Props {
  onViewAllPatients: () => void;
  onOpenSchedule: () => void;
  onOpenSearch: () => void;
  onSelectPatient: (id: string) => void;
  onOpenNotes: () => void;
  onOpenProfile: () => void;
  onOpenAbout: () => void;
  onOpenSettings: () => void;
}

const STALE_AFTER_MS = 5 * 60 * 1000;

function safeDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function statusLabel(status: SessionStatus | string) {
  return status === "PLANNED"
    ? "Upcoming"
    : status === "COMPLETED"
      ? "Done"
      : "In Progress";
}

function getGreeting(hour: number) {
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 22) return "Good evening";
  return "Working late"; // 10 PM – 5 AM
}

export default function DashboardScreen({
  onViewAllPatients,
  onOpenSchedule,
  onOpenSearch,
  onSelectPatient,
  onOpenNotes,
  onOpenProfile,
  onOpenAbout,
  onOpenSettings,
}: Props) {
  const { session } = useAuth();
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientCount, setPatientCount] = useState(0);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loadFailed, setLoadFailed] = useState(false);

  const [showPatientForm, setShowPatientForm] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const avatarUrl = session?.user.user_metadata?.avatar_url ?? null;
  const hasName = Boolean(session?.user.user_metadata?.first_name);
  const firstName = session?.user.user_metadata?.first_name || "";
  const lastName = session?.user.user_metadata?.last_name || "";
  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "";

  const displayName = hasName
    ? `Dr. ${[firstName, lastName].filter(Boolean).join(" ")}`
    : "Welcome back";

  const greeting = getGreeting(new Date().getHours());
  const todayLabel = format(new Date(), "EEEE, MMM d");

  // ── Theme tokens ─────────────────────────────────────────
  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";
  const pillBg = isDark ? "bg-purple-950" : "bg-purple-100";
  const pillText = isDark ? "text-purple-200" : "text-purple-800";
  const emptyBorder = isDark
    ? "border-purple-900/60 bg-[#1a1525]"
    : "border-purple-200 bg-white";
  const emptyIconBg = isDark ? "bg-purple-950" : "bg-purple-50";

  // ── Derived data ─────────────────────────────────────────
  const todaySessions = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    return sessions.filter((s) => {
      const d = safeDate(s.session_date);
      return d !== null && d >= start && d <= end;
    });
  }, [sessions]);

  const completedToday = todaySessions.filter(
    (s) => s.status === "COMPLETED",
  ).length;

  const pendingToday = useMemo(
    () => todaySessions.filter((s) => s.status !== "COMPLETED"),
    [todaySessions],
  );

  // ── Load ────────────────────────────────────────────────
  const loadId = useRef(0);
  const lastLoadedAt = useRef(0);

  const load = useCallback(async () => {
    const id = ++loadId.current;

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 13);
    weekStart.setHours(0, 0, 0, 0);

    try {
      const [p, s] = await Promise.all([
        supabase
          .from("patients")
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("sessions")
          .select("*, patients(first_name, last_name)")
          .gte("session_date", weekStart.toISOString())
          .order("session_date", { ascending: true }),
      ]);

      if (id !== loadId.current) return;

      if (!p.error) {
        const rows = (p.data as Patient[]) ?? [];
        setPatients(rows);
        setPatientCount(p.count ?? rows.length);
      } else {
        console.error("Patients load failed:", p.error.message);
      }

      if (!s.error) {
        setSessions((s.data as Session[]) ?? []);
      } else {
        console.error("Sessions load failed:", s.error.message);
      }

      setLoadFailed(Boolean(p.error || s.error));
      if (!p.error && !s.error) lastLoadedAt.current = Date.now();
    } catch (e) {
      if (id !== loadId.current) return;
      console.error("Dashboard load failed:", e);
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

  async function changeSessionStatus(sessionId: string, next: SessionStatus) {
    const prev = sessions.find((s) => s.id === sessionId)?.status;
    if (!prev || prev === next) return;

    setSessions((list) =>
      list.map((s) => (s.id === sessionId ? { ...s, status: next } : s)),
    );
    setSelectedSession((s) =>
      s && s.id === sessionId ? { ...s, status: next } : s,
    );

    const { error } = await supabase
      .from("sessions")
      .update({ status: next })
      .eq("id", sessionId);

    if (error) {
      setSessions((list) =>
        list.map((s) =>
          s.id === sessionId ? { ...s, status: prev as SessionStatus } : s,
        ),
      );
      setSelectedSession((s) =>
        s && s.id === sessionId ? { ...s, status: prev as SessionStatus } : s,
      );
      Alert.alert(
        "Couldn't update appointment",
        "The status wasn't changed. Please check your connection and try again.",
      );
    }
  }

if (loading) {
  return (
    <View className="flex-1">
      <StatusBar style="light" />
      <DashboardSkeleton />
      <BottomNav
        active="home"
        onNavigate={(tab) => {
          if (tab === "schedule") onOpenSchedule();
          if (tab === "patients") onViewAllPatients();
          if (tab === "notes") onOpenNotes();
        }}
       onAdd={() => setShowPatientForm(true)}
      />
    </View>
  );
}

  const recentPatients = patients.slice(0, 5);

  return (
    <View className={`flex-1 ${bg}`}>
      <StatusBar style="light" />

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
      >
        {/* ─── Hero ─── */}
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
              <Text className="text-lg font-extrabold tracking-tight text-white">
                DentNotes
              </Text>
            </View>

            <HeaderActions
              sessions={pendingToday}
              onOpenSchedule={onOpenSchedule}
              onSelectPatient={onSelectPatient}
            />
          </View>

          {/* Greeting row */}
          <View className="mt-6 flex-row items-center gap-4 px-5">
            {hasName ? (
              <Avatar
                url={avatarUrl}
                initials={initials}
                size={64}
                ring
                variant="onPurple"
              />
            ) : (
              <View
                className="h-16 w-16 items-center justify-center rounded-full bg-white/20"
                style={{ borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" }}
              >
                <Feather name="user" size={28} color="#ffffff" />
              </View>
            )}

            <View className="min-w-0 flex-1">
              <Text className="text-sm font-semibold text-purple-200">
                {greeting},
              </Text>
              <Text
                className="mt-0.5 text-2xl font-extrabold text-white"
                numberOfLines={1}
              >
                {displayName}
              </Text>
              <Text className="mt-1 text-xs text-purple-200">
                {todayLabel} · {todaySessions.length} appointment
                {todaySessions.length === 1 ? "" : "s"} today
              </Text>
            </View>
          </View>

          {/* Search bar */}
          <View className="mt-5 px-5">
            <SearchBar onPress={onOpenSearch} />
          </View>
        </View>

        {/* ─── Load failed banner (moved above stats) ─── */}
        {loadFailed ? (
          <View className="mt-4 px-5">
            <View
              accessibilityRole="alert"
              className={`flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${
                isDark
                  ? "border-red-900/40 bg-red-950/40"
                  : "border-red-100 bg-red-50"
              }`}
            >
              <Feather
                name="alert-circle"
                size={16}
                color={isDark ? "#fca5a5" : "#dc2626"}
              />
              <Text
                className={`flex-1 text-sm leading-5 ${
                  isDark ? "text-red-300" : "text-red-700"
                }`}
              >
                Some data couldn't load. What you see may be outdated.
              </Text>
              <Pressable
                onPress={onRefresh}
                hitSlop={10}
                accessibilityRole="button"
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
          </View>
        ) : null}

        {/* ─── Stats ─── */}
        <View className="-mt-6 flex-row gap-3 px-5">
          <View
            accessible
            accessibilityLabel={`Today's appointments: ${todaySessions.length}, ${completedToday} completed`}
            className="flex-1 rounded-3xl bg-purple-500 p-5"
            style={cardShadow}
          >
            <Text className="text-4xl font-extrabold text-white">
              {todaySessions.length}
            </Text>
            <Text className="mt-2 text-xs font-semibold text-white/90">
              Today's appointments
            </Text>
            <Text className="mt-1 text-[10px] text-white/70">
              {completedToday} completed
            </Text>
          </View>

          <View
            accessible
            accessibilityLabel={`Total patients: ${patientCount}`}
            className={`flex-1 rounded-3xl border p-5 ${cardBorder} ${cardBg}`}
            style={cardShadow}
          >
            <Text className={`text-4xl font-extrabold ${headingText}`}>
              {patientCount.toLocaleString()}
            </Text>
            <Text className={`mt-2 text-xs font-semibold ${bodyText}`}>
              Total patients
            </Text>
            <Text className={`mt-1 text-[10px] ${bodyText}`}>On record</Text>
          </View>
        </View>

        {/* ─── Weekly Chart ─── */}
        <View className="mt-6 px-5">
          <WeeklyBarChart sessions={sessions} />
        </View>

        {/* ─── Today's Schedule ─── */}
        <View className="mt-8 px-5">
          <View className="mb-3 flex-row items-end justify-between">
            <Text className={`text-xl font-extrabold ${headingText}`}>
              Today's Schedule
            </Text>
            <Pressable
              onPress={onOpenSchedule}
              hitSlop={10}
              accessibilityRole="button"
              className="active:opacity-70"
            >
              <View
                className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${pillBg}`}
              >
                <Text className={`text-[11px] font-bold ${pillText}`}>
                  View all
                </Text>
                <Text className={`text-[11px] ${pillText}`}>›</Text>
              </View>
            </Pressable>
          </View>

          {todaySessions.length > 0 ? (
            <View className="gap-3">
              {todaySessions.map((s) => {
                const when = safeDate(s.session_date);
                const timeText = when ? format(when, "HH:mm") : "--:--";
                const patientName =
                  `${s.patients?.first_name ?? ""} ${s.patients?.last_name ?? ""}`.trim();

                return (
                  <Pressable
                    key={s.id}
                    onPress={() => setSelectedSession(s)}
                    accessibilityRole="button"
                    accessibilityLabel={`${timeText}, ${patientName || "Patient"}, ${s.title}, ${statusLabel(s.status)}`}
                    accessibilityHint="Opens appointment details"
                    className={`flex-row items-center gap-4 rounded-2xl border p-4 active:opacity-80 ${cardBorder} ${cardBg}`}
                    style={cardShadow}
                  >
                    {/* Time column */}
                    <View className="w-16 shrink-0">
                      <Text
                        className={`text-xl font-extrabold leading-none ${headingText}`}
                      >
                        {timeText}
                      </Text>
                      {s.room ? (
                        <View className="mt-1.5 flex-row items-center gap-1">
                          <Feather name="clock" size={10} color="#94a3b8" />
                          <Text
                            className={`text-[10px] font-medium ${bodyText}`}
                            numberOfLines={1}
                          >
                            {s.room}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {/* Accent bar */}
                    <View
                      className="h-12 w-[3px] shrink-0 rounded-full"
                      style={{
                        backgroundColor:
                          s.status === "COMPLETED"
                            ? "#10b981"
                            : s.status === "IN PROGRESS"
                              ? "#7c3aed"
                              : "#d8b4fe",
                      }}
                    />

                    {/* Patient + treatment */}
                    <View className="min-w-0 flex-1">
                      {patientName ? (
                        <Text
                          className={`text-base font-extrabold leading-tight ${headingText}`}
                          numberOfLines={1}
                        >
                          {patientName}
                        </Text>
                      ) : (
                        <Text
                          className={`text-base font-extrabold italic leading-tight ${bodyText}`}
                          numberOfLines={1}
                        >
                          Patient
                        </Text>
                      )}
                      <Text
                        className={`mt-0.5 text-sm ${bodyText}`}
                        numberOfLines={1}
                      >
                        {s.title}
                      </Text>
                    </View>

                    {/* Status pill */}
                    <View
                      style={{ backgroundColor: statusColors[s.status]?.bg }}
                      className="shrink-0 rounded-full px-3.5 py-1.5"
                    >
                      <Text
                        style={{ color: statusColors[s.status]?.text }}
                        className="text-[10px] font-bold"
                      >
                        {statusLabel(s.status)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View
              className={`items-center rounded-2xl border border-dashed px-5 py-12 ${emptyBorder}`}
            >
              <View
                className={`h-16 w-16 items-center justify-center rounded-2xl ${emptyIconBg}`}
              >
                <Feather name="calendar" size={28} color="#7c3aed" />
              </View>
              <Text className={`mt-4 text-base font-bold ${headingText}`}>
                No check-ups scheduled
              </Text>
              <Text className={`mt-1 text-center text-sm ${bodyText}`}>
                Nothing on the books for today.
              </Text>
            </View>
          )}
        </View>

        {/* ─── Recent Patients ─── */}
        <View className="mt-8 px-5">
          <View className="mb-3 flex-row items-end justify-between">
            <Text className={`text-xl font-extrabold ${headingText}`}>
              Recent Patients
            </Text>
            <Pressable
              onPress={onViewAllPatients}
              hitSlop={10}
              accessibilityRole="button"
              className="active:opacity-70"
            >
              <View
                className={`flex-row items-center gap-1 rounded-full px-3 py-1.5 ${pillBg}`}
              >
                <Text className={`text-[11px] font-bold ${pillText}`}>
                  See all
                </Text>
                <Text className={`text-[11px] ${pillText}`}>›</Text>
              </View>
            </Pressable>
          </View>

          {recentPatients.length > 0 ? (
            <View className="gap-3">
              {recentPatients.map((p) => (
                <Pressable
                  key={p.id}
                  onPress={() => onSelectPatient(p.id!)}
                  accessibilityRole="button"
                  accessibilityLabel={`${p.first_name} ${p.last_name}, ${p.condition || "No condition recorded"}`}
                  className={`flex-row items-center gap-4 rounded-2xl border p-4 active:opacity-80 ${cardBorder} ${cardBg}`}
                  style={cardShadow}
                >
                  <View
                    className={`h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                      isDark ? "bg-purple-900/40" : "bg-purple-100"
                    }`}
                  >
                    <Text
                      className={`text-sm font-extrabold ${
                        isDark ? "text-purple-200" : "text-purple-800"
                      }`}
                    >
                      {p.first_name.charAt(0)}
                      {p.last_name.charAt(0)}
                    </Text>
                  </View>

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

                  <Text className={`shrink-0 text-[10px] ${bodyText}`}>
                    {safeDate(p.created_at)
                      ? format(safeDate(p.created_at)!, "MMM d")
                      : ""}
                  </Text>

                  <Feather
                    name="chevron-right"
                    size={18}
                    color={isDark ? "#a78bfa" : "#c4b5fd"}
                  />
                </Pressable>
              ))}
            </View>
          ) : (
            <View
              className={`items-center rounded-2xl border border-dashed px-5 py-12 ${emptyBorder}`}
            >
              <View
                className={`h-16 w-16 items-center justify-center rounded-2xl ${emptyIconBg}`}
              >
                <Feather name="users" size={28} color="#7c3aed" />
              </View>
              <Text className={`mt-4 text-base font-bold ${headingText}`}>
                No patients yet
              </Text>
              <Text className={`mt-1 text-center text-sm ${bodyText}`}>
                Tap + to add your first patient.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <BottomNav
        active="home"
        onNavigate={(tab) => {
          if (tab === "schedule") onOpenSchedule();
          if (tab === "patients") onViewAllPatients();
          if (tab === "notes") onOpenNotes();
        }}
        onAdd={() => setShowPatientForm(true)}
      />

      <PatientFormModal
        visible={showPatientForm}
        onClose={() => setShowPatientForm(false)}
        onSaved={load}
      />

      <SessionDetailSheet
        visible={!!selectedSession}
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        onStatusChange={changeSessionStatus}
        onOpenPatient={(patientId) => {
          setSelectedSession(null);
          onSelectPatient(patientId);
        }}
        onEdit={(session) => {
          setSelectedSession(null);
          setEditingSession(session);
        }}
      />

      <SessionFormModal
        key={editingSession?.id ?? "new-session"}
        visible={!!editingSession}
        patientId={editingSession?.patient_id ?? ""}
        session={editingSession}
        onClose={() => setEditingSession(null)}
        onSaved={() => {
          setEditingSession(null);
          load();
        }}
      />
    </View>
  );
}