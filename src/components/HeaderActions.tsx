import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import NotificationsPanel from "./NotificationsPanel";
import { computeNotifications } from "../lib/notifications";
import type { Session } from "../types";

interface Props {
  sessions: Session[];
  onOpenSchedule?: () => void;
  onSelectPatient?: (id: string) => void;
}

export default function HeaderActions({
  sessions,
  onOpenSchedule,
  onSelectPatient,
}: Props) {
  const { isDark, toggleTheme } = useTheme();
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const count = computeNotifications(sessions).length;

  return (
    <>
      <View className="flex-row items-center gap-2">
        {/* Theme toggle */}
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

        {/* Bell */}
        <Pressable
          onPress={() => setNotificationsOpen(true)}
          className="relative h-11 w-11 items-center justify-center rounded-full bg-white/10"
        >
          <Feather name="bell" size={20} color="#ffffff" />
          {count > 0 && (
            <View className="absolute -right-1 -top-1 h-5 min-w-[20px] items-center justify-center rounded-full bg-white px-1">
              <Text className="text-[10px] font-extrabold text-purple-800">
                {count > 9 ? "9+" : count}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Notifications panel */}
      <NotificationsPanel
        visible={notificationsOpen}
        sessions={sessions}
        onClose={() => setNotificationsOpen(false)}
        onSelectPatient={(id) => {
          setNotificationsOpen(false);
          onSelectPatient?.(id);
        }}
        onOpenSchedule={() => {
          setNotificationsOpen(false);
          onOpenSchedule?.();
        }}
      />
    </>
  );
}