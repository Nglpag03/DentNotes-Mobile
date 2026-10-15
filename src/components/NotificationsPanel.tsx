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
import { Feather } from "@expo/vector-icons";
import { format, formatDistanceToNowStrict } from "date-fns";
import { useTheme } from "../context/ThemeContext";
import {
  computeNotifications,
  type NotificationKind,
} from "../lib/notifications";
import type { Session } from "../types";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SCREEN_HEIGHT = Dimensions.get("window").height;
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.8;
const DISMISS_THRESHOLD = 120;

interface Props {
  visible: boolean;
  sessions: Session[];
  onClose: () => void;
  onSelectPatient: (id: string) => void;
  onOpenSchedule: () => void;
}

const KIND_STYLE: Record<
  NotificationKind,
  { icon: keyof typeof Feather.glyphMap; bg: string; color: string }
> = {
  soon: { icon: "clock", bg: "#ede9fe", color: "#6d28d9" },
  "in-progress": { icon: "alert-circle", bg: "#fef3c7", color: "#b45309" },
  missed: { icon: "alert-triangle", bg: "#fee2e2", color: "#b91c1c" },
};

const KIND_ORDER: NotificationKind[] = ["missed", "in-progress", "soon"];

const KIND_SECTION_LABEL: Record<NotificationKind, string> = {
  missed: "Missed",
  "in-progress": "In progress",
  soon: "Coming up",
};

export default function NotificationsPanel({
  visible,
  sessions,
  onClose,
  onSelectPatient,
  onOpenSchedule,
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

  useEffect(() => {
    if (visible) dragY.setValue(0);
  }, [visible, dragY]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) dragY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_THRESHOLD) {
          Animated.timing(dragY, {
            toValue: SCREEN_HEIGHT,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            dragY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    }),
  ).current;

  const notifications = computeNotifications(sessions);

  // Group by kind, and order the groups by urgency.
  const grouped = KIND_ORDER.map((kind) => ({
    kind,
    items: notifications.filter((n) => n.kind === kind),
  })).filter((g) => g.items.length > 0);

  const panelBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";
  const labelText = isDark ? "text-slate-500" : "text-slate-400";
  const rowBorder = isDark ? "border-slate-800" : "border-slate-100";
  const divider = isDark ? "border-slate-800" : "border-slate-100";
  const closeBg = isDark ? "bg-[#0e0a1a]" : "bg-slate-100";

  const translateY = Animated.add(slideAnim, dragY);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end">
        {/* Backdrop */}
        <Pressable
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close notifications"
          className="absolute inset-0 bg-black/40"
        />

        {/* Sheet */}
        <Animated.View
          style={{
            transform: [{ translateY }],
            maxHeight: MAX_SHEET_HEIGHT,
          }}
          className={`rounded-t-[32px] ${panelBg}`}
        >
          {/* Draggable handle + header */}
          <View {...panResponder.panHandlers}>
            <View className="items-center pt-3">
              <View
                className={`h-1.5 w-12 rounded-full ${
                  isDark ? "bg-slate-700" : "bg-slate-200"
                }`}
              />
            </View>

            <View
              className={`flex-row items-center justify-between border-b px-6 py-4 ${divider}`}
            >
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Feather name="bell" size={11} color="#7c3aed" />
                  <Text className="text-[10px] font-bold uppercase tracking-widest text-purple-600">
                    Notifications
                  </Text>
                </View>
                <Text className={`mt-1 text-lg font-bold ${headingText}`}>
                  {notifications.length === 0
                    ? "You're all caught up"
                    : `${notifications.length} alert${notifications.length === 1 ? "" : "s"}`}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close"
                className={`h-10 w-10 items-center justify-center rounded-full active:opacity-70 ${closeBg}`}
              >
                <Feather
                  name="x"
                  size={18}
                  color={isDark ? "#ffffff" : "#64748b"}
                />
              </Pressable>
            </View>
          </View>

          {/* List */}
          <ScrollView
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {notifications.length === 0 ? (
              <View className="items-center px-6 py-14">
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
                <Pressable
                  onPress={() => {
                    onClose();
                    onOpenSchedule();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="View full schedule"
                  className="mt-4 rounded-full bg-purple-700 px-5 py-2.5 active:opacity-80"
                >
                  <Text className="text-xs font-bold text-white">
                    View schedule
                  </Text>
                </Pressable>
              </View>
            ) : (
              <>
                {grouped.map((group) => (
                  <View key={group.kind}>
                    {/* Section header */}
                    <View className="flex-row items-center gap-2 px-6 pb-1 pt-4">
                      <Text
                        className={`text-[10px] font-bold uppercase tracking-widest ${labelText}`}
                      >
                        {KIND_SECTION_LABEL[group.kind]}
                      </Text>
                      <View
                        className={`rounded-full px-1.5 py-0.5 ${
                          isDark ? "bg-slate-800" : "bg-slate-100"
                        }`}
                      >
                        <Text
                          className={`text-[9px] font-bold ${bodyText}`}
                        >
                          {group.items.length}
                        </Text>
                      </View>
                    </View>

                    {group.items.map((n) => {
                      const style = KIND_STYLE[n.kind];
                      const relative = formatDistanceToNowStrict(n.anchor, {
                        addSuffix: true,
                      });
                      const absolute = format(n.anchor, "MMM d · h:mm a");
                      return (
                        <Pressable
                          key={n.id}
                          onPress={() => {
                            onClose();
                            onSelectPatient(n.patientId);
                          }}
                          accessibilityRole="button"
                          accessibilityLabel={`${n.title}. ${n.body}. ${relative}`}
                          accessibilityHint="Opens the patient's record"
                          className={`flex-row items-start gap-3 border-b px-6 py-4 active:opacity-70 ${rowBorder}`}
                        >
                          <View
                            className="h-10 w-10 items-center justify-center rounded-xl"
                            style={{ backgroundColor: style.bg }}
                            accessibilityElementsHidden
                            importantForAccessibility="no"
                          >
                            <Feather
                              name={style.icon}
                              size={18}
                              color={style.color}
                            />
                          </View>
                          <View className="flex-1">
                            <Text
                              className={`text-sm font-bold ${headingText}`}
                              numberOfLines={1}
                            >
                              {n.title}
                            </Text>
                            <Text
                              className={`mt-0.5 text-xs ${bodyText}`}
                              numberOfLines={2}
                            >
                              {n.body}
                            </Text>
                            <View className="mt-1 flex-row items-center gap-1.5">
                              <Text
                                className={`text-[10px] font-bold text-purple-600`}
                              >
                                {relative}
                              </Text>
                              <Text
                                className={`text-[10px] ${bodyText}`}
                              >
                                · {absolute}
                              </Text>
                            </View>
                          </View>
                          <Feather
                            name="chevron-right"
                            size={16}
                            color={isDark ? "#a78bfa" : "#c4b5fd"}
                            accessibilityElementsHidden
                            importantForAccessibility="no"
                          />
                        </Pressable>
                      );
                    })}
                  </View>
                ))}

                {/* Footer */}
                <Pressable
                  onPress={() => {
                    onClose();
                    onOpenSchedule();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="View full schedule"
                  className="items-center py-4 active:opacity-70"
                >
                  <Text className="text-xs font-bold text-purple-600">
                    View full schedule →
                  </Text>
                </Pressable>
              </>
            )}

            {/* Safe-area spacer */}
            <View style={{ height: insets.bottom + 8 }} />
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}