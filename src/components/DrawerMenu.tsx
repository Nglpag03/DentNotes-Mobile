import { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;
const DRAWER_WIDTH = Math.min(SCREEN_WIDTH * 0.8, 320);

interface Props {
  visible: boolean;
  onClose: () => void;
  onNavigateHome: () => void;
  onNavigateSchedule: () => void;
  onNavigatePatients: () => void;
  onSignOut: () => void;
}

export default function DrawerMenu({
  visible,
  onClose,
  onNavigateHome,
  onNavigateSchedule,
  onNavigatePatients,
  onSignOut,
}: Props) {
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -DRAWER_WIDTH,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  function navigate(fn: () => void) {
    onClose();
    // Small delay so drawer closes smoothly before navigating
    setTimeout(fn, 150);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable className="flex-1 bg-black/40" onPress={onClose} />

      {/* Drawer */}
      <Animated.View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: DRAWER_WIDTH,
          transform: [{ translateX: slideAnim }],
        }}
        className="bg-purple-950"
      >
        <ScrollView
          contentContainerStyle={{
            paddingTop: 70,
            paddingBottom: 40,
            paddingHorizontal: 24,
          }}
        >
          {/* Brand */}
          <Text className="mb-10 text-2xl font-extrabold text-white">
            DentNotes
          </Text>

          {/* Nav items */}
          <MenuItem
            icon="home"
            label="Dashboard"
            active
            onPress={() => navigate(onNavigateHome)}
          />
          <MenuItem
            icon="calendar"
            label="Appointments"
            onPress={() => navigate(onNavigateSchedule)}
          />
          <MenuItem
            icon="users"
            label="Patients"
            onPress={() => navigate(onNavigatePatients)}
          />
          <MenuItem
            icon="user-plus"
            label="Add patient"
            onPress={() => navigate(onNavigatePatients)}
          />
          <MenuItem
            icon="file-text"
            label="Clinical notes"
            onPress={onClose}
          />
          <MenuItem
            icon="search"
            label="Search records"
            onPress={onClose}
          />

          {/* Divider */}
          <View className="mt-8 mb-4 h-px bg-white/10" />

          {/* Sign out */}
          <Pressable
            onPress={() => navigate(onSignOut)}
            className="flex-row items-center gap-4 rounded-2xl bg-white/5 px-4 py-3.5"
          >
            <Feather name="log-out" size={18} color="#fca5a5" />
            <Text className="text-sm font-bold text-red-300">Sign out</Text>
          </Pressable>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

function MenuItem({
  icon,
  label,
  active,
  onPress,
}: {
  icon: string;
  label: string;
  active?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`mb-1 flex-row items-center gap-4 rounded-2xl px-4 py-3.5 ${
        active ? "bg-purple-600" : ""
      }`}
    >
      <Feather
        name={icon as any}
        size={18}
        color={active ? "#ffffff" : "#d8b4fe"}
      />
      <Text
        className={`text-sm font-bold ${
          active ? "text-white" : "text-purple-100"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}