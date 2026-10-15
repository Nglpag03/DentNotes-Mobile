import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import {
  format,
  isToday,
  isYesterday,
  parseISO,
  startOfDay,
  subDays,
} from "date-fns";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";
import type { Session, SessionStatus } from "../types";
import { cardShadow, statusColors } from "../lib/theme";
import SessionDetailSheet from "../components/SessionDetailSheet";
import SessionFormModal from "./SessionFormModal";
import ProfileMenu from "../components/ProfileMenu";
import HeaderActions from "../components/HeaderActions";
import BottomNav from "../components/BottomNav";
import { NotesSkeleton } from "../components/Skeleton";
import PatientFormModal from "./PatientFormModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  onSelectPatient: (id: string) => void;
  onNavigateHome: () => void;
  onOpenSchedule: () => void;
  onOpenPatients: () => void;
  onOpenProfile: () => void;
  onOpenAbout: () => void;
  onOpenSettings: () => void;
}

type Filter = "today" | "week" | "month" | "all";

const FILTER_LABEL: Record<Filter, string> = {
  today: "Today",
  week: "Week",
  month: "Month",
  all: "All",
};

const STATUS_LABEL: Record<SessionStatus, string> = {
  PLANNED: "Upcoming",
  "IN PROGRESS": "In Progress",
  COMPLETED: "Done",
};

