import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { format } from "date-fns";
import { supabase } from "../lib/supabase";
import { useTheme } from "../context/ThemeContext";
import type { Patient, Session, SessionStatus } from "../types";
import { cardShadow, statusColors } from "../lib/theme";
import SessionFormModal from "./SessionFormModal";
import AiHelper from "../components/AiHelper";
import { PatientDetailSkeleton } from "../components/Skeleton";
import { downloadPatientProfilePdf } from "../lib/pdf";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PhotoGallery from "../components/PhotoGallery";

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

function fmt(value: string | null | undefined, pattern: string, fallback = "—") {
  if (!value) return fallback;
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : format(d, pattern);
}

function hasRealValue(value: string | null | undefined) {
  if (!value) return false;
  return !["none", "n/a", "na", "no", "nil", "-"].includes(
    value.trim().toLowerCase(),
  );
}

export default function PatientDetailScreen({ patientId, onBack }: Props) {
  const { isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [showAi, setShowAi] = useState(false);
  const [photoCount, setPhotoCount] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const insets = useSafeAreaInsets();

  // Theme tokens
  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";
  const pillBg = isDark ? "bg-purple-950" : "bg-purple-100";
  const pillText = isDark ? "text-purple-200" : "text-purple-800";
  const labelText = isDark ? "text-slate-500" : "text-slate-400";

  const scrollRef = useRef<ScrollView>(null);
  const bodyY = useRef(0);
  const pendingAiScroll = useRef(false);
  const loadId = useRef(0);
  const photosRef = useRef<View>(null);

  const load = useCallback(async () => {
    const id = ++loadId.current;

    try {
      const [p, s] = await Promise.all([
        supabase.from("patients").select("*").eq("id", patientId).single(),
        supabase
          .from("sessions")
          .select("*")
          .eq("patient_id", patientId)
          .order("session_date", { ascending: false }),
      ]);

      if (id !== loadId.current) return;

      if (p.error) {
        if (p.error.code === "PGRST116") {
          setNotFound(true);
          setPatient(null);
          setLoadFailed(false);
        } else {
          console.error("Patient load failed:", p.error.message);
          setLoadFailed(true);
        }
        return;
      }

      setNotFound(false);
      setPatient(p.data as Patient);

      if (s.error) {
        console.error("Sessions load failed:", s.error.message);
        setLoadFailed(true);
      } else {
        setSessions((s.data as Session[]) ?? []);
        setLoadFailed(false);
      }
    } catch (e) {
      if (id !== loadId.current) return;
      console.error("Patient detail load failed:", e);
      setLoadFailed(true);
    }
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
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }

  async function retry() {
    setLoading(true);
    await load();
    setLoading(false);
  }

  async function openExternal(url: string, failTitle: string, failMsg: string) {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert(failTitle, failMsg);
    }
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
      Alert.alert(
        "Couldn't update status",
        "The status wasn't changed. Please check your connection and try again.",
      );
    }
    setUpdatingId(null);
  }

  async function handleDownload() {
    if (!patient) return;
    setDownloading(true);
    try {
      await downloadPatientProfilePdf(patient, sessions);
      if (Platform.OS === "android") {
        Alert.alert(
          "PDF saved",
          "The file was saved to your Downloads folder.",
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (!message.includes("shareAsync has been rejected")) {
        Alert.alert("Couldn't generate PDF", message);
      }
    } finally {
      setDownloading(false);
    }
  }

  async function deleteSession(s: Session) {
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Delete check-up?",
        `"${s.title}" on ${fmt(s.session_date, "MMM d, yyyy")} will be permanently deleted. This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });
    if (!confirmed) return;

    const before = sessions;
    setSessions((list) => list.filter((x) => x.id !== s.id));

    const { error } = await supabase
      .from("sessions")
      .delete()
      .eq("id", s.id);

    if (error) {
      setSessions(before);
      Alert.alert(
        "Couldn't delete check-up",
        "It was not deleted. Please check your connection and try again.",
      );
    }
  }

  const lastVisit = useMemo(() => {
    const done = sessions.find((s) => s.status === "COMPLETED");
    return done ? fmt(done.session_date, "MMM d, yyyy") : "No visits";
  }, [sessions]);

  const nextVisit = useMemo(() => {
    const now = Date.now();
    let best: Session | null = null;
    let bestTime = Infinity;
    for (const s of sessions) {
      if (s.status === "COMPLETED") continue;
      const t = new Date(s.session_date).getTime();
      if (!isNaN(t) && t >= now && t < bestTime) {
        best = s;
        bestTime = t;
      }
    }
    return best;
  }, [sessions]);

  function scrollToPhotos() {
    scrollRef.current?.scrollTo({
      y: Math.max(0, bodyY.current + (photosRef.current as any)?._nativeTag ? 0 : 0),
      animated: true,
    });
  }

  if (loading) {
    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
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
          <Text className={`mt-3 text-base font-bold ${headingText}`}>
            {notFound ? "Patient not found" : "Couldn't load this patient"}
          </Text>
          <Text className={`mt-1 text-center text-sm ${bodyText}`}>
            {notFound
              ? "This record may have been removed."
              : "Please check your connection and try again."}
          </Text>

          <View className="mt-6 flex-row gap-3">
            {!notFound ? (
              <Pressable
                onPress={retry}
                accessibilityRole="button"
                accessibilityLabel="Try again"
                className="rounded-full bg-purple-700 px-5 py-2.5 active:opacity-80"
              >
                <Text className="text-sm font-bold text-white">Try again</Text>
              </Pressable>
            ) : null}
            <Pressable
              onPress={onBack}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className={`rounded-full px-5 py-2.5 active:opacity-80 ${
                notFound ? "bg-purple-700" : pillBg
              }`}
            >
              <Text
                className={`text-sm font-bold ${
                  notFound ? "text-white" : pillText
                }`}
              >
                Go back
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  const completedCount = sessions.filter(
    (s) => s.status === "COMPLETED",
  ).length;
  const inProgressCount = sessions.filter(
    (s) => s.status === "IN PROGRESS",
  ).length;
  const allergiesPresent = hasRealValue(patient.allergies);
  const phoneDigits = (patient.phone ?? "").replace(/[^\d+]/g, "");

  return (
    <View className={`flex-1 ${bg}`}>
      <StatusBar style="light" />

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 60 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ffffff"
            colors={["#7c3aed"]}
          />
        }
      >
        {/* ───── Hero header (slimmed down) ───── */}
        <View
          className="rounded-b-[40px] bg-purple-800 pb-14"
          style={{ paddingTop: insets.top + 12 }}
        >
          {/* Top row: back / title / download + theme */}
          <View className="flex-row items-center justify-between px-5">
            <Pressable
              onPress={onBack}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Go back"
              className="h-11 w-11 items-center justify-center rounded-full bg-white/10 active:opacity-70"
            >
              <Feather name="arrow-left" size={20} color="#ffffff" />
            </Pressable>

            <View className="flex-1 flex-row items-center justify-center gap-2">
              <View className="h-6 w-6 items-center justify-center rounded-md bg-white">
                <Text className="text-xs font-extrabold text-purple-800">
                  D
                </Text>
              </View>
              <Text
                accessibilityRole="header"
                className="text-lg font-extrabold tracking-tight text-white"
              >
                Profile
              </Text>
            </View>

            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={handleDownload}
                disabled={downloading}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Download patient profile as PDF"
                accessibilityState={{ disabled: downloading, busy: downloading }}
                className="h-11 w-11 items-center justify-center rounded-full bg-white/10 active:opacity-70"
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Feather name="download" size={20} color="#ffffff" />
                )}
              </Pressable>

              <Pressable
                onPress={toggleTheme}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={
                  isDark ? "Switch to light mode" : "Switch to dark mode"
                }
                className="h-11 w-11 items-center justify-center rounded-full bg-white/10 active:opacity-70"
              >
                <Feather
                  name={isDark ? "sun" : "moon"}
                  size={20}
                  color="#ffffff"
                />
              </Pressable>
            </View>
          </View>

          {/* Identity */}
          <View className="mt-6 flex-row items-center gap-4 px-5">
            <View className="h-20 w-20 items-center justify-center rounded-[24px] bg-white/20 ring-4 ring-white/10">
              <Text className="text-2xl font-extrabold text-white">
                {(patient.first_name ?? "").charAt(0)}
                {(patient.last_name ?? "").charAt(0)}
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
                  onPress={() =>
                    openExternal(
                      `tel:${phoneDigits || patient.phone}`,
                      "Couldn't start the call",
                      `This device can't place calls. The number is ${patient.phone}.`,
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${patient.phone}`}
                  className="flex-1 flex-row items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5 active:opacity-70"
                >
                  <Feather name="phone" size={14} color="#ffffff" />
                  <Text
                    className="flex-1 text-xs font-semibold text-white"
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {patient.phone}
                  </Text>
                </Pressable>
              ) : null}
              {patient.email ? (
                <Pressable
                  onPress={() =>
                    openExternal(
                      `mailto:${patient.email}`,
                      "No email app found",
                      `You can email this patient at ${patient.email}.`,
                    )
                  }
                  accessibilityRole="button"
                  accessibilityLabel={`Email ${patient.email}`}
                  className="flex-1 flex-row items-center gap-2 rounded-2xl bg-white/10 px-3 py-2.5 active:opacity-70"
                >
                  <Feather name="mail" size={14} color="#ffffff" />
                  <Text
                    className="flex-1 text-xs font-semibold text-white"
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {patient.email}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          )}
        </View>

        <View
          className="px-5"
          onLayout={(e) => {
            bodyY.current = e.nativeEvent.layout.y;
          }}
        >
          {/* ───── Stats ───── */}
          <View className="-mt-8 flex-row gap-3">
            <View
              accessible
              accessibilityLabel={`Total visits: ${sessions.length}`}
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
              accessible
              accessibilityLabel={`Completed: ${completedCount}`}
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
              accessible
              accessibilityLabel={`Active: ${inProgressCount}`}
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

          {/* ───── Quick actions (moved out of hero) ───── */}
          <View className="mt-4 flex-row gap-2">
            <Pressable
              onPress={scrollToPhotos}
              accessibilityRole="button"
              accessibilityLabel="Jump to photos"
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border py-3 active:opacity-70 ${cardBorder} ${cardBg}`}
            >
              <Feather name="camera" size={14} color="#7c3aed" />
              <Text className={`text-[11px] font-bold ${headingText}`}>
                Photos{photoCount > 0 ? ` (${photoCount})` : ""}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setEditingSession(null);
                setShowAddModal(true);
              }}
              accessibilityRole="button"
              accessibilityLabel="Add check-up"
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border py-3 active:opacity-70 ${cardBorder} ${cardBg}`}
            >
              <Feather name="plus" size={14} color="#7c3aed" />
              <Text className={`text-[11px] font-bold ${headingText}`}>
                Check-up
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (!showAi) pendingAiScroll.current = true;
                setShowAi(!showAi);
              }}
              accessibilityRole="button"
              accessibilityLabel="AI Helper"
              accessibilityState={{ expanded: showAi }}
              className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-2xl border py-3 active:opacity-70 ${
                showAi
                  ? "border-purple-700 bg-purple-700"
                  : `${cardBorder} ${cardBg}`
              }`}
            >
              <Feather
                name="zap"
                size={14}
                color={showAi ? "#ffffff" : "#7c3aed"}
              />
              <Text
                className={`text-[11px] font-bold ${
                  showAi ? "text-white" : headingText
                }`}
              >
                AI
              </Text>
            </Pressable>
          </View>

          {/* Load error */}
          {loadFailed ? (
            <View
              accessibilityRole="alert"
              accessibilityLiveRegion="polite"
              className={`mt-4 flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${
                isDark
                  ? "border-red-900/40 bg-red-950/40"
                  : "border-red-100 bg-red-50"
              }`}
            >
              <Text
                className={`flex-1 text-sm leading-5 ${
                  isDark ? "text-red-300" : "text-red-700"
                }`}
              >
                Some information couldn't be loaded. What you see may be out of
                date.
              </Text>
              <Pressable
                onPress={onRefresh}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Retry loading"
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

          {/* ───── Health overview ───── */}
          <View
            className={`mt-6 rounded-3xl border p-5 ${cardBorder} ${cardBg}`}
            style={cardShadow}
          >
            <View className="mb-4 flex-row items-center gap-2">
              <Feather name="heart" size={16} color="#7c3aed" />
              <Text
                accessibilityRole="header"
                className={`text-sm font-bold ${headingText}`}
              >
                Health overview
              </Text>
            </View>

            <View className="flex-row flex-wrap">
              <View className="mb-4 w-1/2 pr-2">
                <Text
                  className={`text-[9px] font-bold uppercase tracking-wider ${labelText}`}
                >
                  Condition
                </Text>
                <Text className={`mt-1 text-xs font-semibold ${headingText}`}>
                  {patient.condition || "Not recorded"}
                </Text>
              </View>
              <View className="mb-4 w-1/2 pl-2">
                <Text
                  className={`text-[9px] font-bold uppercase tracking-wider ${labelText}`}
                >
                  Last Visit
                </Text>
                <Text className={`mt-1 text-xs font-semibold ${headingText}`}>
                  {lastVisit}
                </Text>
              </View>
              <View className="w-1/2 pr-2">
                <View className="flex-row items-center gap-1">
                  <Text
                    className={`text-[9px] font-bold uppercase tracking-wider ${labelText}`}
                  >
                    Allergies
                  </Text>
                  {allergiesPresent ? (
                    <Feather name="alert-triangle" size={10} color="#ef4444" />
                  ) : null}
                </View>
                <Text
                  className={`mt-1 text-xs font-semibold ${
                    allergiesPresent ? "text-red-500" : headingText
                  }`}
                >
                  {patient.allergies || "None"}
                </Text>
              </View>
              <View className="w-1/2 pl-2">
                <Text
                  className={`text-[9px] font-bold uppercase tracking-wider ${labelText}`}
                >
                  Medications
                </Text>
                <Text className={`mt-1 text-xs font-semibold ${headingText}`}>
                  {patient.medications || "None"}
                </Text>
              </View>
            </View>

            {nextVisit ? (
              <View
                accessible
                accessibilityLabel={`Next visit: ${fmt(nextVisit.session_date, "EEEE, MMMM d 'at' h:mm a")}, ${nextVisit.title}`}
                className={`mt-4 flex-row items-center gap-3 rounded-2xl p-3 ${
                  isDark ? "bg-purple-950" : "bg-purple-50"
                }`}
              >
                <Feather name="calendar" size={16} color="#7c3aed" />
                <View className="flex-1">
                  <Text className="text-[9px] font-bold uppercase tracking-wider text-purple-500">
                    Next visit
                  </Text>
                  <Text
                    className={`mt-0.5 text-xs font-semibold ${headingText}`}
                  >
                    {fmt(nextVisit.session_date, "EEE, MMM d · h:mm a")}
                  </Text>
                  <Text
                    className={`mt-0.5 text-[11px] ${bodyText}`}
                    numberOfLines={1}
                  >
                    {nextVisit.title}
                  </Text>
                </View>
              </View>
            ) : null}

            {patient.notes ? (
              <View
                className={`mt-4 rounded-2xl p-3 ${
                  isDark ? "bg-[#0e0a1a]" : "bg-slate-50"
                }`}
              >
                <Text
                  className={`text-[9px] font-bold uppercase tracking-wider ${labelText}`}
                >
                  Notes
                </Text>
                <Text className={`mt-1 text-xs leading-5 ${bodyText}`}>
                  {patient.notes}
                </Text>
              </View>
            ) : null}
          </View>

          {/* ───── Photos & X-rays ───── */}
          <View
            ref={photosRef}
            className={`mt-5 rounded-3xl border p-5 ${cardBorder} ${cardBg}`}
            style={cardShadow}
          >
            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Feather name="camera" size={16} color="#7c3aed" />
                <Text
                  accessibilityRole="header"
                  className={`text-sm font-bold ${headingText}`}
                >
                  Photos & X-rays
                </Text>
                {photoCount > 0 ? (
                  <View className={`rounded-full px-2 py-0.5 ${pillBg}`}>
                    <Text className={`text-[10px] font-bold ${pillText}`}>
                      {photoCount}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <PhotoGallery
              patientId={patientId}
              allSessions
              canEdit
              layout="grid"
              onCountChange={setPhotoCount}
            />
          </View>

          {/* ───── AI Helper (collapsible) ───── */}
          {showAi ? (
            <View
              className="mt-6"
              onLayout={(e) => {
                if (!pendingAiScroll.current) return;
                pendingAiScroll.current = false;
                scrollRef.current?.scrollTo({
                  y: Math.max(0, bodyY.current + e.nativeEvent.layout.y - 16),
                  animated: true,
                });
              }}
            >
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
                <Text
                  accessibilityRole="header"
                  className={`mt-1 text-xl font-extrabold ${headingText}`}
                >
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
                            {fmt(s.session_date, "d")}
                          </Text>
                          <Text
                            className={`text-[9px] font-bold uppercase ${
                              isDark ? "text-purple-200" : "text-purple-900"
                            }`}
                          >
                            {fmt(s.session_date, "MMM", "")}
                          </Text>
                        </View>

                        <View className="flex-1">
                          <Text
                            className={`text-[10px] font-bold uppercase tracking-wider ${labelText}`}
                          >
                            {fmt(s.session_date, "EEEE")} ·{" "}
                            {fmt(s.session_date, "h:mm a")}
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

                      {s.description ? (
                        <Text className={`mt-3 text-sm leading-6 ${bodyText}`}>
                          {s.description}
                        </Text>
                      ) : null}

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
                              accessibilityRole="button"
                              accessibilityLabel={`Mark as ${STATUS_LABEL[status]}`}
                              accessibilityState={{
                                selected: active,
                                disabled: isUpdating,
                              }}
                              style={
                                active
                                  ? {
                                      backgroundColor:
                                        statusColors[status]?.bg,
                                    }
                                  : undefined
                              }
                              className="flex-1 rounded-lg py-2.5 active:opacity-70"
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
                          accessibilityRole="button"
                          accessibilityLabel={`Edit check-up ${s.title}`}
                          className={`flex-row items-center gap-1 rounded-xl px-3 py-2 active:opacity-70 ${
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
                          onPress={() => deleteSession(s)}
                          accessibilityRole="button"
                          accessibilityLabel={`Delete check-up ${s.title}`}
                          className={`flex-row items-center gap-1 rounded-xl px-3 py-2 active:opacity-70 ${
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
                    accessibilityRole="button"
                    accessibilityLabel="Add check-up"
                    className="mt-4 rounded-full bg-purple-700 px-5 py-2.5 active:opacity-80"
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

      <SessionFormModal
        key={editingSession?.id ?? "new-session"}
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