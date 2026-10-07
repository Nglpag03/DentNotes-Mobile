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
import type { Patient, Session, SessionStatus } from "../types";
import SessionFormModal from "./SessionFormModal";

interface Props {
  patientId: string;
  onBack: () => void;
}

const STATUSES: SessionStatus[] = ["PLANNED", "IN PROGRESS", "COMPLETED"];

export default function PatientDetailScreen({ patientId, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  
  const load = useCallback(async () => {
    setError("");

    const p = await supabase
      .from("patients")
      .select("*")
      .eq("id", patientId)
      .single();

    if (p.error) {
      setError(p.error.message);
      return;
    }
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
    // optimistic update
    setSessions((list) =>
      list.map((x) => (x.id === sessionId ? { ...x, status: next } : x)),
    );

    const { error } = await supabase
      .from("sessions")
      .update({ status: next })
      .eq("id", sessionId);

    if (error) {
      // rollback
      setSessions((list) =>
        list.map((x) =>
          x.id === sessionId ? { ...x, status: prev as SessionStatus } : x,
        ),
      );
    }
    setUpdatingId(null);
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#faf8fc]">
        <ActivityIndicator size="large" color="#7c3aed" />
        <StatusBar style="dark" />
      </View>
    );
  }

  if (!patient) {
    return (
      <View className="flex-1 bg-[#faf8fc]">
        <StatusBar style="dark" />
        <View className="flex-row items-center border-b border-purple-100 bg-white px-5 py-4">
          <Pressable onPress={onBack} className="mr-3">
            <Text className="text-xl text-purple-800">‹</Text>
          </Pressable>
          <Text className="text-base font-bold text-purple-950">
            Patient
          </Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-sm text-red-600">
            {error || "Patient not found"}
          </Text>
        </View>
      </View>
    );
  }

  const lastVisit = sessions[0]?.session_date
    ? format(parseISO(sessions[0].session_date), "MMM d, yyyy")
    : "No visits";

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
            <View className="h-16 w-16 items-center justify-center rounded-[20px] bg-purple-100">
              <Text className="text-lg font-extrabold text-purple-700">
                {patient.first_name.charAt(0)}
                {patient.last_name.charAt(0)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
                Patient #DN-{(patient.id || "").slice(0, 4).toUpperCase()}
              </Text>
              <Text className="mt-1 text-xl font-extrabold text-slate-950">
                {patient.first_name} {patient.last_name}
              </Text>
              <Text className="mt-1 text-xs text-slate-500">
                {sessions.length} check-up
                {sessions.length === 1 ? "" : "s"} on record
              </Text>
            </View>
          </View>

          {/* Health overview */}
          <View className="mb-4 rounded-[24px] border border-purple-100 bg-white p-5">
            <Text className="mb-4 text-sm font-bold text-slate-950">
              Health overview
            </Text>
            <View className="flex-row flex-wrap">
              <View className="mb-4 w-1/2 pr-2">
                <Text className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Primary Condition
                </Text>
                <Text className="mt-1 text-xs font-semibold text-slate-800">
                  {patient.condition || "Not recorded"}
                </Text>
              </View>
              <View className="mb-4 w-1/2 pl-2">
                <Text className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Allergies
                </Text>
                <Text className="mt-1 text-xs font-semibold text-slate-800">
                  {patient.allergies || "None reported"}
                </Text>
              </View>
              <View className="w-1/2 pr-2">
                <Text className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Medications
                </Text>
                <Text className="mt-1 text-xs font-semibold text-slate-800">
                  {patient.medications || "None reported"}
                </Text>
              </View>
              <View className="w-1/2 pl-2">
                <Text className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                  Last Visit
                </Text>
                <Text className="mt-1 text-xs font-semibold text-slate-800">
                  {lastVisit}
                </Text>
              </View>
            </View>
          </View>

          {/* Check-up history */}
          <View className="mt-4">
            <View className="mb-4 flex-row items-end justify-between">
              <View>
                <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
                  Clinical notes
                </Text>
                <Text className="mt-1 text-lg font-bold text-slate-950">
                  Check-up history
                </Text>
              </View>
              <Pressable
                onPress={() => setShowAddModal(true)}
                className="flex-row items-center gap-1 rounded-2xl bg-purple-700 px-3 py-2"
              >
                <Text className="text-base font-normal text-white">+</Text>
                <Text className="text-xs font-bold text-white">Add</Text>
              </Pressable>
            </View>
            <View className="gap-3">
              {sessions.map((s) => {
                const isUpdating = updatingId === s.id;
                return (
                  <View
                    key={s.id}
                    className={`overflow-hidden rounded-[24px] border border-purple-100 bg-white ${
                      isUpdating ? "opacity-70" : ""
                    }`}
                  >
                    <View className="p-5">
                      <View className="flex-row items-start gap-3">
                        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-purple-100">
                          <Text className="text-sm font-extrabold text-purple-900">
                            {format(parseISO(s.session_date), "d")}
                          </Text>
                          <Text className="text-[9px] font-bold uppercase text-purple-900">
                            {format(parseISO(s.session_date), "MMM")}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {format(parseISO(s.session_date), "EEEE")} ·{" "}
                            {format(parseISO(s.session_date), "h:mm a")}
                          </Text>
                          <Text className="mt-0.5 text-sm font-bold text-slate-900">
                            {s.title}
                          </Text>
                        </View>
                      </View>

                      {s.description ? (
                        <Text className="mt-4 text-sm leading-6 text-slate-600">
                          {s.description}
                        </Text>
                      ) : null}

                      {s.next_steps ? (
                        <View className="mt-4 rounded-2xl bg-purple-50 p-3">
                          <Text className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                            Next step
                          </Text>
                          <Text className="mt-1 text-xs leading-5 text-slate-600">
                            {s.next_steps}
                          </Text>
                        </View>
                      ) : null}

                      {/* Status segmented control */}
                      <View className="mt-4 flex-row rounded-xl bg-slate-100 p-1">
                        {STATUSES.map((status) => {
                          const active = s.status === status;
                          return (
                            <Pressable
                              key={status}
                              onPress={() => changeStatus(s.id!, status)}
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
                                    : "text-slate-500"
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
                    </View>
                  </View>
                );
              })}

              {sessions.length === 0 && (
                <View className="items-center rounded-[24px] border border-dashed border-purple-200 bg-white px-6 py-12">
                  <Text className="text-3xl">📋</Text>
                  <Text className="mt-4 text-base font-bold text-slate-800">
                    No check-ups yet
                  </Text>
                  <Text className="mt-1 text-center text-sm text-slate-400">
                    Add the first clinical note for this patient.
                  </Text>
                  <Pressable
                    onPress={() => setShowAddModal(true)}
                    className="mt-4 rounded-2xl bg-purple-700 px-5 py-2.5"
                  >
                    <Text className="text-sm font-bold text-white">Add check-up</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
      <SessionFormModal
  visible={showAddModal}
  patientId={patientId}
  onClose={() => setShowAddModal(false)}
  onSaved={load}
/>
    </View>
  );
}