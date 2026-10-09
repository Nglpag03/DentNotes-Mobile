import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { supabase } from "../lib/supabase";
import type { Patient } from "../types";
import PatientFormModal from "./PatientFormModal";

interface Props {
  onSelectPatient: (id: string) => void;
}

export default function PatientsScreen({ onSelectPatient }: Props) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);

  const load = useCallback(async () => {
    setError("");
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .order("last_name");
    if (error) setError(error.message);
    else setPatients((data as Patient[]) ?? []);
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

  const filtered = patients.filter((p) =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()),
  );

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

      <View className="border-b border-purple-100 bg-white/90 px-5 py-4">
        <View className="flex-row items-start justify-between">
          <View className="flex-1">
            <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
              Directory
            </Text>
            <Text className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950">
              All patients
            </Text>
            <Text className="mt-1 text-xs text-slate-500">
              {patients.length} patient{patients.length === 1 ? "" : "s"} on record
            </Text>
          </View>
          <Pressable
            onPress={() => setShowAddModal(true)}
            className="mt-1 flex-row items-center gap-1 rounded-2xl bg-purple-700 px-4 py-2.5"
          >
            <Text className="text-base font-normal text-white">+</Text>
            <Text className="text-xs font-bold text-white">Add</Text>
          </Pressable>
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
        <View className="px-5 pt-4">
          {/* Search */}
          <View className="mb-4 flex-row items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2">
            <Text className="text-lg text-slate-400">🔍</Text>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search patients"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              className="flex-1 text-sm text-slate-900"
            />
            {search ? (
              <Pressable onPress={() => setSearch("")}>
                <Text className="text-sm font-bold text-slate-400">✕</Text>
              </Pressable>
            ) : null}
          </View>

          {error ? (
            <View className="mb-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3">
              <Text className="text-sm text-red-700">{error}</Text>
            </View>
          ) : null}

          {/* List */}
          <View className="overflow-hidden rounded-2xl border border-purple-100 bg-white">
            {filtered.map((p) => (
              <Pressable
                key={p.id}
                onPress={() => onSelectPatient(p.id!)}
                className="flex-row items-center gap-3 border-b border-slate-100 p-4 active:bg-purple-50 last:border-b-0"
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
                <Text className="text-lg text-slate-300">›</Text>
              </Pressable>
            ))}

            {filtered.length === 0 && (
              <View className="px-5 py-10">
                <Text className="text-center text-sm font-semibold text-slate-700">
                  No patients found
                </Text>
                <Text className="mt-1 text-center text-sm text-slate-400">
                  Try another name.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <PatientFormModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={load}
      />
    </View>
  );
}