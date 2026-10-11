import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  addDays,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfDay,
} from "date-fns";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";
import type { Session, SessionStatus } from "../types";
import { cardShadow, statusColors } from "../lib/theme";
import SessionDetailSheet from "../components/SessionDetailSheet";
import BottomNav from "../components/BottomNav";
import PatientFormModal from "./PatientFormModal";
import ProfileMenu from "../components/ProfileMenu";
import HeaderActions from "../components/HeaderActions";
import { ScheduleSkeleton } from "../components/Skeleton";

interface Props {
  onSelectPatient: (id: string) => void;
  onNavigateHome: () => void;
  onOpenPatients: () => void;
  onOpenNotes: () => void;
}

const STATUS_LABEL: Record<SessionStatus, string> = {
  PLANNED: "Upcoming",
  "IN PROGRESS": "In Progress",
  COMPLETED: "Done",
};

export default function ScheduleScreen({
  onSelectPatient,
  onNavigateHome,
  onOpenPatients,
  onOpenNotes
}: Props) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));
  const [error, setError] = useState("");
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showPatientForm, setShowPatientForm] = useState(false);

  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";
  const pillBg = isDark ? "bg-purple-950" : "bg-purple-100";
  const pillText = isDark ? "text-purple-200" : "text-purple-800";

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 14 }, (_, i) => addDays(today, i - 7));
  }, []);

  const load = useCallback(async () => {
    setError("");
    const start = addDays(new Date(), -1);
    const end = addDays(new Date(), 14);
    end.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("sessions")
      .select("*, patients(first_name, last_name)")
      .gte("session_date", start.toISOString())
      .lte("session_date", end.toISOString())
      .order("session_date", { ascending: true });

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

  const daySessions = useMemo(
    () =>
      sessions.filter((s) => isSameDay(parseISO(s.session_date), selectedDay)),
    [sessions, selectedDay],
  );

  const groups = useMemo(() => {
    const buckets: Record<string, Session[]> = {
      Morning: [],
      Afternoon: [],
      Evening: [],
    };
    daySessions.forEach((s) => {
      const hour = parseISO(s.session_date).getHours();
      if (hour < 12) buckets.Morning.push(s);
      else if (hour < 17) buckets.Afternoon.push(s);
      else buckets.Evening.push(s);
    });
    return Object.entries(buckets)
      .filter(([, list]) => list.length > 0)
      .map(([label, list]) => ({ label, sessions: list }));
  }, [daySessions]);

  const countsByDay = useMemo(() => {
    const map = new Map<string, number>();
    sessions.forEach((s) => {
      const key = format(parseISO(s.session_date), "yyyy-MM-dd");
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [sessions]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfDay(addDays(now, -6));
    const weekEnd = addDays(startOfDay(now), 1);
    const todays = sessions.filter((s) =>
      isSameDay(parseISO(s.session_date), now),
    );
    const thisWeek = sessions.filter((s) => {
      const d = parseISO(s.session_date);
      return d >= weekStart && d < weekEnd;
    });
    const completed = todays.filter((s) => s.status === "COMPLETED").length;
    const total = todays.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { today: total, week: thisWeek.length, completed, pct };
  }, [sessions]);

  const selectedLabel = isToday(selectedDay)
    ? "Today"
    : format(selectedDay, "EEEE");

if (loading) {
  return (
    <>
      <StatusBar style="light" />
      <ScheduleSkeleton />
    </>
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
        {/* Hero header */}
        <View className="rounded-b-[40px] bg-purple-800 pb-8 pt-5">
          <View className="flex-row items-center justify-between px-5">
            {/* Left spacer (no back button — bottom nav is the navigator) */}
              <ProfileMenu />

              <View className="flex-1 flex-row items-center justify-center gap-2">
                <View className="h-6 w-6 items-center justify-center rounded-md bg-white">
                  <Text className="text-xs font-extrabold text-purple-800">D</Text>
                </View>
                <Text className="text-lg font-extrabold tracking-tight text-white">
                  Schedule
                </Text>
              </View>

              <HeaderActions
                sessions={sessions}
                onOpenSchedule={() => {}}
                onSelectPatient={(id) => onSelectPatient(id)}
              />
          </View>

          {/* Stats row */}
          <View className="mt-6 flex-row gap-3 px-5">
            <View className="flex-1 rounded-2xl bg-white/10 p-3.5">
              <Text className="text-2xl font-extrabold text-white">
                {stats.today}
              </Text>
              <Text className="mt-1 text-[10px] font-semibold text-purple-200">
                Today
              </Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white/10 p-3.5">
              <Text className="text-2xl font-extrabold text-white">
                {stats.week}
              </Text>
              <Text className="mt-1 text-[10px] font-semibold text-purple-200">
                This week
              </Text>
            </View>
            <View className="flex-1 rounded-2xl bg-white/10 p-3.5">
              <Text className="text-2xl font-extrabold text-white">
                {stats.pct}%
              </Text>
              <Text className="mt-1 text-[10px] font-semibold text-purple-200">
                Done today
              </Text>
            </View>
          </View>
        </View>

        {/* Week strip */}
        <View className="mt-6">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: 8,
              paddingHorizontal: 20,
              paddingVertical: 4,
            }}
          >
            {days.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const count = countsByDay.get(key) || 0;
              const active = isSameDay(day, selectedDay);
              const today = isToday(day);

              return (
                <Pressable
                  key={key}
                  onPress={() => setSelectedDay(startOfDay(day))}
                  className={`h-24 w-16 items-center justify-center rounded-2xl border ${
                    active
                      ? "border-purple-700 bg-purple-700"
                      : today
                        ? isDark
                          ? "border-purple-500 " + cardBg
                          : "border-purple-300 " + cardBg
                        : cardBorder + " " + cardBg
                  }`}
                  style={active ? cardShadow : undefined}
                >
                  <Text
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      active ? "text-purple-200" : bodyText
                    }`}
                  >
                    {format(day, "EEE")}
                  </Text>
                  <Text
                    className={`mt-1 text-2xl font-extrabold ${
                      active ? "text-white" : headingText
                    }`}
                  >
                    {format(day, "d")}
                  </Text>
                  {count > 0 ? (
                    <View
                      className={`mt-1.5 rounded-full px-2 py-0.5 ${
                        active
                          ? "bg-purple-500"
                          : isDark
                            ? "bg-purple-900/60"
                            : "bg-purple-100"
                      }`}
                    >
                      <Text
                        className={`text-[9px] font-bold ${
                          active
                            ? "text-white"
                            : isDark
                              ? "text-purple-200"
                              : "text-purple-800"
                        }`}
                      >
                        {count}
                      </Text>
                    </View>
                  ) : (
                    <View className="mt-1.5 h-4" />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Selected day header */}
        <View className="mt-6 flex-row items-end justify-between px-5">
          <View>
            <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
              {selectedLabel}
            </Text>
            <Text className={`mt-1 text-2xl font-extrabold ${headingText}`}>
              {format(selectedDay, "MMMM d")}
            </Text>
          </View>
          <View className={`rounded-full px-3 py-1.5 ${pillBg}`}>
            <Text className={`text-[11px] font-bold ${pillText}`}>
              {daySessions.length} session{daySessions.length === 1 ? "" : "s"}
            </Text>
          </View>
        </View>

        {error ? (
          <View className="mx-5 mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
            <Text className="text-sm text-red-700">{error}</Text>
          </View>
        ) : null}

        {/* Sessions */}
        <View className="mt-5 px-5">
          {daySessions.length === 0 ? (
            <View
              className={`items-center rounded-[24px] border border-dashed px-6 py-14 ${
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
                <Feather name="calendar" size={28} color="#7c3aed" />
              </View>
              <Text className={`mt-4 text-base font-bold ${headingText}`}>
                Nothing scheduled {selectedLabel.toLowerCase()}
              </Text>
              <Text className={`mt-1 text-center text-sm ${bodyText}`}>
                Tap another day in the strip above.
              </Text>
            </View>
          ) : (
            <View className="gap-6">
              {groups.map((group) => (
                <View key={group.label}>
                  <View className="mb-3 flex-row items-center gap-2">
                    <Text className="text-[11px] font-bold uppercase tracking-widest text-purple-600">
                      {group.label}
                    </Text>
                    <View className={`rounded-full px-2 py-0.5 ${pillBg}`}>
                      <Text className={`text-[10px] font-bold ${pillText}`}>
                        {group.sessions.length}
                      </Text>
                    </View>
                  </View>

                  <View className="gap-3">
                    {group.sessions.map((s) => (
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
                          <View className="mt-0.5 flex-row items-center gap-1">
                            <Feather name="map-pin" size={10} color="#94a3b8" />
                            <Text className={`text-[10px] ${bodyText}`}>
                              {s.room || "—"}
                            </Text>
                          </View>
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
                          <Text
                            className={`text-sm font-extrabold ${headingText}`}
                            numberOfLines={1}
                          >
                            {s.patients?.first_name} {s.patients?.last_name}
                          </Text>
                          <Text
                            className={`mt-0.5 text-xs ${bodyText}`}
                            numberOfLines={1}
                          >
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
                            {STATUS_LABEL[s.status]}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Bottom nav */}
      <BottomNav
        active="schedule"
        onNavigate={(tab) => {
          if (tab === "home") onNavigateHome();
          if (tab === "patients") onOpenPatients();
          if (tab === "notes") onOpenNotes();
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
          onSelectPatient(session.patient_id);
        }}
      />

      {/* Add patient modal */}
      <PatientFormModal
        visible={showPatientForm}
        onClose={() => setShowPatientForm(false)}
        onSaved={load}
      />
    </View>
  );
}