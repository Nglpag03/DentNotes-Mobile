import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { format } from "date-fns";
import { useTheme } from "../context/ThemeContext";
import { computeNotifications, type NotificationKind } from "../lib/notifications";
import type { Session } from "../types";

interface Props {
  visible: boolean;
  sessions: Session[];
  onClose: () => void;
  onSelectPatient: (id: string) => void;
  onOpenSchedule: () => void;
}

const KIND_STYLE: Record<
  NotificationKind,
  { icon: string; bg: string; color: string }
> = {
  soon: { icon: "clock", bg: "#ede9fe", color: "#6d28d9" },
  "in-progress": { icon: "alert-circle", bg: "#fef3c7", color: "#b45309" },
  missed: { icon: "alert-triangle", bg: "#fee2e2", color: "#b91c1c" },
};

export default function NotificationsPanel({
  visible,
  sessions,
  onClose,
  onSelectPatient,
  onOpenSchedule,
}: Props) {
  const { isDark } = useTheme();
  const notifications = computeNotifications(sessions);

  const panelBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";
  const rowBorder = isDark ? "border-slate-800" : "border-slate-100";
  const divider = isDark ? "border-slate-800" : "border-slate-100";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />

      <View
        className={`absolute inset-x-0 bottom-0 max-h-[75%] rounded-t-[32px] ${panelBg}`}
      >
        {/* Handle */}
        <View className="items-center pt-3">
          <View className={`h-1.5 w-12 rounded-full ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />
        </View>

        {/* Header */}
        <View className={`flex-row items-center justify-between border-b px-6 py-4 ${divider}`}>
          <View>
            <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
              Notifications
            </Text>
            <Text className={`mt-1 text-lg font-bold ${headingText}`}>
              {notifications.length === 0
                ? "You're all caught up"
                : `${notifications.length} alert${notifications.length === 1 ? "" : "s"}`}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            className={`h-10 w-10 items-center justify-center rounded-full ${
              isDark ? "bg-[#0e0a1a]" : "bg-slate-100"
            }`}
          >
            <Feather name="x" size={18} color={isDark ? "#ffffff" : "#64748b"} />
          </Pressable>
        </View>

        {/* List */}
        <ScrollView
          contentContainerStyle={{ paddingVertical: 8 }}
          showsVerticalScrollIndicator={false}
        >
          {notifications.length === 0 ? (
            <View className="items-center py-14">
              <View
                className={`h-16 w-16 items-center justify-center rounded-2xl ${
                  isDark ? "bg-purple-950" : "bg-purple-50"
                }`}
              >
                <Feather name="check-circle" size={28} color="#7c3aed" />
              </View>
              <Text className={`mt-4 text-base font-bold ${headingText}`}>
                Everything's clear
              </Text>
              <Text className={`mt-1 text-sm ${bodyText}`}>
                Nothing needs your attention right now.
              </Text>
            </View>
          ) : (
            notifications.map((n) => {
              const style = KIND_STYLE[n.kind];
              return (
                <Pressable
                  key={n.id}
                  onPress={() => {
                    onClose();
                    onSelectPatient(n.patientId);
                  }}
                  className={`flex-row items-start gap-3 border-b px-6 py-4 ${rowBorder}`}
                >
                  <View
                    className="h-10 w-10 items-center justify-center rounded-xl"
                    style={{ backgroundColor: style.bg }}
                  >
                    <Feather
                      name={style.icon as any}
                      size={18}
                      color={style.color}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-bold ${headingText}`}>
                      {n.title}
                    </Text>
                    <Text className={`mt-0.5 text-xs ${bodyText}`}>
                      {n.body}
                    </Text>
                    <Text className={`mt-1 text-[10px] ${bodyText}`}>
                      {format(n.anchor, "MMM d · h:mm a")}
                    </Text>
                  </View>
                  <Feather
                    name="chevron-right"
                    size={16}
                    color={isDark ? "#a78bfa" : "#c4b5fd"}
                  />
                </Pressable>
              );
            })
          )}

          {/* Footer */}
          <Pressable
            onPress={() => {
              onClose();
              onOpenSchedule();
            }}
            className="items-center py-4"
          >
            <Text className="text-xs font-bold text-purple-600">
              View full schedule →
            </Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}