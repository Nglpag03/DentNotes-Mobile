import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { useTheme } from "../context/ThemeContext";
import type { Patient, Session, SessionStatus } from "../types";
import { cardShadow, statusColors } from "../lib/theme";
import SessionFormModal from "./SessionFormModal";
import AiHelper from "../components/AiHelper";

interface Props {
  patientId: string;
  onBack: () => void;
}

const STATUSES: SessionStatus[] = ["PLANNED", "IN PROGRESS", "COMPLETED"];

export default function PatientDetailScreen({ patientId, onBack }: Props) {
  const { isDark } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);

  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";
  const headerBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const headerBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const pillBg = isDark ? "bg-purple-950" : "bg-purple-100";
  const pillText = isDark ? "text-purple-200" : "text-purple-800";
  const avatarBg = isDark ? "bg-purple-900/40" : "bg-purple-100";
  const avatarText = isDark ? "text-purple-200" : "text-purple-800";

  const load = useCallback(async () => {
    setError("");

    const p = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .single();

    if (p.error) return setError(p.error.message);
    setPatient(p.data as Patient);

    const s = await supabase
      .from("sessions")
      .select("*")
      .eq("patient_id", patientId)
      .order("session_date", { ascending: false });

    if (s.error) setError(s.error.message);
    else setSessions((s.data as Session[]) ?? []);
  }, [patientId]);

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

  async function deleteSession(sessionId: string) {
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Delete check-up?",
        "This cannot be undone.",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          { text: "Delete", style: "destructive", onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
    if (!confirmed) return;
    const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
    if (error) setError(error.message);
    else await load();
  }

  if (loading) {
    return (
      <View className={`flex-1 items-center justify-center ${bg}`}>
        <ActivityIndicator size="large" color="#7c3aed" />
        <StatusBar style={isDark ? "light" : "dark"} />
      </View>
    );
  }

  if (!patient) {
    return (
      <View className={`flex-1 ${bg}`}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View className={`flex-row items-center border-b px-5 py-4 ${headerBorder} ${headerBg}`}>
          <Pressable onPress={onBack} className="mr-3">
            <Feather name="arrow-left" size={20} color={isDark ? "#ffffff" : "#6d28d9"} />
          </Pressable>
          <Text className={`text-base font-bold ${headingText}`}>Patient</Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-red-600">{error || "Patient not found"}</Text>
        </View>
      </View>
    );
  }

  const lastVisit = sessions[0]?.session_date
    ? format(parseISO(sessions[0].session_date), "MMM d, yyyy")
    : "No visits";

  return (
    <View className={`flex-1 ${bg}`}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View className={`border-b px-5 py-3 ${headerBorder} ${headerBg}`}>
        <View className="flex-row items-center">
          <Pressable
            onPress={onBack}
            className={`mr-3 h-10 w-10 items-center justify-center rounded-full border ${headerBorder}`}
          >
            <Feather name="arrow-left" size={20} color={isDark ? "#ffffff" : "#6d28d9"} />
          </Pressable>
          <Text className={`flex-1 text-center text-sm font-bold ${headingText}`}>
            Patient Profile
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
        <View className="px-5">
          {/* Identity */}
          <View className="flex-row items-center gap-4 py-6">
            <View className={`h-16 w-16 items-center justify-center rounded-[20px] ${avatarBg}`}>
              <Text className={`text-lg font-extrabold ${avatarText}`}>
                {patient.first_name.charAt(0)}
                {patient.last_name.charAt(0)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
                Patient #DN-{(patient.id || "").slice(0, 4).toUpperCase()}
              </Text>
              <Text className={`mt-1 text-xl font-extrabold ${headingText}`}>
                {patient.first_name} {patient.last_name}
              </Text>
              <Text className={`mt-1 text-xs ${bodyText}`}>
                {sessions.length} check-up{sessions.length === 1 ? "" : "s"} on record
              </Text>
            </View>
          </View>

          {/* Health overview */}
          <View className={`mb-4 rounded-[24px] border p-5 ${cardBorder} ${cardBg}`} style={cardShadow}>
            <Text className={`mb-4 text-sm font-bold ${headingText}`}>Health overview</Text>
            <View className="flex-row flex-wrap">
              <View className="mb-4 w-1/2 pr-2">
                <Text className={`text-[9px] font-bold uppercase tracking-wider ${bodyText}`}>
                  Primary Condition
                </Text>
                <Text className={`mt-1 text-xs font-semibold ${headingText}`}>
                  {patient.condition || "Not recorded"}
                </Text>
              </View>
              <View className="mb-4 w-1/2 pl-2">
                <Text className={`text-[9px] font-bold uppercase tracking-wider ${bodyText}`}>
                  Allergies
                </Text>
                <Text className={`mt-1 text-xs font-semibold ${headingText}`}>
                  {patient.allergies || "None reported"}
                </Text>
              </View>
              <View className="w-1/2 pr-2">
                <Text className={`text-[9px] font-bold uppercase tracking-wider ${bodyText}`}>
                  Medications
                </Text>
                <Text className={`mt-1 text-xs font-semibold ${headingText}`}>
                  {patient.medications || "None reported"}
                </Text>
              </View>
              <View className="w-1/2 pl-2">
                <Text className={`text-[9px] font-bold uppercase tracking-wider ${bodyText}`}>
                  Last Visit
                </Text>
                <Text className={`mt-1 text-xs font-semibold ${headingText}`}>{lastVisit}</Text>
              </View>
            </View>
          </View>

          {/* AI Helper */}
          <View className="mb-7">
            <AiHelper patient={patient} sessions={sessions} />
          </View>

          {/* Check-up history */}
          <View className="mt-4">
            <View className="mb-4 flex-row items-end justify-between">
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
                  Clinical notes
                </Text>
                <Text className={`mt-1 text-lg font-bold ${headingText}`}>
                  Check-up history
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setEditingSession(null);
                  setShowAddModal(true);
                }}
                className="flex-row items-center gap-1 rounded-2xl bg-purple-700 px-3 py-2"
              >
                <Feather name="plus" size={14} color="#ffffff" />
                <Text className="text-xs font-bold text-white">Add</Text>
              </Pressable>
            </View>

            <View className="gap-3">
              {sessions.map((s) => {
                const isUpdating = updatingId === s.id;
                return (
                  <View
                    key={s.id}
                    className={`overflow-hidden rounded-[24px] border ${cardBorder} ${cardBg} ${
                      isUpdating ? "opacity-70" : ""
                    }`}
                    style={cardShadow}
                  >
                    <View className="p-5">
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
                          <Text className={`text-[10px] font-bold uppercase tracking-wider ${bodyText}`}>
                            {format(parseISO(s.session_date), "EEEE")} ·{" "}
                            {format(parseISO(s.session_date), "h:mm a")}
                          </Text>
                          <Text className={`mt-0.5 text-sm font-bold ${headingText}`}>
                            {s.title}
                          </Text>
                        </View>
                      </View>

                      {s.description ? (
                        <Text className={`mt-4 text-sm leading-6 ${bodyText}`}>
                          {s.description}
                        </Text>
                      ) : null}

                      {s.next_steps ? (
                        <View className={`mt-4 rounded-2xl p-3 ${
                          isDark ? "bg-purple-950" : "bg-purple-50"
                        }`}>
                          <Text className="text-[10px] font-bold uppercase tracking-wider text-purple-500">
                            Next step
                          </Text>
                          <Text className={`mt-1 text-xs leading-5 ${bodyText}`}>
                            {s.next_steps}
                          </Text>
                        </View>
                      ) : null}

                      <View className={`mt-4 flex-row rounded-xl p-1 ${
                        isDark ? "bg-[#0e0a1a]" : "bg-slate-100"
                      }`}>
                        {STATUSES.map((status) => {
                          const active = s.status === status;
                          return (
                            <Pressable
                              key={status}
                              onPress={() => changeStatus(s.id!, status)}
                              disabled={isUpdating}
                              style={active ? { backgroundColor: statusColors[status]?.bg } : undefined}
                              className="flex-1 rounded-lg py-2"
                            >
                              <Text
                                style={active ? { color: statusColors[status]?.text } : undefined}
                                className={`text-center text-[10px] font-bold ${active ? "" : bodyText}`}
                              >
                                {status === "IN PROGRESS"
                                  ? "In Progress"
                                  : status.charAt(0) + status.slice(1).toLowerCase()}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      <View className={`mt-3 flex-row justify-end gap-2 border-t pt-3 ${
                        isDark ? "border-slate-800" : "border-slate-100"
                      }`}>
                        <Pressable
                          onPress={() => {
                            setEditingSession(s);
                            setShowAddModal(true);
                          }}
                          className={`rounded-xl px-3 py-2 ${
                            isDark ? "bg-purple-950" : "bg-purple-50"
                          }`}
                        >
                          <Text className={`text-xs font-bold ${
                            isDark ? "text-purple-200" : "text-purple-800"
                          }`}>
                            Edit
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => deleteSession(s.id!)}
                          className={`rounded-xl px-3 py-2 ${
                            isDark ? "bg-red-950/40" : "bg-red-50"
                          }`}
                        >
                          <Text className="text-xs font-bold text-red-500">Delete</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}

              {sessions.length === 0 && (
                <View
                  className={`items-center rounded-[24px] border border-dashed px-6 py-12 ${
                    isDark ? "border-purple-900/60 bg-[#1a1525]" : "border-purple-200 bg-white"
                  }`}
                >
                  <Text className="text-3xl">📋</Text>
                  <Text className={`mt-4 text-base font-bold ${headingText}`}>
                    No check-ups yet
                  </Text>
                  <Text className={`mt-1 text-center text-sm ${bodyText}`}>
                    Add the first clinical note for this patient.
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <SessionFormModal
        visible={showAddModal || !!editingSession}
        patientId={patientId}
        session={editingSession}
        onClose={() => {
          setShowAddModal(false);
          setEditingSession(null);
        }}
        onSaved={load}
      />
    </View>
  );
}