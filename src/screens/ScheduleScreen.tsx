import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import {
  addDays,
  endOfDay,
  format,
  isSameDay,
  isToday,
  startOfDay,
} from "date-fns";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";
import type { Session, SessionStatus } from "../types";
import { cardShadow, statusColors } from "../lib/theme";
import SessionDetailSheet from "../components/SessionDetailSheet";
import BottomNav from "../components/BottomNav";
import PatientFormModal from "./PatientFormModal";
import SessionFormModal from "./SessionFormModal";
import ProfileMenu from "../components/ProfileMenu";
import HeaderActions from "../components/HeaderActions";
import { ScheduleSkeleton } from "../components/Skeleton";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface Props {
  onSelectPatient: (id: string) => void;
  onNavigateHome: () => void;
  onOpenPatients: () => void;
  onOpenNotes: () => void;
  onOpenProfile: () => void;
  onOpenAbout: () => void;
  onOpenSettings: () => void;
}

const STATUS_LABEL: Record<SessionStatus, string> = {
  PLANNED: "Upcoming",
  "IN PROGRESS": "In Progress",
  COMPLETED: "Done",
};

const DAYS_BACK = 7;
const DAYS_AHEAD = 6;

const DAY_WIDTH = 64;
const DAY_GAP = 8;
const STRIP_PADDING = 20;

const STALE_AFTER_MS = 5 * 60 * 1000;

const dateOf = (s: Session) => new Date(s.session_date);
const hasValidDate = (s: Session) => !isNaN(dateOf(s).getTime());

