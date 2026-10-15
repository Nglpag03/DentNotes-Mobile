import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  LayoutChangeEvent,
  Pressable,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Optional haptics — silently no-ops if expo-haptics isn't installed.
async function tap() {
  try {
    const Haptics = require("expo-haptics");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}

type Tab = "home" | "schedule" | "patients" | "notes";

interface Props {
  active: Tab;
  onNavigate: (tab: Tab) => void;
  onAdd: () => void;
  /** Optional badge counts per tab. Omitted/undefined = no badge. */
  badges?: Partial<Record<Tab, number>>;
}

const LEFT_TABS: { key: Tab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "home", label: "Home", icon: "home" },
  { key: "schedule", label: "Schedule", icon: "calendar" },
];

const RIGHT_TABS: { key: Tab; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: "patients", label: "Patients", icon: "users" },
  { key: "notes", label: "Notes", icon: "file-text" },
];

// Layout: 5 equal slots → [left0, left1, FAB, right0, right1]
const SLOT_COUNT = 5;
const FAB_SLOT = 2;

// Where each tab lives in the slot grid.
const TAB_SLOT: Record<Tab, number> = {
  home: 0,
  schedule: 1,
  patients: 3,
  notes: 4,
};

export default function BottomNav({
  active,
  onNavigate,
  onAdd,
  badges,
}: Props) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (mounted) setReduceMotion(v);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Track the bar's inner width so we can compute slot positions.
  const [barWidth, setBarWidth] = useState(0);
  const slotWidth = barWidth > 0 ? barWidth / SLOT_COUNT : 0;

  // Animated X position of the active pill, in px.
  const pillX = useRef(new Animated.Value(0)).current;
  const pillInitialized = useRef(false);

  useEffect(() => {
    if (slotWidth <= 0) return;
    const target = TAB_SLOT[active] * slotWidth;

    if (!pillInitialized.current) {
      // First position — jump, don't animate.
      pillX.setValue(target);
      pillInitialized.current = true;
      return;
    }

    Animated.spring(pillX, {
      toValue: target,
      useNativeDriver: true,
      bounciness: reduceMotion ? 0 : 8,
      speed: 18,
    }).start();
  }, [active, slotWidth, pillX, reduceMotion]);

  const barBg = isDark ? "bg-purple-950" : "bg-purple-900";
  const fabBorder = isDark ? "#1a1525" : "#ffffff";

  const onBarLayout = (e: LayoutChangeEvent) => {
    // Subtract horizontal padding (px-3 = 12 each side) so slot math
    // matches the visible inner area where the icon slots sit.
    const inner = e.nativeEvent.layout.width - 24;
    setBarWidth(inner);
  };

  return (
    <View
      className={`absolute inset-x-4 flex-row items-center rounded-full px-3 py-3 ${barBg}`}
      style={{
        bottom: Math.max(16, insets.bottom + 8),
        shadowColor: "#4c1d95",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 14,
      }}
      onLayout={onBarLayout}
    >
      {/* Sliding active pill (behind the icons) */}
      {slotWidth > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 12, // matches px-3
            top: 12, // matches py-3
            width: slotWidth,
            height: slotWidth,
            transform: [{ translateX: pillX }],
            shadowColor: "#a855f7",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.45,
            shadowRadius: 8,
            elevation: 6,
          }}
          className="rounded-full bg-purple-600"
        />
      ) : null}

      {/* Left tabs */}
      {LEFT_TABS.map((tab) => (
        <NavButton
          key={tab.key}
          tab={tab}
          active={active === tab.key}
          badge={badges?.[tab.key]}
          slotWidth={slotWidth}
          reduceMotion={reduceMotion}
          onPress={() => {
            void tap();
            onNavigate(tab.key);
          }}
        />
      ))}

      {/* Center FAB */}
      <View style={{ flex: 1, alignItems: "center" }}>
        <Fab onPress={onAdd} borderColor={fabBorder} reduceMotion={reduceMotion} />
      </View>

      {/* Right tabs */}
      {RIGHT_TABS.map((tab) => (
        <NavButton
          key={tab.key}
          tab={tab}
          active={active === tab.key}
          badge={badges?.[tab.key]}
          slotWidth={slotWidth}
          reduceMotion={reduceMotion}
          onPress={() => {
            void tap();
            onNavigate(tab.key);
          }}
        />
      ))}
    </View>
  );
}

