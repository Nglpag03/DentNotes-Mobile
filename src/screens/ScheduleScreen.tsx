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
import {
  addDays,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfDay,
} from "date-fns";
import { supabase } from "../lib/supabase";
import type { Session, SessionStatus } from "../types";

interface Props {
  onSelectPatient: (id: string) => void;
  onBack: () => void;
}

const STATUSES: SessionStatus[] = ["PLANNED", "IN PROGRESS", "COMPLETED"];

export default function ScheduleScreen({ onSelectPatient, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // 14-day window centered on today
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

    setUpdatingId(sessionId);
    setSessions((list) =>
      list.map((x) => (x.id === sessionId ? { ...x, status: next } : x)),
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
    }
    setUpdatingId(null);
  }

  const daySessions = useMemo(
    () =>
      sessions.filter((s) =>
        isSameDay(parseISO(s.session_date), selectedDay),
      ),
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

  const selectedLabel = isToday(selectedDay)
    ? "Today"
    : format(selectedDay, "EEEE");

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#faf8fc]">
        <ActivityIndicator size="large" color="#7c3aed" />
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-[#faf8fc]">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="border-b border-purple-100 bg-white px-5 py-3">
        <View className="flex-row items-center">
          <Pressable
            onPress={onBack}
            className="mr-3 h-10 w-10 items-center justify-center rounded-full border border-purple-100"
          >
            <Text className="text-xl text-purple-800">‹</Text>
          </Pressable>
          <Text className="flex-1 text-center text-sm font-bold text-purple-950">
            Schedule
          </Text>
          <View className="w-10" />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7c3aed"
          />
        }
      >
        <View className="px-5 pt-6">
          {/* Page heading */}
          <View className="mb-4">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
              Upcoming
            </Text>
            <Text className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
              Your schedule
            </Text>
          </View>

          {error ? (
            <View className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          ) : null}

          {/* Week strip */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
            className="mb-6"
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
                  className={`h-20 w-14 items-center justify-center rounded-2xl border ${
                    active
                      ? "border-purple-800 bg-purple-800"
                      : today
                        ? "border-purple-300 bg-white"
                        : "border-purple-100 bg-white"
                  }`}
                >
                  <Text
                    className={`text-[9px] font-bold uppercase tracking-wider ${
                      active ? "text-purple-200" : "text-slate-400"
                    }`}
                  >
                    {format(day, "EEE")}
                  </Text>
                  <Text
                    className={`mt-0.5 text-lg font-extrabold ${
                      active ? "text-white" : "text-slate-800"
                    }`}
                  >
                    {format(day, "d")}
                  </Text>
                  <View
                    className={`mt-1 h-1.5 w-1.5 rounded-full ${
                      count === 0
                        ? "bg-transparent"
                        : active
                          ? "bg-purple-200"
                          : "bg-purple-500"
                    }`}
                  />
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Day label */}
          <View className="mb-3 flex-row items-end justify-between">
            <View>
              <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
                {selectedLabel}
              </Text>
              <Text className="mt-1 text-lg font-bold text-slate-950">
                {format(selectedDay, "MMMM d, yyyy")}
              </Text>
            </View>
            <View className="rounded-full bg-purple-100 px-2.5 py-1">
              <Text className="text-[10px] font-bold text-purple-800">
                {daySessions.length} scheduled
              </Text>
            </View>
          </View>

          {/* Sessions */}
          {daySessions.length === 0 ? (
            <View className="items-center rounded-[24px] border border-dashed border-purple-200 bg-white px-6 py-14">
              <Text className="text-3xl">☕</Text>
              <Text className="mt-4 text-base font-bold text-slate-800">
                Nothing scheduled {selectedLabel.toLowerCase()}
              </Text>
              <Text className="mt-1 text-center text-sm text-slate-400">
                Tap another day in the strip above to see what's coming up.
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
                    <View className="rounded-full bg-purple-100 px-2 py-0.5">
                      <Text className="text-[10px] font-bold text-purple-800">
                        {group.sessions.length}
                      </Text>
                    </View>
                  </View>

                  <View className="gap-3">
                    {group.sessions.map((s) => {
                      const isUpdating = updatingId === s.id;
                      return (
                        <View
                          key={s.id}
                          className={`overflow-hidden rounded-2xl border border-purple-100 bg-white ${
                            isUpdating ? "opacity-70" : ""
                          }`}
                        >
                          <Pressable
                            onPress={() =>
                              onSelectPatient(s.patient_id)
                            }
                            className="flex-row items-center gap-3 p-4"
                          >
                            <View className="h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                              <Text className="text-xs font-extrabold text-purple-900">
                                {format(parseISO(s.session_date), "HH:mm")}
                              </Text>
                              <Text className="text-[9px] font-bold uppercase text-purple-900">
                                {format(parseISO(s.session_date), "a")}
                              </Text>
                            </View>
                            <View className="flex-1">
                              <Text className="text-sm font-bold text-slate-900">
                                {s.patients?.first_name}{" "}
                                {s.patients?.last_name}
                              </Text>
                              <Text className="mt-1 text-xs text-slate-500">
                                {s.title}
                              </Text>
                            </View>
                            <Text className="text-lg text-slate-300">›</Text>
                          </Pressable>

                          {/* Status row */}
                          <View className="flex-row border-t border-slate-100 bg-slate-50 p-1.5">
                            {STATUSES.map((status) => {
                              const active = s.status === status;
                              return (
                                <Pressable
                                  key={status}
                                  onPress={() =>
                                    changeStatus(s.id!, status)
                                  }
                                  disabled={isUpdating}
                                  className={`flex-1 rounded-lg py-2 ${
                                    active
                                      ? status === "COMPLETED"
                                        ? "bg-emerald-100"
                                        : status === "IN PROGRESS"
                                          ? "bg-purple-100"
                                          : "bg-white"
                                      : ""
                                  }`}
                                >
                                  <Text
                                    className={`text-center text-[10px] font-bold ${
                                      active
                                        ? status === "COMPLETED"
                                          ? "text-emerald-800"
                                          : status === "IN PROGRESS"
                                            ? "text-purple-800"
                                            : "text-slate-800"
                                        : "text-slate-400"
                                    }`}
                                  >
                                    {status === "IN PROGRESS"
                                      ? "In progress"
                                      : status.charAt(0) +
                                        status.slice(1).toLowerCase()}
                                  </Text>
                                </Pressable>
                              );
                            })}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}