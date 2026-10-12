import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";
import { useTheme } from "../context/ThemeContext";

type Tab = "home" | "schedule" | "patients" | "notes";

interface Props {
  active: Tab;
  onNavigate: (tab: Tab) => void;
  onAdd: () => void;
}

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: "home", label: "Home", icon: "home" },
  { key: "schedule", label: "Schedule", icon: "calendar" },
  { key: "patients", label: "Patients", icon: "users" },
  { key: "notes", label: "Notes", icon: "file-text" },
];

export default function BottomNav({ active, onNavigate, onAdd }: Props) {
  const { isDark } = useTheme();

  const barBg = isDark ? "bg-purple-950" : "bg-purple-900";

  return (
    <View
      className={`absolute inset-x-4 bottom-4 flex-row items-center justify-between rounded-full px-3 py-3 ${barBg}`}
      style={{
        shadowColor: "#4c1d95",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 14,
      }}
    >
      {TABS.slice(0, 2).map((tab) => (
        <NavButton
          key={tab.key}
          tab={tab}
          active={active === tab.key}
          onPress={() => onNavigate(tab.key)}
        />
      ))}

      {/* Center FAB */}
      <Pressable
        onPress={onAdd}
        className="h-16 w-16 items-center justify-center rounded-full bg-purple-500"
        style={{
          marginTop: -34,
          borderWidth: 4,
          borderColor: "#ffffff",
          shadowColor: "#a855f7",
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.5,
          shadowRadius: 14,
          elevation: 12,
        }}
      >
        <Feather name="plus" size={28} color="#ffffff" />
      </Pressable>

      {TABS.slice(2).map((tab) => (
        <NavButton
          key={tab.key}
          tab={tab}
          active={active === tab.key}
          onPress={() => onNavigate(tab.key)}
        />
      ))}
    </View>
  );
}

function NavButton({
  tab,
  active,
  onPress,
}: {
  tab: { key: Tab; label: string; icon: string };
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center justify-center"
    >
      <View
        className={`h-12 w-12 items-center justify-center rounded-full ${
          active ? "bg-purple-700" : ""
        }`}
        style={
          active
            ? {
                shadowColor: "#a855f7",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 6,
              }
            : undefined
        }
      >
        <Feather
          name={tab.icon as any}
          size={22}
          color={active ? "#ffffff" : "#c4b5fd"}
        />
      </View>
    </Pressable>
  );
}