export default function NotesScreen({
  onSelectPatient,
  onNavigateHome,
  onOpenSchedule,
  onOpenPatients,
  onOpenProfile,
  onOpenAbout,
  onOpenSettings,
}: Props) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filter, setFilter] = useState<Filter>("week");
  const [error, setError] = useState("");
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [showPatientForm, setShowPatientForm] = useState(false);

  // ── Theme tokens ─────────────────────────────────────────
  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";
  const labelText = isDark ? "text-slate-500" : "text-slate-400";
  const pillBg = isDark ? "bg-purple-950" : "bg-purple-100";
  const pillText = isDark ? "text-purple-200" : "text-purple-800";

  const load = useCallback(async () => {
    setError("");
    const start = subDays(new Date(), 60);
    start.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("sessions")
      .select("*, patients(first_name, last_name)")
      .gte("session_date", start.toISOString())
      .order("session_date", { ascending: false });

    if (error) setError(error.message);
    else setSessions((data as Session[]) ?? []);
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

  async function changeStatus(sessionId: string, next: SessionStatus) {
    const prev = sessions.find((x) => x.id === sessionId)?.status;
    if (!prev || prev === next) return;
    setSessions((list) =>
      list.map((x) => (x.id === sessionId ? { ...x, status: next } : x)),
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
        list.map((x) =>
          x.id === sessionId ? { ...x, status: prev as SessionStatus } : x,
        ),
      );
      setSelectedSession((s) =>
        s && s.id === sessionId ? { ...s, status: prev as SessionStatus } : s,
      );
    }
  }

  // Filter sessions based on the selected range
  const visible = useMemo(() => {
    const now = new Date();
    let minDate: Date | null = null;

    if (filter === "today") minDate = startOfDay(now);
    else if (filter === "week") minDate = subDays(startOfDay(now), 6);
    else if (filter === "month") minDate = subDays(startOfDay(now), 29);

    if (!minDate) return sessions;
    return sessions.filter((s) => parseISO(s.session_date) >= minDate!);
  }, [sessions, filter]);

  // Group by day
  const groups = useMemo(() => {
    const map = new Map<string, Session[]>();
    visible.forEach((s) => {
      const date = parseISO(s.session_date);
      const key = format(date, "yyyy-MM-dd");
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([key, list]) => {
        const date = parseISO(key);
        let label = format(date, "EEEE, MMM d");
        if (isToday(date)) label = "Today";
        else if (isYesterday(date)) label = "Yesterday";
        return { label, date, sessions: list };
      });
  }, [visible]);

if (loading) {
  return (
    <View className="flex-1">
      <StatusBar style="light" />
      <NotesSkeleton />
      <BottomNav
        active="notes"
        onNavigate={(tab) => {
          if (tab === "home") onNavigateHome();
         if (tab === "schedule") onOpenSchedule();
          if (tab === "patients") onOpenPatients();
        }}
       onAdd={() => setShowPatientForm(true)}
      />
    </View>
  );
}

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
        {/* ─── Hero header ─── */}
        <View
          className="rounded-b-[40px] bg-purple-800 pb-10"
          style={{ paddingTop: insets.top + 12 }}
        >
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
                Notes
              </Text>
            </View>

            <View className="w-24 items-end">
              <HeaderActions
                sessions={sessions}
                onOpenSchedule={onOpenSchedule}
                onSelectPatient={onSelectPatient}
              />
            </View>
          </View>

          {/* Title */}
          <View className="mt-6 px-5">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-200">
              Documentation
            </Text>
            <Text className="mt-1 text-2xl font-extrabold text-white">
              Clinical notes
            </Text>
            <Text className="mt-1 text-xs text-purple-200">
              {visible.length} note{visible.length === 1 ? "" : "s"} ·{" "}
              {FILTER_LABEL[filter]}
            </Text>
          </View>

          {/* Filter chips */}
          <View className="mt-5 flex-row gap-2 px-5">
            {(["today", "week", "month", "all"] as Filter[]).map((f) => {
              const active = filter === f;
              return (
                <Pressable
                  key={f}
                  onPress={() => setFilter(f)}
                  className={`rounded-full px-4 py-2 ${
                    active ? "bg-white" : "bg-white/10"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      active ? "text-purple-800" : "text-white"
                    }`}
                  >
                    {FILTER_LABEL[f]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* ─── Notes feed ─── */}
        <View className="mt-6 px-5">
          {error ? (
            <View className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          ) : null}

          {groups.length === 0 ? (
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
                <Feather name="file-text" size={28} color="#7c3aed" />
              </View>
              <Text className={`mt-4 text-base font-bold ${headingText}`}>
                No notes {filter === "all" ? "yet" : `for this ${filter}`}
              </Text>
              <Text className={`mt-1 text-center text-sm ${bodyText}`}>
                {filter === "all"
                  ? "Check-ups you record will appear here."
                  : "Try a wider time range."}
              </Text>
            </View>
          ) : (
            groups.map((group) => (
              <View key={group.label} className="mb-6">
                {/* Group header */}
                <View className="mb-3 flex-row items-center gap-2">
                  <Text
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      group.label === "Today" ? "text-purple-600" : labelText
                    }`}
                  >
                    {group.label}
                  </Text>
                  <View className={`rounded-full px-2 py-0.5 ${pillBg}`}>
                    <Text className={`text-[10px] font-bold ${pillText}`}>
                      {group.sessions.length}
                    </Text>
                  </View>
                </View>

                {/* Session cards — match Dashboard layout */}
                <View className="gap-3">
                  {group.sessions.map((s) => (
                    <Pressable
                      key={s.id}
                      onPress={() => setSelectedSession(s)}
                      className={`flex-row items-center gap-4 rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
                      style={cardShadow}
                    >
                      {/* Time column */}
                      <View className="w-16 shrink-0">
                        <Text
                          className={`text-xl font-extrabold leading-none ${headingText}`}
                        >
                          {format(parseISO(s.session_date), "HH:mm")}
                        </Text>
                        {s.room ? (
                          <View className="mt-1.5 flex-row items-center gap-1">
                            <Feather name="clock" size={10} color="#94a3b8" />
                            <Text className={`text-[10px] font-medium ${bodyText}`}>
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
                        <Text
                          className={`text-base font-extrabold leading-tight ${headingText}`}
                          numberOfLines={1}
                        >
                          {s.patients?.first_name} {s.patients?.last_name}
                        </Text>
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
                          {STATUS_LABEL[s.status]}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* Bottom nav */}
      <BottomNav
        active="notes"
        onNavigate={(tab) => {
          if (tab === "home") onNavigateHome();
          if (tab === "schedule") onOpenSchedule();
          if (tab === "patients") onOpenPatients();
        }}
        onAdd={() => setShowPatientForm(true)}
      />

      {/* Session detail sheet */}
      <SessionDetailSheet
        visible={!!selectedSession}
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
        onStatusChange={changeStatus}
        onOpenPatient={(id) => {
          setSelectedSession(null);
          onSelectPatient(id);
        }}
        onEdit={(session) => {
          setSelectedSession(null);
          setEditingSession(session);
        }}
      />

      {/* Edit session modal */}
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

      {/* Add patient modal */}
      <PatientFormModal
        visible={showPatientForm}
        onClose={() => setShowPatientForm(false)}
        onSaved={() => {
          setShowPatientForm(false);
          load();
        }}
      />
    </View>
  );
}