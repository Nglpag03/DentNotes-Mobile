import { useEffect, useRef } from "react";
import { Animated, View, type ViewStyle } from "react-native";
import { useTheme } from "../context/ThemeContext";

interface SkeletonProps {
  width?: number | string;
  height?: number;
  rounded?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = "100%",
  height = 16,
  rounded = 12,
  style,
}: SkeletonProps) {
  const { isDark } = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: rounded,
          opacity,
          backgroundColor: isDark ? "#2a2440" : "#e5e1ec",
        },
        style,
      ]}
    />
  );
}

/* ═══════════════════════════════════════════════════════
   DASHBOARD SKELETON
   ═══════════════════════════════════════════════════════ */
export function DashboardSkeleton() {
  const { isDark } = useTheme();
  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";

  return (
    <View className={`flex-1 ${bg}`}>
      <View className="rounded-b-[40px] bg-purple-800 pb-10 pt-14">
        <View className="flex-row items-center justify-between px-5">
          <Skeleton width={44} height={44} rounded={22} />
          <View className="flex-row items-center gap-2">
            <Skeleton width={24} height={24} rounded={6} />
            <Skeleton width={90} height={20} rounded={6} />
          </View>
          <View className="flex-row items-center gap-2">
            <Skeleton width={44} height={44} rounded={22} />
            <Skeleton width={44} height={44} rounded={22} />
          </View>
        </View>
        <View className="mt-6 flex-row items-center gap-4 px-5">
          <Skeleton width={64} height={64} rounded={32} />
          <View className="flex-1 gap-2">
            <Skeleton width="50%" height={14} rounded={6} />
            <Skeleton width="80%" height={22} rounded={6} />
            <Skeleton width="60%" height={12} rounded={6} />
          </View>
        </View>
        <View className="mt-5 px-5">
          <Skeleton width="100%" height={44} rounded={16} />
        </View>
      </View>

      <View className="-mt-6 flex-row gap-3 px-5">
        <View className={`flex-1 rounded-3xl border p-5 ${cardBorder} ${cardBg}`}>
          <Skeleton width={60} height={36} rounded={10} />
          <Skeleton width="70%" height={12} rounded={6} style={{ marginTop: 12 }} />
          <Skeleton width="50%" height={10} rounded={6} style={{ marginTop: 8 }} />
        </View>
        <View className={`flex-1 rounded-3xl border p-5 ${cardBorder} ${cardBg}`}>
          <Skeleton width={60} height={36} rounded={10} />
          <Skeleton width="70%" height={12} rounded={6} style={{ marginTop: 12 }} />
          <Skeleton width="50%" height={10} rounded={6} style={{ marginTop: 8 }} />
        </View>
      </View>

      <View className={`mt-6 mx-5 rounded-3xl border p-5 ${cardBorder} ${cardBg}`}>
        <Skeleton width="50%" height={22} rounded={6} />
        <Skeleton width="35%" height={12} rounded={6} style={{ marginTop: 8 }} />
        <View className="mt-6 flex-row items-end justify-between" style={{ height: 120 }}>
          {[60, 90, 70, 110, 80, 50, 40].map((h, i) => (
            <Skeleton key={i} width={28} height={h} rounded={14} />
          ))}
        </View>
      </View>

      <View className="mt-8 px-5">
        <Skeleton width="50%" height={22} rounded={6} />
        <View className="mt-4 gap-3">
          {[0, 1].map((i) => (
            <View
              key={i}
              className={`flex-row items-center gap-3 rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
            >
              <Skeleton width={64} height={48} rounded={12} />
              <View className="flex-1 gap-2">
                <Skeleton width="60%" height={14} rounded={6} />
                <Skeleton width="80%" height={12} rounded={6} />
              </View>
              <Skeleton width={80} height={28} rounded={14} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   LIST SKELETON (Patients)
   ═══════════════════════════════════════════════════════ */
export function ListSkeleton() {
  const { isDark } = useTheme();
  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";

  return (
    <View className={`flex-1 ${bg}`}>
      {/* Hero header skeleton */}
      <View className="rounded-b-[40px] bg-purple-800 pb-8 pt-14">
        <View className="flex-row items-center justify-between px-5">
          <Skeleton width={44} height={44} rounded={22} />
          <View className="flex-row items-center gap-2">
            <Skeleton width={24} height={24} rounded={6} />
            <Skeleton width={70} height={20} rounded={6} />
          </View>
          <View className="flex-row items-center gap-2">
            <Skeleton width={44} height={44} rounded={22} />
            <Skeleton width={44} height={44} rounded={22} />
          </View>
        </View>

        <View className="mt-6 flex-row items-center gap-4 px-5">
          <View className="flex-1 gap-2">
            <Skeleton width="30%" height={12} rounded={6} />
            <Skeleton width="60%" height={24} rounded={6} />
            <Skeleton width="40%" height={12} rounded={6} />
          </View>
          <Skeleton width={80} height={40} rounded={16} />
        </View>
      </View>

      {/* Search bar */}
      <View className="px-5 pt-4">
        <Skeleton width="100%" height={48} rounded={16} />

        {/* Patient rows */}
        <View className="mt-4 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              className={`flex-row items-center gap-3 rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
            >
              <Skeleton width={44} height={44} rounded={22} />
              <View className="flex-1 gap-2">
                <Skeleton width="55%" height={14} rounded={6} />
                <Skeleton width="75%" height={12} rounded={6} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   SCHEDULE SKELETON
   ═══════════════════════════════════════════════════════ */
export function ScheduleSkeleton() {
  const { isDark } = useTheme();
  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";

  return (
    <View className={`flex-1 ${bg}`}>
      {/* Hero header */}
      <View className="rounded-b-[40px] bg-purple-800 pb-8 pt-14">
        <View className="flex-row items-center justify-between px-5">
          <Skeleton width={44} height={44} rounded={22} />
          <View className="flex-row items-center gap-2">
            <Skeleton width={24} height={24} rounded={6} />
            <Skeleton width={80} height={20} rounded={6} />
          </View>
          <View className="flex-row items-center gap-2">
            <Skeleton width={44} height={44} rounded={22} />
            <Skeleton width={44} height={44} rounded={22} />
          </View>
        </View>

        <View className="mt-6 flex-row gap-3 px-5">
          {[0, 1, 2].map((i) => (
            <View key={i} className="flex-1 rounded-2xl bg-white/10 p-3.5">
              <Skeleton width={40} height={28} rounded={6} />
              <Skeleton
                width="70%"
                height={10}
                rounded={6}
                style={{ marginTop: 8 }}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Week strip */}
      <View className="mt-6">
        <View className="flex-row gap-2 px-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} width={64} height={96} rounded={16} />
          ))}
        </View>
      </View>

      {/* Selected day label */}
      <View className="mt-6 flex-row items-end justify-between px-5">
        <View className="gap-2">
          <Skeleton width={60} height={12} rounded={6} />
          <Skeleton width={120} height={24} rounded={6} />
        </View>
        <Skeleton width={90} height={28} rounded={14} />
      </View>

      {/* Sessions */}
      <View className="mt-5 gap-3 px-5">
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            className={`flex-row items-center gap-3 rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
          >
            <Skeleton width={64} height={48} rounded={12} />
            <Skeleton width={4} height={40} rounded={2} />
            <View className="flex-1 gap-2">
              <Skeleton width="60%" height={14} rounded={6} />
              <Skeleton width="80%" height={12} rounded={6} />
            </View>
            <Skeleton width={70} height={28} rounded={14} />
          </View>
        ))}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   PATIENT DETAIL SKELETON
   ═══════════════════════════════════════════════════════ */
export function PatientDetailSkeleton() {
  const { isDark } = useTheme();
  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";

  return (
    <View className={`flex-1 ${bg}`}>
      {/* Hero header */}
      <View className="rounded-b-[40px] bg-purple-800 pb-8 pt-14">
        <View className="flex-row items-center justify-between px-5">
          <Skeleton width={44} height={44} rounded={22} />
          <View className="flex-row items-center gap-2">
            <Skeleton width={24} height={24} rounded={6} />
            <Skeleton width={70} height={20} rounded={6} />
          </View>
          <View className="flex-row items-center gap-2">
            <Skeleton width={44} height={44} rounded={22} />
          </View>
        </View>

        <View className="mt-6 flex-row items-center gap-4 px-5">
          <Skeleton width={80} height={80} rounded={24} />
          <View className="flex-1 gap-2">
            <Skeleton width="40%" height={10} rounded={6} />
            <Skeleton width="70%" height={24} rounded={6} />
            <Skeleton width="35%" height={12} rounded={6} />
          </View>
        </View>

        <View className="mt-5 flex-row gap-2 px-5">
          <Skeleton width="48%" height={40} rounded={16} />
          <Skeleton width="48%" height={40} rounded={16} />
        </View>
        <View className="mt-3 flex-row gap-2 px-5">
          <Skeleton width="48%" height={44} rounded={16} />
          <Skeleton width="48%" height={44} rounded={16} />
        </View>
      </View>

      {/* Stats */}
      <View className="-mt-6 flex-row gap-3 px-5">
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            className={`flex-1 rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
          >
            <Skeleton width={40} height={28} rounded={6} />
            <Skeleton
              width="70%"
              height={10}
              rounded={6}
              style={{ marginTop: 8 }}
            />
          </View>
        ))}
      </View>

      {/* Health overview */}
      <View
        className={`mx-5 mt-6 rounded-3xl border p-5 ${cardBorder} ${cardBg}`}
      >
        <View className="mb-4 flex-row items-center gap-2">
          <Skeleton width={16} height={16} rounded={4} />
          <Skeleton width={120} height={14} rounded={6} />
        </View>
        <View className="flex-row flex-wrap">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="mb-4 w-1/2">
              <Skeleton width="50%" height={10} rounded={6} />
              <Skeleton
                width="80%"
                height={14}
                rounded={6}
                style={{ marginTop: 8 }}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Check-up history */}
      <View className="mt-8 px-5">
        <View className="gap-2">
          <Skeleton width={80} height={10} rounded={6} />
          <Skeleton width={140} height={24} rounded={6} />
        </View>
        <View className="mt-4 gap-3">
          {[0, 1].map((i) => (
            <View
              key={i}
              className={`overflow-hidden rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
            >
              <View className="flex-row items-start gap-3">
                <Skeleton width={48} height={48} rounded={12} />
                <View className="flex-1 gap-2">
                  <Skeleton width="40%" height={10} rounded={6} />
                  <Skeleton width="70%" height={14} rounded={6} />
                </View>
                <Skeleton width={60} height={22} rounded={11} />
              </View>
              <Skeleton
                width="100%"
                height={12}
                rounded={6}
                style={{ marginTop: 12 }}
              />
              <Skeleton
                width="80%"
                height={12}
                rounded={6}
                style={{ marginTop: 6 }}
              />
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   SEARCH SKELETON
   ═══════════════════════════════════════════════════════ */
export function SearchSkeleton() {
  const { isDark } = useTheme();
  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";

  return (
    <View className={`flex-1 ${bg}`}>
      {/* Hero header */}
      <View className="rounded-b-[40px] bg-purple-800 pb-8 pt-14">
        <View className="flex-row items-center justify-between px-5">
          <Skeleton width={44} height={44} rounded={22} />
          <View className="flex-row items-center gap-2">
            <Skeleton width={24} height={24} rounded={6} />
            <Skeleton width={70} height={20} rounded={6} />
          </View>
          <View className="flex-row items-center gap-2">
            <Skeleton width={44} height={44} rounded={22} />
          </View>
        </View>

        <View className="mt-6 px-5">
          <Skeleton width="100%" height={48} rounded={16} />
        </View>
      </View>

      {/* Results skeleton */}
      <View className="px-5 pt-6">
        {/* Patients header */}
        <View className="mb-3 flex-row items-center gap-2">
          <Skeleton width={70} height={12} rounded={6} />
          <Skeleton width={28} height={20} rounded={10} />
        </View>

        {/* Patient rows */}
        <View className="gap-3">
          {[0, 1].map((i) => (
            <View
              key={i}
              className={`flex-row items-center gap-3 rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
            >
              <Skeleton width={44} height={44} rounded={22} />
              <View className="flex-1 gap-2">
                <Skeleton width="55%" height={14} rounded={6} />
                <Skeleton width="75%" height={12} rounded={6} />
              </View>
            </View>
          ))}
        </View>

        {/* Sessions header */}
        <View className="mb-3 mt-6 flex-row items-center gap-2">
          <Skeleton width={70} height={12} rounded={6} />
          <Skeleton width={28} height={20} rounded={10} />
        </View>

        {/* Session cards */}
        <View className="gap-3">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className={`overflow-hidden rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
            >
              <View className="flex-row items-start gap-3">
                <Skeleton width={48} height={48} rounded={12} />
                <View className="flex-1 gap-2">
                  <Skeleton width="65%" height={14} rounded={6} />
                  <Skeleton width="45%" height={12} rounded={6} />
                </View>
                <Skeleton width={60} height={22} rounded={11} />
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   NOTES SKELETON
   ═══════════════════════════════════════════════════════ */
export function NotesSkeleton() {
  const { isDark } = useTheme();
  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";

  return (
    <View className={`flex-1 ${bg}`}>
      {/* Hero header */}
      <View className="rounded-b-[40px] bg-purple-800 pb-8 pt-14">
        <View className="flex-row items-center justify-between px-5">
          <Skeleton width={44} height={44} rounded={22} />
          <View className="flex-row items-center gap-2">
            <Skeleton width={24} height={24} rounded={6} />
            <Skeleton width={70} height={20} rounded={6} />
          </View>
          <View className="flex-row items-center gap-2">
            <Skeleton width={44} height={44} rounded={22} />
            <Skeleton width={44} height={44} rounded={22} />
          </View>
        </View>

        <View className="mt-6 flex-row gap-2 px-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} width={78} height={38} rounded={19} />
          ))}
        </View>
      </View>

      {/* Feed */}
      <View className="mt-6 px-5">
        {[0, 1].map((group) => (
          <View key={group} className="mb-6">
            <Skeleton
              width={100}
              height={12}
              rounded={6}
              style={{ marginBottom: 12 }}
            />
            <View className="gap-3">
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  className={`flex-row items-center gap-3 rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
                >
                  <Skeleton width={56} height={56} rounded={14} />
                  <View className="flex-1 gap-2">
                    <Skeleton width="55%" height={14} rounded={6} />
                    <Skeleton width="75%" height={12} rounded={6} />
                  </View>
                  <Skeleton width={60} height={22} rounded={11} />
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}