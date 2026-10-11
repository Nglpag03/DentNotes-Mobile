import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import type { Patient, Session } from "../types";
import { cardShadow, statusColors } from "../lib/theme";
import BottomNav from "../components/BottomNav";

import WeeklyBarChart from "../components/WeeklyBarChart";
import { DashboardSkeleton } from "../components/Skeleton";
import PatientFormModal from "./PatientFormModal";
import SearchBar from "../components/SearchBar";


import SessionDetailSheet from "../components/SessionDetailSheet";
import SessionFormModal from "./SessionFormModal";
import type { SessionStatus } from "../types";
import ProfileMenu from "../components/ProfileMenu";
import HeaderActions from "../components/HeaderActions";

interface Props {
  onViewAllPatients: () => void;
  onOpenSchedule: () => void;
  onOpenSearch: () => void;
  onSelectPatient: (id: string) => void;
  onOpenNotes: () => void;
}

export default function DashboardScreen({
  onViewAllPatients,
  onOpenSchedule,
  onOpenSearch,
  onSelectPatient,
  onOpenNotes
}: Props) {
  const { session, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [upcoming, setUpcoming] = useState<Session[]>([]);
  const [error, setError] = useState("");


  const firstName = session?.user.user_metadata?.first_name || "Doctor";
  const lastName = session?.user.user_metadata?.last_name || "";
  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "DR";

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const todayLabel = format(new Date(), "EEEE, MMM d");
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";
  const pillBg = isDark ? "bg-purple-950" : "bg-purple-100";
  const pillText = isDark ? "text-purple-200" : "text-purple-800";
  const rowBorder = isDark ? "border-slate-800" : "border-slate-100";

const load = useCallback(async () => {
  setError("");

  // Patients
  const p = await supabase
    .from("patients")
    .select("*")
    .order("created_at", { ascending: false });
  if (p.error) setError(p.error.message);
  else setPatients((p.data as Patient[]) ?? []);

  // Today's non-completed sessions (for Today's Schedule)
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const s = await supabase
    .from("sessions")
    .select("*, patients(first_name, last_name)")
    .neq("status", "COMPLETED")
    .gte("session_date", startOfDay.toISOString())
    .lte("session_date", endOfDay.toISOString())
    .order("session_date", { ascending: true });

  if (!s.error) setUpcoming((s.data as Session[]) ?? []);

  // 👇 NEW: Last 14 days (for the weekly chart)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 13);
  weekStart.setHours(0, 0, 0, 0);

  const w = await supabase
    .from("sessions")
    .select("*, patients(first_name, last_name)")
    .gte("session_date", weekStart.toISOString())
    .order("session_date", { ascending: true });

  if (!w.error) setWeekSessions((w.data as Session[]) ?? []);
}, []);

  const [weekSessions, setWeekSessions] = useState<Session[]>([]);

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

  async function changeSessionStatus(sessionId: string, next: SessionStatus) {
  const prev = upcoming.find((s) => s.id === sessionId)?.status;
  if (!prev || prev === next) return;

  // Optimistic update
  setUpcoming((list) =>
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
    // Rollback
    setUpcoming((list) =>
      list.map((s) =>
        s.id === sessionId ? { ...s, status: prev as SessionStatus } : s,
      ),
    );
    setSelectedSession((s) =>
      s && s.id === sessionId ? { ...s, status: prev as SessionStatus } : s,
    );
  }
}


    if (loading) {
      return (
        <>
          <StatusBar style="light" />
          <DashboardSkeleton />
        </>
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
            tintColor="#ffffff"
          />
        }
      >
        {/* Hero Header */}
        <View className="rounded-b-[40px] bg-purple-800 pb-10 pt-5">
          {/* Top row */}
<View className="flex-row items-center justify-between px-5">
  <ProfileMenu />

  <View className="flex-1 flex-row items-center justify-center gap-2">
    <View className="h-6 w-6 items-center justify-center rounded-md bg-white">
      <Text className="text-xs font-extrabold text-purple-800">D</Text>
    </View>
    <Text className="text-lg font-extrabold tracking-tight text-white">
      DentNotes
    </Text>
  </View>

  <HeaderActions
    sessions={upcoming}
    onOpenSchedule={onOpenSchedule}
    onSelectPatient={onSelectPatient} 
  />
</View>

          {/* Greeting row */}
          <View className="mt-6 flex-row items-center gap-4 px-5">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-white/20 ring-4 ring-white/10">
              <Text className="text-lg font-extrabold text-white">
                {initials}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-sm font-semibold text-purple-200">
                {greeting},
              </Text>
              <Text className="mt-0.5 text-2xl font-extrabold text-white">
                Dr. {firstName} {lastName}
              </Text>
              <Text className="mt-1 text-xs text-purple-200">
                {todayLabel} · {upcoming.length} appointment
                {upcoming.length === 1 ? "" : "s"} today
              </Text>
            </View>
          </View>

                    {/* Search bar */}
          <View className="mt-5 px-5">
            <SearchBar onPress={onOpenSearch} />
          </View>
        </View>

        {/* Stats */}
        <View className="-mt-6 flex-row gap-3 px-5">
          <View
            className="flex-1 rounded-3xl bg-purple-500 p-5"
            style={cardShadow}
          >
            <Text className="text-4xl font-extrabold text-white">
              {upcoming.length}
            </Text>
            <Text className="mt-2 text-xs font-semibold text-white/90">
              Today's appointments
            </Text>
            <Text className="mt-1 text-[10px] text-white/70">
              {upcoming.filter((s) => s.status === "COMPLETED").length} completed
            </Text>
          </View>

          <View
            className={`flex-1 rounded-3xl border p-5 ${cardBorder} ${cardBg}`}
            style={cardShadow}
          >
            <Text className={`text-4xl font-extrabold ${headingText}`}>
              {patients.length.toLocaleString()}
            </Text>
            <Text className={`mt-2 text-xs font-semibold ${bodyText}`}>
              Total patients
            </Text>
            <Text className={`mt-1 text-[10px] ${bodyText}`}>On record</Text>
          </View>
        </View>

        {/* Weekly Bar Chart */}
        <View className="mt-6 px-5">
          <WeeklyBarChart sessions={weekSessions} />
        </View>        

        {/* Today's Schedule */}
        <View className="mt-8 px-5">
          <View className="mb-3 flex-row items-end justify-between">
            <Text className={`text-xl font-extrabold ${headingText}`}>
              Today's Schedule
            </Text>
            <Pressable onPress={onOpenSchedule}>
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

          {upcoming.length > 0 ? (
            <View className="gap-3">
              {upcoming.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => setSelectedSession(s)}
                  className={`flex-row items-center gap-3 rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
                  style={cardShadow}
                >
                  <View className="w-16">
                    <Text className={`text-lg font-extrabold ${headingText}`}>
                      {format(parseISO(s.session_date), "HH:mm")}
                    </Text>
                    {s.room ? (
                      <View className="mt-0.5 flex-row items-center gap-1">
                        <Feather name="map-pin" size={10} color="#94a3b8" />
                        <Text className={`text-[10px] ${bodyText}`}>{s.room}</Text>
                      </View>
                    ) : null}
                  </View>

                  <View
                    className="h-10 w-1 rounded-full"
                    style={{
                      backgroundColor:
                        s.status === "COMPLETED"
                          ? "#10b981"
                          : s.status === "IN PROGRESS"
                            ? "#7c3aed"
                            : "#d8b4fe",
                    }}
                  />

                  <View className="flex-1">
                    <Text className={`text-sm font-extrabold ${headingText}`}>
                      {s.patients?.first_name} {s.patients?.last_name}
                    </Text>
                    <Text className={`mt-0.5 text-xs ${bodyText}`}>
                      {s.title}
                    </Text>
                  </View>

                  <View
                    style={{ backgroundColor: statusColors[s.status]?.bg }}
                    className="rounded-full px-3 py-1.5"
                  >
                    <Text
                      style={{ color: statusColors[s.status]?.text }}
                      className="text-[10px] font-bold"
                    >
                      {s.status === "PLANNED"
                        ? "Upcoming"
                        : s.status === "COMPLETED"
                          ? "Done"
                          : "In Progress"}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
          <View
            className={`items-center rounded-2xl border border-dashed px-5 py-10 ${
              isDark
                ? "border-purple-900/60 bg-[#1a1525]"
                : "border-purple-200 bg-white"
            }`}
          >
            <View
              className={`h-14 w-14 items-center justify-center rounded-2xl ${
                isDark ? "bg-purple-950" : "bg-purple-50"
              }`}
            >
              <Feather name="calendar" size={26} color="#7c3aed" />
            </View>
            <Text className={`mt-3 text-sm font-bold ${headingText}`}>
              No check-ups scheduled
            </Text>
            <Text className={`mt-1 text-xs ${bodyText}`}>
              Nothing on the books for today.
            </Text>
          </View>
          )}
        </View>

        {/* Recent Patients */}
        <View className="mt-8 px-5">
          <View className="mb-3 flex-row items-end justify-between">
            <Text className={`text-xl font-extrabold ${headingText}`}>
              Recent Patients
            </Text>
            <Pressable onPress={onViewAllPatients}>
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
                      <Text className={`mt-0.5 text-xs ${bodyText}`} numberOfLines={1}>
                        {p.condition || "No condition recorded"}
                      </Text>
                    </View>
                    <Text className={`text-[10px] ${bodyText}`}>
                      {p.created_at ? format(new Date(p.created_at), "MMM d") : ""}
                    </Text>
                    <Feather
                      name="chevron-right"
                      size={16}
                      color={isDark ? "#a78bfa" : "#c4b5fd"}
                    />
                  </Pressable>
                ))}
              </View>
            ) : (
  <View
    className={`items-center rounded-2xl border border-dashed px-5 py-10 ${
      isDark ? "border-purple-900/60 bg-[#1a1525]" : "border-purple-200 bg-white"
    }`}
  >
    <View
      className={`h-14 w-14 items-center justify-center rounded-2xl ${
        isDark ? "bg-purple-950" : "bg-purple-50"
      }`}
    >
      <Feather name="users" size={26} color="#7c3aed" />
    </View>
    <Text className={`mt-3 text-sm font-bold ${headingText}`}>
      No patients yet
    </Text>
    <Text className={`mt-1 text-xs ${bodyText}`}>
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