/* ─────────────────────────────────────────────
   Tab button — icon + label-free, optional badge
   ───────────────────────────────────────────── */
function NavButton({
  tab,
  active,
  badge,
  slotWidth,
  onPress,
  reduceMotion,
}: {
  tab: { key: Tab; label: string; icon: keyof typeof Feather.glyphMap };
  active: boolean;
  badge?: number;
  slotWidth: number;
  onPress: () => void;
  reduceMotion: boolean;
}) {
  const pressAnim = useRef(new Animated.Value(1)).current;

  // Fade the icon to white when it becomes active; the pill behind
  // slides over, so the icon just needs a soft transition.
  const activeAnim = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(activeAnim, {
      toValue: active ? 1 : 0,
      duration: reduceMotion ? 0 : 180,
      useNativeDriver: true,
    }).start();
  }, [active, activeAnim, reduceMotion]);

  const onPressIn = () => {
    Animated.spring(pressAnim, {
      toValue: 0.9,
      useNativeDriver: true,
      bounciness: 0,
      speed: 40,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(pressAnim, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: reduceMotion ? 0 : 6,
      speed: 20,
    }).start();
  };

  const showBadge = typeof badge === "number" && badge > 0;
  const badgeText = badge && badge > 99 ? "99+" : String(badge ?? "");

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="tab"
      accessibilityLabel={
        showBadge ? `${tab.label}, ${badgeText} new` : tab.label
      }
      accessibilityState={{ selected: active }}
      hitSlop={6}
      style={{
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View
        style={{
          width: slotWidth || 48,
          height: slotWidth || 48,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ scale: pressAnim }],
        }}
      >
        {/* Inactive icon (fades out when active) */}
        <Animated.View
          style={{
            position: "absolute",
            opacity: activeAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          }}
        >
          <Feather name={tab.icon} size={22} color="#c4b5fd" />
        </Animated.View>

        {/* Active icon (fades in) */}
        <Animated.View
          pointerEvents="none"
          style={{ position: "absolute", opacity: activeAnim }}
        >
          <Feather name={tab.icon} size={22} color="#ffffff" />
        </Animated.View>

        {/* Badge */}
        {showBadge ? (
          <View
            className="absolute items-center justify-center rounded-full bg-red-500"
            style={{
              top: 4,
              right: 4,
              minWidth: 18,
              height: 18,
              paddingHorizontal: 4,
              borderWidth: 2,
              borderColor: isDarkBg(tab, active) ? "#4c1d95" : "#5b21b6",
            }}
          >
            <Text className="text-[9px] font-extrabold text-white">
              {badgeText}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

// Rough helper: the badge border should match the pill (active) or bar
// (inactive) color so it "cuts" cleanly. We keep it simple — same dark
// purple for both states, works fine against the design.
function isDarkBg(_tab: unknown, _active: boolean) {
  return true;
}

/* ─────────────────────────────────────────────
   Center FAB with press animation (no idle pulse)
   ───────────────────────────────────────────── */
function Fab({
  onPress,
  borderColor,
  reduceMotion,
}: {
  onPress: () => void;
  borderColor: string;
  reduceMotion: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.9,
      useNativeDriver: true,
      bounciness: 0,
      speed: 40,
    }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      bounciness: reduceMotion ? 0 : 10,
      speed: 14,
    }).start();
  };

  return (
    <Pressable
      onPress={() => {
        void tap();
        onPress();
      }}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel="Add new"
      accessibilityHint="Opens the create menu"
      hitSlop={8}
    >
      <Animated.View
        style={{
          marginTop: -34,
          transform: [{ scale }],
        }}
      >
        <View
          className="h-16 w-16 items-center justify-center rounded-full bg-purple-500"
          style={{
            borderWidth: 4,
            borderColor,
            shadowColor: "#a855f7",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.5,
            shadowRadius: 14,
            elevation: 12,
          }}
        >
          <Feather name="plus" size={28} color="#ffffff" />
        </View>
      </Animated.View>
    </Pressable>
  );
}