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
import { format, parseISO } from "date-fns";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import type { Patient, Session } from "../types";

interface Props {
  onViewAllPatients: () => void;
  onOpenSchedule: () => void;
}

export default function DashboardScreen({ onViewAllPatients,onOpenSchedule, }: Props) {
  const { session, signOut } = useAuth();
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

  const today = format(new Date(), "EEEE, MMMM d").toUpperCase();

  const load = useCallback(async () => {
    setError("");

    // Patients
    const p = await supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });
    if (p.error) setError(p.error.message);
    else setPatients((p.data as Patient[]) ?? []);

    // Today's non-completed sessions
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#faf8fc]">
        <ActivityIndicator size="large" color="#7c3aed" />
        <StatusBar style="dark" />
      </View>
    );
  }

  const recentPatients = patients.slice(0, 5);

  return (
    <View className="flex-1 bg-[#faf8fc]">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="border-b border-purple-100 bg-white/90">
        <View className="flex-row items-center justify-between px-5 py-4">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-purple-700">
              <Text className="text-xl">🦷</Text>
            </View>
            <Text className="text-xl font-extrabold tracking-tight text-purple-950">
              DentNotes
            </Text>
          </View>

          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 items-center justify-center rounded-full bg-purple-100">
              <Text className="text-lg">🔔</Text>
            </View>
            <Pressable
              onPress={signOut}
              className="h-10 w-10 items-center justify-center rounded-full bg-purple-100"
            >
              <Text className="text-xs font-bold text-purple-800">
                {initials}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#7c3aed"
          />
        }
      >
        <View className="px-5">
          {/* Greeting */}
          <View className="pb-5 pt-6">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
              {today}
            </Text>
            <Text className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
              {greeting}, Dr. {firstName}
            </Text>
            <Text className="mt-1 text-sm text-slate-500">
              {upcoming.length === 0
                ? "No check-ups scheduled today — a good day to catch up on notes."
                : `You have ${upcoming.length} check-up${
                    upcoming.length === 1 ? "" : "s"
                  } scheduled today.`}
            </Text>
          </View>

          {error ? (
            <View className="mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          ) : null}

          {/* Metric Cards */}
          <View className="mb-7 flex-row gap-3">
            <View className="flex-1 rounded-2xl bg-purple-700 p-4">
              <Text className="text-3xl font-extrabold text-white">
                {upcoming.length}
              </Text>
              <Text className="mt-2 text-xs font-semibold text-purple-100">
                Today's appointments
              </Text>
            </View>
            <View className="flex-1 rounded-2xl border border-purple-100 bg-white p-4">
              <Text className="text-3xl font-extrabold text-purple-950">
                {patients.length}
              </Text>
              <Text className="mt-2 text-xs font-semibold text-slate-500">
                Total patients
              </Text>
            </View>
          </View>

          {/* Today's check-ups */}
          <View className="mb-8">
          <View className="mb-3 flex-row items-end justify-between">
            <View>
              <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
                Your schedule
              </Text>
              <Text className="mt-1 text-lg font-bold text-slate-950">
                Today's check-ups
              </Text>
            </View>
            <Pressable onPress={onOpenSchedule}>
              <Text className="text-xs font-semibold text-purple-600">View all</Text>
            </Pressable>
          </View>

            {upcoming.length > 0 ? (
              <View className="gap-3">
                {upcoming.map((s) => (
                  <View
                    key={s.id}
                    className="flex-row items-center gap-3 rounded-2xl border border-purple-100 bg-white p-4"
                  >
                    <View className="h-12 w-12 items-center justify-center rounded-xl bg-purple-100">
                      <Text className="text-sm font-extrabold text-purple-900">
                        {format(parseISO(s.session_date), "HH:mm")}
                      </Text>
                      <Text className="text-[9px] font-bold uppercase text-purple-900">
                        {format(parseISO(s.session_date), "a")}
                      </Text>
                    </View>

                    <View className="flex-1">
                      <Text className="text-sm font-bold text-slate-900">
                        {s.patients?.first_name} {s.patients?.last_name}
                      </Text>
                      <Text className="mt-1 text-xs text-slate-500">
                        {s.title}
                      </Text>
                    </View>

                    <View
                      className={`rounded-full px-2.5 py-1 ${
                        s.status === "IN PROGRESS"
                          ? "bg-purple-100"
                          : "bg-slate-100"
                      }`}
                    >
                      <Text
                        className={`text-[9px] font-bold ${
                          s.status === "IN PROGRESS"
                            ? "text-purple-800"
                            : "text-slate-600"
                        }`}
                      >
                        {s.status}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View className="items-center rounded-2xl border border-dashed border-purple-200 bg-white px-5 py-8">
                <Text className="text-3xl">☕</Text>
                <Text className="mt-3 text-sm font-bold text-slate-700">
                  No check-ups scheduled today
                </Text>
                <Text className="mt-1 text-xs text-slate-400">
                  Enjoy the break.
                </Text>
              </View>
            )}
          </View>

          {/* Recent patients */}
          <View>
          <View className="mb-3 flex-row items-end justify-between">
            <View>
              <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
                Directory
              </Text>
              <Text className="mt-1 text-lg font-bold text-slate-950">
                Recent patients
              </Text>
            </View>
            <Pressable onPress={onViewAllPatients}>
              <Text className="text-xs font-semibold text-purple-600">View all</Text>
            </Pressable>
          </View>

            <View className="overflow-hidden rounded-2xl border border-purple-100 bg-white">
              {recentPatients.map((p) => (
                <View
                  key={p.id}
                  className="flex-row items-center gap-3 border-b border-slate-100 p-4 last:border-b-0"
                >
                  <View className="h-11 w-11 items-center justify-center rounded-full bg-purple-100">
                    <Text className="text-xs font-extrabold text-purple-800">
                      {p.first_name.charAt(0)}
                      {p.last_name.charAt(0)}
                    </Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-slate-900">
                      {p.first_name} {p.last_name}
                    </Text>
                    <Text className="mt-1 text-xs text-slate-500">
                      {p.condition || "No condition recorded"}
                    </Text>
                  </View>
                </View>
              ))}

              {recentPatients.length === 0 && (
                <View className="px-5 py-10">
                  <Text className="text-center text-sm font-semibold text-slate-700">
                    No patients yet
                  </Text>
                  <Text className="mt-1 text-center text-sm text-slate-400">
                    Add your first patient from the web app.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}