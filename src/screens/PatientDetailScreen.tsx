import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import { PatientDetailSkeleton } from "../components/Skeleton";

interface Props {
  patientId: string;
  onBack: () => void;
}

const STATUSES: SessionStatus[] = ["PLANNED", "IN PROGRESS", "COMPLETED"];

const STATUS_LABEL: Record<SessionStatus, string> = {
  PLANNED: "Upcoming",
  "IN PROGRESS": "In Progress",
  COMPLETED: "Done",
};

export default function PatientDetailScreen({ patientId, onBack }: Props) {
  const { isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [showAi, setShowAi] = useState(false);

  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";
  const pillBg = isDark ? "bg-purple-950" : "bg-purple-100";
  const pillText = isDark ? "text-purple-200" : "text-purple-800";
  const chipBg = isDark ? "bg-[#252033]" : "bg-purple-50";
  const labelText = isDark ? "text-slate-500" : "text-slate-400";

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
    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("id", sessionId);
    if (error) setError(error.message);
    else await load();
  }

if (loading) {
  return (
    <>
      <StatusBar style="light" />
      <PatientDetailSkeleton />
    </>
  );
}

  if (!patient) {
    return (
      <View className={`flex-1 ${bg}`}>
        <StatusBar style={isDark ? "light" : "dark"} />
        <View className="flex-1 items-center justify-center px-6">
          <Feather name="alert-circle" size={36} color="#dc2626" />
          <Text className="mt-3 text-sm text-red-600">
            {error || "Patient not found"}
          </Text>
          <Pressable
            onPress={onBack}
            className="mt-6 rounded-full bg-purple-700 px-5 py-2.5"
          >
            <Text className="text-sm font-bold text-white">Go back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const lastVisit = sessions[0]?.session_date
    ? format(parseISO(sessions[0].session_date), "MMM d, yyyy")
    : "No visits";

  const completedCount = sessions.filter((s) => s.status === "COMPLETED").length;
  const inProgressCount = sessions.filter((s) => s.status === "IN PROGRESS").length;

  return (
    <View className={`flex-1 ${bg}`}>
      <StatusBar style="light" />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
          />
        }
      >
        {/* ───── Hero header ───── */}
        <View className="rounded-b-[40px] bg-purple-800 pb-8 pt-5">
          {/* Top row */}
          <View className="flex-row items-center justify-between px-5">
            <Pressable
              onPress={onBack}
              className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
            >
              <Feather name="arrow-left" size={20} color="#ffffff" />
            </Pressable>

            <View className="flex-1 flex-row items-center justify-center gap-2">
              <View className="h-6 w-6 items-center justify-center rounded-md bg-white">
                <Text className="text-xs font-extrabold text-purple-800">D</Text>
              </View>
              <Text className="text-lg font-extrabold tracking-tight text-white">
                Profile
              </Text>
            </View>

            <Pressable
              onPress={toggleTheme}
              className="h-11 w-11 items-center justify-center rounded-full bg-white/10"
            >
              <Feather
                name={isDark ? "sun" : "moon"}
                size={20}
                color="#ffffff"
              />
            </Pressable>
          </View>

          {/* Identity */}
          <View className="mt-6 flex-row items-center gap-4 px-5">
            <View className="h-20 w-20 items-center justify-center rounded-[24px] bg-white/20 ring-4 ring-white/10">
              <Text className="text-2xl font-extrabold text-white">
                {patient.first_name.charAt(0)}
                {patient.last_name.charAt(0)}
              </Text>
            </View>

            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-200">
                Patient #DN-{(patient.id || "").slice(0, 4).toUpperCase()}
              </Text>
              <Text
                className="mt-1 text-2xl font-extrabold text-white"
                numberOfLines={1}
              >
                {patient.first_name} {patient.last_name}
              </Text>
              <View className="mt-1 flex-row items-center gap-2">
                {patient.age ? (
                  <Text className="text-xs text-purple-200">
                    {patient.age} yrs
                  </Text>
                ) : null}
                {patient.gender ? (
                  <>
                    <Text className="text-xs text-purple-200">·</Text>
                    <Text className="text-xs text-purple-200">
                      {patient.gender}
                    </Text>
                  </>
                ) : null}
              </View>
            </View>
          </View>

          {/* Contact chips */}
          {(patient.phone || patient.email) && (
            <View className="mt-5 flex-row gap-2 px-5">
              {patient.phone ? (
                <Pressable
                  onPress={() => Linking.openURL(`tel:${patient.phone}`)}
                  className="flex-1 flex-row items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5"
                >
                  <Feather name="phone" size={14} color="#ffffff" />
                  <Text
                    className="flex-1 text-xs font-semibold text-white"
                    numberOfLines={1}
                  >
                    {patient.phone}
                  </Text>
                </Pressable>
              ) : null}
              {patient.email ? (
                <Pressable
                  onPress={() => Linking.openURL(`mailto:${patient.email}`)}
                  className="flex-1 flex-row items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5"
                >
                  <Feather name="mail" size={14} color="#ffffff" />
                  <Text
                    className="flex-1 text-xs font-semibold text-white"
                    numberOfLines={1}
                  >
                    {patient.email}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}

          {/* Quick actions */}
          <View className="mt-3 flex-row gap-2 px-5">
            <Pressable
              onPress={() => {
                setEditingSession(null);
                setShowAddModal(true);
              }}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-white/15 py-3"
            >
              <Feather name="plus" size={16} color="#ffffff" />
              <Text className="text-xs font-bold text-white">Add check-up</Text>
            </Pressable>
            <Pressable
              onPress={() => setShowAi(!showAi)}
              className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-white/15 py-3"
            >
              <Feather name="zap" size={16} color="#ffffff" />
              <Text className="text-xs font-bold text-white">AI Helper</Text>
            </Pressable>
          </View>
        </View>

        <View className="px-5">
          {/* ───── Stats ───── */}
          <View className="-mt-6 flex-row gap-3">
            <View
              className="flex-1 rounded-2xl bg-purple-500 p-4"
              style={cardShadow}
            >
              <Text className="text-3xl font-extrabold text-white">
                {sessions.length}
              </Text>
              <Text className="mt-1 text-[10px] font-semibold text-white/90">
                Total visits
              </Text>
            </View>
            <View
              className={`flex-1 rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
              style={cardShadow}
            >
              <Text className={`text-3xl font-extrabold ${headingText}`}>
                {completedCount}
              </Text>
              <Text className={`mt-1 text-[10px] font-semibold ${bodyText}`}>
                Completed
              </Text>
            </View>
            <View
              className={`flex-1 rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
              style={cardShadow}
            >
              <Text className={`text-3xl font-extrabold ${headingText}`}>
                {inProgressCount}
              </Text>
              <Text className={`mt-1 text-[10px] font-semibold ${bodyText}`}>
                Active
              </Text>
            </View>
          </View>

          {/* ───── Health overview ───── */}
          <View
            className={`mt-6 rounded-3xl border p-5 ${cardBorder} ${cardBg}`}
            style={cardShadow}
          >
            <View className="mb-4 flex-row items-center gap-2">
              <Feather name="heart" size={16} color="#7c3aed" />
              <Text className={`text-sm font-bold ${headingText}`}>
                Health overview
              </Text>
            </View>

            <View className="flex-row flex-wrap">
              <View className="mb-4 w-1/2 pr-2">
                <Text className={`text-[9px] font-bold uppercase tracking-wider ${labelText}`}>
                  Condition
                </Text>
                <Text className={`mt-1 text-xs font-semibold ${headingText}`}>
                  {patient.condition || "Not recorded"}
                </Text>
              </View>
              <View className="mb-4 w-1/2 pl-2">
                <Text className={`text-[9px] font-bold uppercase tracking-wider ${labelText}`}>
                  Last Visit
                </Text>
                <Text className={`mt-1 text-xs font-semibold ${headingText}`}>
                  {lastVisit}
                </Text>
              </View>
              <View className="w-1/2 pr-2">
                <Text className={`text-[9px] font-bold uppercase tracking-wider ${labelText}`}>
                  Allergies
                </Text>
                <Text className={`mt-1 text-xs font-semibold ${headingText}`}>
                  {patient.allergies || "None"}
                </Text>
              </View>
              <View className="w-1/2 pl-2">
                <Text className={`text-[9px] font-bold uppercase tracking-wider ${labelText}`}>
                  Medications
                </Text>
                <Text className={`mt-1 text-xs font-semibold ${headingText}`}>
                  {patient.medications || "None"}
                </Text>
              </View>
            </View>

            {patient.notes ? (
              <View
                className={`mt-4 rounded-2xl p-3 ${
                  isDark ? "bg-[#0e0a1a]" : "bg-slate-50"
                }`}
              >
                <Text className={`text-[9px] font-bold uppercase tracking-wider ${labelText}`}>
                  Notes
                </Text>
                <Text className={`mt-1 text-xs leading-5 ${bodyText}`}>
                  {patient.notes}
                </Text>
              </View>
            ) : null}
          </View>

          {/* ───── AI Helper (collapsible) ───── */}
          {showAi ? (
            <View className="mt-6">
              <AiHelper patient={patient} sessions={sessions} />
            </View>
          ) : null}

          {/* ───── Check-up history ───── */}
          <View className="mt-8">
            <View className="mb-3 flex-row items-end justify-between">
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
                  Clinical notes
                </Text>
                <Text className={`mt-1 text-xl font-extrabold ${headingText}`}>
                  Check-up history
                </Text>
              </View>
              <View className={`rounded-full px-3 py-1.5 ${pillBg}`}>
                <Text className={`text-[10px] font-bold ${pillText}`}>
                  {sessions.length} total
                </Text>
              </View>
            </View>

            <View className="gap-3">
              {sessions.map((s) => {
                const isUpdating = updatingId === s.id;
                return (
                  <View
                    key={s.id}
                    className={`overflow-hidden rounded-2xl border ${cardBorder} ${cardBg} ${
                      isUpdating ? "opacity-70" : ""
                    }`}
                    style={cardShadow}
                  >
                    <View className="p-4">
                      {/* Header row */}
                      <View className="flex-row items-start gap-3">
                        <View
                          className={`h-12 w-12 items-center justify-center rounded-xl ${
                            isDark ? "bg-purple-900/40" : "bg-purple-100"
                          }`}
                        >
                          <Text
                            className={`text-sm font-extrabold ${
                              isDark ? "text-purple-200" : "text-purple-900"
                            }`}
                          >
                            {format(parseISO(s.session_date), "d")}
                          </Text>
                          <Text
                            className={`text-[9px] font-bold uppercase ${
                              isDark ? "text-purple-200" : "text-purple-900"
                            }`}
                          >
                            {format(parseISO(s.session_date), "MMM")}
                          </Text>
                        </View>

                        <View className="flex-1">
                          <Text className={`text-[10px] font-bold uppercase tracking-wider ${labelText}`}>
                            {format(parseISO(s.session_date), "EEEE")} ·{" "}
                            {format(parseISO(s.session_date), "h:mm a")}
                          </Text>
                          <Text
                            className={`mt-0.5 text-sm font-extrabold ${headingText}`}
                            numberOfLines={1}
                          >
                            {s.title}
                          </Text>
                          {s.room ? (
                            <View className="mt-0.5 flex-row items-center gap-1">
                              <Feather
                                name="map-pin"
                                size={10}
                                color="#94a3b8"
                              />
                              <Text className={`text-[10px] ${bodyText}`}>
                                {s.room}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <View
                          style={{
                            backgroundColor: statusColors[s.status]?.bg,
                          }}
                          className="rounded-full px-2.5 py-1"
                        >
                          <Text
                            style={{ color: statusColors[s.status]?.text }}
                            className="text-[9px] font-bold"
                          >
                            {STATUS_LABEL[s.status]}
                          </Text>
                        </View>
                      </View>

                      {/* Description */}
                      {s.description ? (
                        <Text
                          className={`mt-3 text-sm leading-6 ${bodyText}`}
                        >
                          {s.description}
                        </Text>
                      ) : null}

                      {/* Next step */}
                      {s.next_steps ? (
                        <View
                          className={`mt-3 rounded-2xl p-3 ${
                            isDark ? "bg-purple-950" : "bg-purple-50"
                          }`}
                        >
                          <Text className="text-[9px] font-bold uppercase tracking-wider text-purple-500">
                            Next step
                          </Text>
                          <Text className={`mt-1 text-xs leading-5 ${bodyText}`}>
                            {s.next_steps}
                          </Text>
                        </View>
                      ) : null}

                      {/* Status control */}
                      <View
                        className={`mt-4 flex-row rounded-xl p-1 ${
                          isDark ? "bg-[#0e0a1a]" : "bg-slate-100"
                        }`}
                      >
                        {STATUSES.map((status) => {
                          const active = s.status === status;
                          return (
                            <Pressable
                              key={status}
                              onPress={() => changeStatus(s.id!, status)}
                              disabled={isUpdating}
                              style={
                                active
                                  ? {
                                      backgroundColor:
                                        statusColors[status]?.bg,
                                    }
                                  : undefined
                              }
                              className="flex-1 rounded-lg py-2"
                            >
                              <Text
                                style={
                                  active
                                    ? { color: statusColors[status]?.text }
                                    : undefined
                                }
                                className={`text-center text-[10px] font-bold ${
                                  active ? "" : bodyText
                                }`}
                              >
                                {status === "IN PROGRESS"
                                  ? "In Progress"
                                  : status.charAt(0) +
                                    status.slice(1).toLowerCase()}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>

                      {/* Actions */}
                      <View
                        className={`mt-3 flex-row justify-end gap-2 border-t pt-3 ${
                          isDark ? "border-slate-800" : "border-slate-100"
                        }`}
                      >
                        <Pressable
                          onPress={() => {
                            setEditingSession(s);
                            setShowAddModal(true);
                          }}
                          className={`flex-row items-center gap-1 rounded-xl px-3 py-2 ${
                            isDark ? "bg-purple-950" : "bg-purple-50"
                          }`}
                        >
                          <Feather
                            name="edit-2"
                            size={12}
                            color={isDark ? "#c4b5fd" : "#7c3aed"}
                          />
                          <Text
                            className={`text-xs font-bold ${
                              isDark ? "text-purple-200" : "text-purple-800"
                            }`}
                          >
                            Edit
                          </Text>
                        </Pressable>
                        <Pressable
                          onPress={() => deleteSession(s.id!)}
                          className={`flex-row items-center gap-1 rounded-xl px-3 py-2 ${
                            isDark ? "bg-red-950/40" : "bg-red-50"
                          }`}
                        >
                          <Feather name="trash-2" size={12} color="#ef4444" />
                          <Text className="text-xs font-bold text-red-500">
                            Delete
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}

              {sessions.length === 0 && (
                <View
                  className={`items-center rounded-[24px] border border-dashed px-6 py-12 ${
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
                    <Feather name="file-text" size={24} color="#7c3aed" />
                  </View>
                  <Text className={`mt-4 text-base font-bold ${headingText}`}>
                    No check-ups yet
                  </Text>
                  <Text className={`mt-1 text-center text-sm ${bodyText}`}>
                    Add the first clinical note for this patient.
                  </Text>
                  <Pressable
                    onPress={() => {
                      setEditingSession(null);
                      setShowAddModal(true);
                    }}
                    className="mt-4 rounded-full bg-purple-700 px-5 py-2.5"
                  >
                    <Text className="text-xs font-bold text-white">
                      Add check-up
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
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