export default function ScheduleScreen({
  onSelectPatient,
  onNavigateHome,
  onOpenPatients,
  onOpenNotes,
  onOpenProfile,
  onOpenAbout,
  onOpenSettings,
}: Props) {
  const { isDark } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));
  const [loadFailed, setLoadFailed] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [todayKey, setTodayKey] = useState(format(new Date(), "yyyy-MM-dd"));

  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";
  const pillBg = isDark ? "bg-purple-950" : "bg-purple-100";
  const pillText = isDark ? "text-purple-200" : "text-purple-800";
  const insets = useSafeAreaInsets();

  const stripRef = useRef<ScrollView>(null);
  const stripPositioned = useRef(false);
  const listRef = useRef<ScrollView>(null);

  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: DAYS_BACK + DAYS_AHEAD + 1 }, (_, i) =>
      addDays(today, i - DAYS_BACK),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey]);

  const loadId = useRef(0);
  const lastLoadedAt = useRef(0);

  const load = useCallback(async () => {
    const id = ++loadId.current;

    const today = startOfDay(new Date());
    const start = addDays(today, -DAYS_BACK);
    const end = endOfDay(addDays(today, DAYS_AHEAD));

    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*, patients(first_name, last_name)")
        .gte("session_date", start.toISOString())
        .lte("session_date", end.toISOString())
        .order("session_date", { ascending: true });

      if (id !== loadId.current) return;

      if (error) {
        console.error("Schedule load failed:", error.message);
        setLoadFailed(true);
      } else {
        setSessions((data as Session[]) ?? []);
        setLoadFailed(false);
        lastLoadedAt.current = Date.now();
      }
    } catch (e) {
      if (id !== loadId.current) return;
      console.error("Schedule load failed:", e);
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
      if (state !== "active") return;

      const nowKey = format(new Date(), "yyyy-MM-dd");
      setTodayKey((prev) => (prev === nowKey ? prev : nowKey));

      if (Date.now() - lastLoadedAt.current > STALE_AFTER_MS) {
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

  function positionStrip() {
    if (stripPositioned.current) return;
    stripPositioned.current = true;

    const index = Math.max(
      0,
      days.findIndex((d) => isSameDay(d, selectedDay)),
    );
    const itemLeft = STRIP_PADDING + index * (DAY_WIDTH + DAY_GAP);
    const x = Math.max(0, itemLeft - (screenWidth - DAY_WIDTH) / 2);
    stripRef.current?.scrollTo({ x, animated: false });
  }

  // Re-center the strip on the selected day when the user changes days.
  function centerStripOn(day: Date) {
    const index = Math.max(
      0,
      days.findIndex((d) => isSameDay(d, day)),
    );
    const itemLeft = STRIP_PADDING + index * (DAY_WIDTH + DAY_GAP);
    const x = Math.max(0, itemLeft - (screenWidth - DAY_WIDTH) / 2);
    stripRef.current?.scrollTo({ x, animated: true });
  }

  function selectDay(day: Date) {
    setSelectedDay(startOfDay(day));
    centerStripOn(day);
    // Bring the sessions list into view so the change is obvious.
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ y: 0, animated: true });
    });
  }

  function shiftDay(delta: number) {
    const next = addDays(selectedDay, delta);
    const min = days[0];
    const max = days[days.length - 1];
    if (next < min || next > max) return;
    selectDay(next);
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
      Alert.alert(
        "Couldn't update appointment",
        "The status wasn't changed. Please check your connection and try again.",
      );
    }
  }

  const validSessions = useMemo(
    () => sessions.filter(hasValidDate),
    [sessions],
  );

  const daySessions = useMemo(
    () => validSessions.filter((s) => isSameDay(dateOf(s), selectedDay)),
    [validSessions, selectedDay],
  );

  const groups = useMemo(() => {
    const buckets: Record<string, Session[]> = {
      Morning: [],
      Afternoon: [],
      Evening: [],
    };
    daySessions.forEach((s) => {
      const hour = dateOf(s).getHours();
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
    validSessions.forEach((s) => {
      const key = format(dateOf(s), "yyyy-MM-dd");
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [validSessions]);

  const stats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfDay(addDays(now, -6));
    const weekEnd = addDays(startOfDay(now), 1);
    const todays = validSessions.filter((s) => isSameDay(dateOf(s), now));
    const thisWeek = validSessions.filter((s) => {
      const d = dateOf(s);
      return d >= weekStart && d < weekEnd;
    });
    const completed = todays.filter((s) => s.status === "COMPLETED").length;
    const total = todays.length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { today: total, week: thisWeek.length, completed, pct };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validSessions, todayKey]);

  const pendingToday = useMemo(
    () =>
      validSessions.filter(
        (s) => isToday(dateOf(s)) && s.status !== "COMPLETED",
      ),
    [validSessions],
  );

  // Next upcoming session today (for the "jump to next" empty-state CTA).
  const nextUpToday = useMemo(() => {
    const now = Date.now();
    return (
      validSessions
        .filter((s) => isToday(dateOf(s)) && dateOf(s).getTime() >= now)
        .sort((a, b) => dateOf(a).getTime() - dateOf(b).getTime())[0] ?? null
    );
  }, [validSessions]);

  const selectedLabel = isToday(selectedDay)
    ? "Today"
    : format(selectedDay, "EEEE");

  const isViewingToday = isToday(selectedDay);

if (loading) {
  return (
    <View className="flex-1">
      <StatusBar style="light" />
      <ScheduleSkeleton />
      <BottomNav
        active="schedule"
        onNavigate={(tab) => {
          if (tab === "home") onNavigateHome();
          if (tab === "patients") onOpenPatients();
          if (tab === "notes") onOpenNotes();
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
        ref={listRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 140 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={["#7c3aed"]}
          />
        }
      >
        {/* ───── Hero header (UNCHANGED) ───── */}
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
              <Text
                accessibilityRole="header"
                className="text-lg font-extrabold tracking-tight text-white"
              >
                Schedule
              </Text>
            </View>

            <HeaderActions
              sessions={pendingToday}
              onOpenSchedule={() => {}}
              onSelectPatient={(id) => onSelectPatient(id)}
            />
          </View>

          {/* Stats row */}
          <View className="mt-6 flex-row gap-3 px-5">
            <View
              accessible
              accessibilityLabel={`Today: ${stats.today} sessions`}
              className="flex-1 rounded-2xl border border-white/10 bg-white/10 p-3.5"
            >
              <Text className="text-2xl font-extrabold text-white">
                {stats.today}
              </Text>
              <Text className="mt-1 text-[10px] font-semibold text-purple-200">
                Today
              </Text>
            </View>
            <View
              accessible
              accessibilityLabel={`This week: ${stats.week} sessions`}
              className="flex-1 rounded-2xl border border-white/10 bg-white/10 p-3.5"
            >
              <Text className="text-2xl font-extrabold text-white">
                {stats.week}
              </Text>
              <Text className="mt-1 text-[10px] font-semibold text-purple-200">
                This week
              </Text>
            </View>
            <View
              accessible
              accessibilityLabel={`${stats.pct} percent done today`}
              className="flex-1 rounded-2xl border border-white/10 bg-white/10 p-3.5"
            >
              <Text className="text-2xl font-extrabold text-white">
                {stats.pct}%
              </Text>
              <Text className="mt-1 text-[10px] font-semibold text-purple-200">
                Done today
              </Text>
            </View>
          </View>
        </View>

        {/* ───── Week strip — sits below the hero ───── */}
        <View style={{ marginTop: 8 }}>
          <ScrollView
            ref={stripRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={positionStrip}
            contentContainerStyle={{
              gap: DAY_GAP,
              paddingHorizontal: STRIP_PADDING,
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
                  onPress={() => selectDay(day)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${format(day, "EEEE, MMMM d")}${
                    today ? ", today" : ""
                  }, ${count} session${count === 1 ? "" : "s"}`}
                  accessibilityHint="Shows appointments for this day"
                  className={`h-24 w-16 items-center justify-center rounded-2xl border active:opacity-80 ${
                    active
                      ? "border-purple-700 bg-purple-700"
                      : today
                        ? isDark
                          ? "border-purple-500 " + cardBg
                          : "border-purple-300 " + cardBg
                        : cardBorder + " " + cardBg
                  }`}
                  style={cardShadow}
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
                  ) : today && !active ? (
                    // Small purple dot to mark "you are here" even when empty.
                    <View className="mt-1.5 h-4 items-center justify-center">
                      <View className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                    </View>
                  ) : (
                    <View className="mt-1.5 h-4" />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* ───── Selected-day header (with prev/next) ───── */}
        <View className="mt-4 flex-row items-center justify-between px-5">
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => shiftDay(-1)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Previous day"
              className={`h-9 w-9 items-center justify-center rounded-full active:opacity-70 ${pillBg}`}
            >
              <Feather
                name="chevron-left"
                size={18}
                color={isDark ? "#c4b5fd" : "#7c3aed"}
              />
            </Pressable>

            <View>
              <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
                {selectedLabel}
              </Text>
              <Text
                accessibilityRole="header"
                className={`text-xl font-extrabold ${headingText}`}
              >
                {format(selectedDay, "MMMM d")}
              </Text>
            </View>

            <Pressable
              onPress={() => shiftDay(1)}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Next day"
              className={`h-9 w-9 items-center justify-center rounded-full active:opacity-70 ${pillBg}`}
            >
              <Feather
                name="chevron-right"
                size={18}
                color={isDark ? "#c4b5fd" : "#7c3aed"}
              />
            </Pressable>
          </View>

          <View className="flex-row items-center gap-2">
            {!isViewingToday ? (
              <Pressable
                onPress={() => selectDay(new Date())}
                accessibilityRole="button"
                accessibilityLabel="Jump to today"
                className="rounded-full bg-purple-700 px-3 py-1.5 active:opacity-80"
              >
                <Text className="text-[10px] font-bold text-white">Today</Text>
              </Pressable>
            ) : null}
            <View className={`rounded-full px-3 py-1.5 ${pillBg}`}>
              <Text className={`text-[11px] font-bold ${pillText}`}>
                {daySessions.length} session
                {daySessions.length === 1 ? "" : "s"}
              </Text>
            </View>
          </View>
        </View>

        {loadFailed ? (
          <View
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            className={`mx-5 mt-4 flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${
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
              Couldn't load your schedule. What you see may be out of date.
            </Text>
            <Pressable
              onPress={onRefresh}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Retry loading schedule"
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

        {/* ───── Sessions ───── */}
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
                <Feather name="coffee" size={28} color="#7c3aed" />
              </View>
              <Text className={`mt-4 text-base font-bold ${headingText}`}>
                {isViewingToday
                  ? "Nothing else today"
                  : `Free ${selectedLabel.toLowerCase()}`}
              </Text>
              <Text className={`mt-1 text-center text-sm ${bodyText}`}>
                {nextUpToday && isViewingToday
                  ? `Next up at ${format(dateOf(nextUpToday), "HH:mm")}.`
                  : "Tap another day in the strip above."}
              </Text>

              {nextUpToday && isViewingToday ? (
                <Pressable
                  onPress={() => {
                    const s = nextUpToday;
                    selectDay(dateOf(s));
                    setTimeout(() => setSelectedSession(s), 200);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Open next appointment at ${format(dateOf(nextUpToday), "HH:mm")}`}
                  className="mt-4 flex-row items-center gap-1.5 rounded-full bg-purple-700 px-5 py-2.5 active:opacity-80"
                >
                  <Feather name="arrow-right" size={14} color="#ffffff" />
                  <Text className="text-xs font-bold text-white">
                    Open next
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : (
            <View className="gap-5">
              {groups.map((group) => (
                <View key={group.label}>
                  <View className="mb-3 flex-row items-center gap-2">
                    <Text
                      accessibilityRole="header"
                      className={`text-sm font-extrabold ${headingText}`}
                    >
                      {group.label}
                    </Text>
                    <View className={`rounded-full px-2 py-0.5 ${pillBg}`}>
                      <Text className={`text-[10px] font-bold ${pillText}`}>
                        {group.sessions.length}
                      </Text>
                    </View>
                    <View
                      className={`ml-1 h-px flex-1 ${
                        isDark ? "bg-purple-900/40" : "bg-purple-100"
                      }`}
                    />
                  </View>

                  <View className="gap-3">
                    {group.sessions.map((s) => {
                      const timeText = format(dateOf(s), "HH:mm");
                      const patientName =
                        `${s.patients?.first_name ?? ""} ${s.patients?.last_name ?? ""}`.trim();

                      const accent =
                        s.status === "COMPLETED"
                          ? "#10b981"
                          : s.status === "IN PROGRESS"
                            ? "#7c3aed"
                            : "#a78bfa";

                      return (
                        <Pressable
                          key={s.id}
                          onPress={() => setSelectedSession(s)}
                          accessibilityRole="button"
                          accessibilityLabel={`${timeText}, ${patientName || "Patient"}, ${s.title}, ${STATUS_LABEL[s.status] ?? s.status}${
                            s.room ? `, room ${s.room}` : ""
                          }`}
                          accessibilityHint="Opens appointment details"
                          className={`flex-row items-center gap-4 rounded-2xl border p-4 active:opacity-80 ${cardBorder} ${cardBg}`}
                          style={cardShadow}
                        >
                          <View className="w-16">
                            <Text
                              className="text-lg font-extrabold"
                              style={{ color: accent }}
                            >
                              {timeText}
                            </Text>
                            {s.room ? (
                              <View className="mt-0.5 flex-row items-center gap-1">
                                <Feather
                                  name="map-pin"
                                  size={10}
                                  color="#94a3b8"
                                />
                                <Text
                                  className={`text-[10px] ${bodyText}`}
                                  numberOfLines={1}
                                >
                                  {s.room}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                          
                       <View
                            className="h-10 w-1 rounded-full"
                            style={{ backgroundColor: accent }}
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
                            style={{
                              backgroundColor: statusColors[s.status]?.bg,
                            }}
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
                      );
                    })}
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

      <PatientFormModal
        visible={showPatientForm}
        onClose={() => setShowPatientForm(false)}
        onSaved={load}
      />
    </View>
  );
}