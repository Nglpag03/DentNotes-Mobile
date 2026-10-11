import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  Text,
  View,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { format, parseISO } from "date-fns";
import { useTheme } from "../context/ThemeContext";
import type { Session, SessionStatus } from "../types";
import { statusColors } from "../lib/theme";

const SCREEN_HEIGHT = Dimensions.get("window").height;

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
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      duration: visible ? 260 : 200,
      useNativeDriver: true,
    }).start();
  }, [visible, slideAnim]);

  if (!session) return null;

  const sheetBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBg = isDark ? "bg-[#0e0a1a]" : "bg-slate-50";
  const cardBorder = isDark ? "border-slate-800" : "border-slate-100";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";
  const labelText = isDark ? "text-slate-500" : "text-slate-400";
  const cancelBg = isDark ? "bg-[#0e0a1a]" : "bg-slate-100";
  const cancelText = isDark ? "text-slate-300" : "text-slate-600";

  const patientName = `${session.patients?.first_name ?? ""} ${
    session.patients?.last_name ?? ""
  }`.trim();

  const timeStr = format(parseISO(session.session_date), "h:mm a");
  const dayStr = format(parseISO(session.session_date), "EEEE, MMM d");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        {/* Blurred backdrop */}
        <Pressable onPress={onClose} className="absolute inset-0">
          <BlurView
            intensity={60}
            tint="dark"
            style={{ flex: 1 }}
          />
          <View className="absolute inset-0 bg-purple-950/40" />
        </Pressable>

        {/* Sheet */}
        <Animated.View
          style={{
            transform: [{ translateY: slideAnim }],
          }}
          className={`rounded-t-[32px] ${sheetBg}`}
        >
          {/* Handle */}
          <View className="items-center pt-3">
            <View
              className={`h-1.5 w-12 rounded-full ${
                isDark ? "bg-slate-700" : "bg-slate-200"
              }`}
            />
          </View>

          {/* Header */}
          <View className="px-6 pt-5 pb-4">
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
                  Session details
                </Text>
                <Text
                  className={`mt-1 text-xl font-extrabold ${headingText}`}
                  numberOfLines={1}
                >
                  {patientName || "Patient"}
                </Text>
                <Text className={`mt-0.5 text-sm ${bodyText}`} numberOfLines={1}>
                  {session.title}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                className={`ml-3 h-10 w-10 items-center justify-center rounded-full ${cancelBg}`}
              >
                <Feather
                  name="x"
                  size={18}
                  color={isDark ? "#ffffff" : "#64748b"}
                />
              </Pressable>
            </View>
          </View>

          {/* Info card */}
          <View className="px-6">
            <View
              className={`rounded-2xl border p-4 ${cardBg} ${cardBorder}`}
            >
              <View className="flex-row items-center gap-3 py-1">
                <Feather name="calendar" size={16} color="#7c3aed" />
                <Text className={`text-sm ${headingText}`}>{dayStr}</Text>
              </View>
              <View className="mt-3 flex-row items-center gap-3">
                <Feather name="clock" size={16} color="#7c3aed" />
                <Text className={`text-sm ${headingText}`}>{timeStr}</Text>
              </View>
              {session.room ? (
                <View className="mt-3 flex-row items-center gap-3">
                  <Feather name="map-pin" size={16} color="#7c3aed" />
                  <Text className={`text-sm ${headingText}`}>{session.room}</Text>
                </View>
              ) : null}
              {session.next_steps ? (
                <View className="mt-3 flex-row items-start gap-3">
                  <Feather name="arrow-right" size={16} color="#7c3aed" />
                  <Text className={`flex-1 text-sm ${bodyText}`}>
                    {session.next_steps}
                  </Text>
                </View>
              ) : null}
            </View>
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
                    style={
                      active
                        ? { backgroundColor: statusColors[status]?.bg }
                        : undefined
                    }
                    className="flex-1 items-center rounded-full py-2.5"
                  >
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

          {/* Actions */}
          <View className="px-6 pt-5">
            <Pressable
              onPress={() => onOpenPatient(session.patient_id)}
              className="flex-row items-center justify-center gap-2 rounded-full bg-purple-800 py-4"
            >
              <Feather name="user" size={16} color="#ffffff" />
              <Text className="text-sm font-bold text-white">
                Open full profile
              </Text>
            </Pressable>

            <Pressable
              onPress={() => onEdit(session)}
              className={`mt-3 flex-row items-center justify-center gap-2 rounded-full py-4 ${cancelBg}`}
            >
              <Feather
                name="edit-2"
                size={14}
                color={isDark ? "#c4b5fd" : "#7c3aed"}
              />
              <Text
                className={`text-sm font-bold ${cancelText}`}
              >
                Edit this session
              </Text>
            </Pressable>
          </View>

          {/* Bottom safe area */}
          <View style={{ height: 40 }} />
        </Animated.View>
      </View>
    </Modal>
  );
}