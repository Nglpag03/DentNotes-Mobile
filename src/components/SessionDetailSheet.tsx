import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { useTheme } from "../context/ThemeContext";
import type { Session, SessionStatus } from "../types";
import { statusColors } from "../lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PhotoGallery from "./PhotoGallery";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;

// How far the user must drag before the sheet dismisses.
const DISMISS_THRESHOLD = 120;

interface Props {
  visible: boolean;
  session: Session | null;
  onClose: () => void;
  onStatusChange: (sessionId: string, next: SessionStatus) => void;
  onOpenPatient: (patientId: string) => void;
  onEdit: (session: Session) => void;
}

const STATUSES: SessionStatus[] = ["PLANNED", "IN PROGRESS", "COMPLETED"];

const STATUS_LABEL: Record<SessionStatus, string> = {
  PLANNED: "Planned",
  "IN PROGRESS": "In progress",
  COMPLETED: "Completed",
};

export default function SessionDetailSheet({
  visible,
  session,
  onClose,
  onStatusChange,
  onOpenPatient,
  onEdit,
}: Props) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const dragY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      duration: visible ? 260 : 200,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  // Reset the drag offset each time the sheet opens.
  useEffect(() => {
    if (visible) dragY.setValue(0);
  }, [visible, dragY]);

  // Drag-to-dismiss: pan down on the handle / header area.
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        // Only respond to downward drags that are more vertical than horizontal.
        g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        // Only allow downward drag; ignore upward.
        if (g.dy > 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_THRESHOLD) {
          // Slide out then notify parent.
          Animated.timing(dragY, {
            toValue: SCREEN_HEIGHT,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            dragY.setValue(0);
            onClose();
          });
        } else {
          // Snap back up.
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    }),
  ).current;

  if (!session) return null;

  const sheetBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBg = isDark ? "bg-[#0e0a1a]" : "bg-slate-50";
  const cardBorder = isDark ? "border-slate-800" : "border-slate-100";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";
  const labelText = isDark ? "text-slate-500" : "text-slate-400";
  const cancelBg = isDark ? "bg-[#0e0a1a]" : "bg-slate-100";
  const cancelText = isDark ? "text-slate-300" : "text-slate-600";
  const divider = isDark ? "bg-slate-800" : "bg-slate-100";

  const patientName = `${session.patients?.first_name ?? ""} ${
    session.patients?.last_name ?? ""
  }`.trim();

  const sessionDate = session.session_date
    ? new Date(session.session_date)
    : null;
  const validDate =
    sessionDate && !isNaN(sessionDate.getTime()) ? sessionDate : null;

  const timeStr = validDate ? format(validDate, "h:mm a") : "--:--";
  const dayStr = validDate ? format(validDate, "EEEE, MMM d") : "Unknown date";

  // Combined slide + drag transform.
  const translateY = Animated.add(slideAnim, dragY);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        {/* Blurred backdrop */}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close session details"
          className="absolute inset-0"
        >
          <BlurView intensity={60} tint="dark" style={{ flex: 1 }} />
          <View className="absolute inset-0 bg-purple-950/40" />
        </Pressable>

        {/* Sheet */}
        <Animated.View
          style={{
            transform: [{ translateY }],
            maxHeight: MAX_SHEET_HEIGHT,
          }}
          className={`rounded-t-[32px] ${sheetBg}`}
        >
          {/* ───── Draggable handle + header region ───── */}
          <View {...panResponder.panHandlers}>
            <View className="items-center pt-3">
              <View
                accessibilityLabel="Drag down to close"
                className={`h-1.5 w-12 rounded-full ${
                  isDark ? "bg-slate-700" : "bg-slate-200"
                }`}
              />
            </View>

            <View className="flex-row items-start justify-between px-6 pb-4 pt-4">
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Feather name="clipboard" size={11} color="#7c3aed" />
                  <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
                    Session details
                  </Text>
                </View>
                <Text
                  className={`mt-1 text-xl font-extrabold ${headingText}`}
                  numberOfLines={1}
                >
                  {patientName || "Patient"}
                </Text>
                <Text
                  className={`mt-0.5 text-sm ${bodyText}`}
                  numberOfLines={1}
                >
                  {session.title}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
                className={`ml-3 h-10 w-10 items-center justify-center rounded-full active:opacity-70 ${cancelBg}`}
              >
                <Feather
                  name="x"
                  size={18}
                  color={isDark ? "#ffffff" : "#64748b"}
                />
              </Pressable>
            </View>
          </View>

          {/* ───── Scrollable body ───── */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Info card */}
            <View className="px-6">
              <View
                className={`rounded-2xl border p-4 ${cardBg} ${cardBorder}`}
              >
                <InfoRow
                  icon="calendar"
                  text={dayStr}
                  headingText={headingText}
                />
                <InfoRow
                  icon="clock"
                  text={timeStr}
                  headingText={headingText}
                />
                {session.room ? (
                  <InfoRow
                    icon="map-pin"
                    text={session.room}
                    headingText={headingText}
                  />
                ) : null}
                {session.next_steps ? (
                  <InfoRow
                    icon="arrow-right"
                    text={session.next_steps}
                    headingText={bodyText}
                    multiline
                  />
                ) : null}
              </View>
            </View>

            {/* Photos */}
            <View className="px-6 pt-5">
              <View className="mb-2 flex-row items-center gap-1.5">
                <Feather name="image" size={11} color="#7c3aed" />
                <Text
                  className={`text-[10px] font-bold uppercase tracking-widest ${labelText}`}
                >
                  Photos
                </Text>
              </View>
              <PhotoGallery
                patientId={session.patient_id}
                sessionId={session.id!}
              />
            </View>

            {/* Status control */}
            <View className="px-6 pt-5">
              <Text
                className={`mb-2 text-[10px] font-bold uppercase tracking-widest ${labelText}`}
              >
                Status
              </Text>
              <View
                className={`flex-row rounded-full p-1 ${
                  isDark ? "bg-[#0e0a1a]" : "bg-slate-100"
                }`}
              >
                {STATUSES.map((status) => {
                  const active = session.status === status;
                  return (
                    <Pressable
                      key={status}
                      onPress={() => onStatusChange(session.id!, status)}
                      accessibilityRole="button"
                      accessibilityLabel={`Set status: ${STATUS_LABEL[status]}`}
                      accessibilityState={{ selected: active }}
                      style={
                        active
                          ? { backgroundColor: statusColors[status]?.bg }
                          : undefined
                      }
                      className="flex-1 flex-row items-center justify-center gap-1 rounded-full py-2.5 active:opacity-80"
                    >
                      {active ? (
                        <Feather
                          name="check"
                          size={11}
                          color={statusColors[status]?.text}
                        />
                      ) : null}
                      <Text
                        style={
                          active
                            ? { color: statusColors[status]?.text }
                            : undefined
                        }
                        className={`text-[11px] font-bold ${
                          active ? "" : bodyText
                        }`}
                      >
                        {STATUS_LABEL[status]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* Divider before actions */}
            <View className={`mx-6 mt-6 h-px ${divider}`} />

            {/* Actions */}
            <View className="px-6 pt-4">
              <Pressable
                onPress={() => onOpenPatient(session.patient_id)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${patientName || "patient"}'s full profile`}
                className="flex-row items-center justify-center gap-2 rounded-full bg-purple-800 py-4 active:opacity-90"
              >
                <Feather name="user" size={16} color="#ffffff" />
                <Text className="text-sm font-bold text-white">
                  Open full profile
                </Text>
              </Pressable>

              <Pressable
                onPress={() => onEdit(session)}
                accessibilityRole="button"
                accessibilityLabel="Edit this session"
                className={`mt-3 flex-row items-center justify-center gap-2 rounded-full py-4 active:opacity-80 ${cancelBg}`}
              >
                <Feather
                  name="edit-2"
                  size={14}
                  color={isDark ? "#c4b5fd" : "#7c3aed"}
                />
                <Text className={`text-sm font-bold ${cancelText}`}>
                  Edit this session
                </Text>
              </Pressable>
            </View>

            {/* Bottom safe area */}
            <View style={{ height: insets.bottom + 16 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

// ───── Small helper: consistent info rows ─────
function InfoRow({
  icon,
  text,
  headingText,
  multiline = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  text: string;
  headingText: string;
  multiline?: boolean;
}) {
  return (
    <View
      className={`flex-row gap-3 ${multiline ? "items-start" : "items-center"} mt-3 first:mt-0`}
    >
      <Feather name={icon} size={16} color="#7c3aed" />
      <Text
        className={`flex-1 text-sm ${headingText}`}
        numberOfLines={multiline ? undefined : 1}
      >
        {text}
      </Text>
    </View>
  );
}