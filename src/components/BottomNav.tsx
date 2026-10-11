import { Feather } from "@expo/vector-icons";
import { Pressable, Text, View } from "react-native";

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
  return (
    <View
      className="absolute inset-x-4 bottom-4 flex-row items-center justify-between rounded-full bg-purple-950 px-3 py-3"
      style={{
        shadowColor: "#4c1d95",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 12,
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

      <Pressable
        onPress={onAdd}
        className="h-14 w-14 items-center justify-center rounded-full bg-purple-500"
        style={{
          marginTop: -28,
          shadowColor: "#a855f7",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        <Feather name="plus" size={26} color="#ffffff" />
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
      className="flex-1 items-center justify-center py-2"
    >
      <Feather
        name={tab.icon as any}
        size={20}
        color={active ? "#ffffff" : "#c4b5fd"}
      />
      <Text
        className={`mt-1 text-[9px] font-bold ${
          active ? "text-white" : "text-purple-300"
        }`}
      >
        {tab.label}
      </Text>
    </Pressable>
  );
}