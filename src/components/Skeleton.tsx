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

export function DashboardSkeleton() {
  const { isDark } = useTheme();
  const bg = isDark ? "bg-[#0e0a1a]" : "bg-[#faf8fc]";
  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";

  return (
    <View className={`flex-1 ${bg}`}>
      {/* Hero skeleton */}
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
      </View>

      {/* Stat cards */}
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

      {/* Chart skeleton */}
      <View className={`mt-6 rounded-3xl border p-5 ${cardBorder} ${cardBg} mx-5`}>
        <Skeleton width="50%" height={22} rounded={6} />
        <Skeleton width="35%" height={12} rounded={6} style={{ marginTop: 8 }} />
        <View className="mt-6 flex-row items-end justify-between" style={{ height: 120 }}>
          {[60, 90, 70, 110, 80, 50, 40].map((h, i) => (
            <Skeleton key={i} width={28} height={h} rounded={14} />
          ))}
        </View>
      </View>

      {/* Schedule section */}
      <View className="mt-8 px-5">
        <Skeleton width="50%" height={22} rounded={6} />
        <View className="mt-4 gap-3">
          <View className={`flex-row items-center gap-3 rounded-2xl border p-4 ${cardBorder} ${cardBg}`}>
            <Skeleton width={64} height={48} rounded={12} />
            <View className="flex-1 gap-2">
              <Skeleton width="60%" height={14} rounded={6} />
              <Skeleton width="80%" height={12} rounded={6} />
            </View>
            <Skeleton width={80} height={28} rounded={14} />
          </View>
          <View className={`flex-row items-center gap-3 rounded-2xl border p-4 ${cardBorder} ${cardBg}`}>
            <Skeleton width={64} height={48} rounded={12} />
            <View className="flex-1 gap-2">
              <Skeleton width="60%" height={14} rounded={6} />
              <Skeleton width="80%" height={12} rounded={6} />
            </View>
            <Skeleton width={80} height={28} rounded={14} />
          </View>
        </View>
      </View>

      {/* Patients section */}
      <View className="mt-8 px-5">
        <Skeleton width="50%" height={22} rounded={6} />
        <View className={`mt-4 overflow-hidden rounded-2xl border ${cardBorder} ${cardBg}`}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className={`flex-row items-center gap-3 p-4 ${
                i < 2 ? (isDark ? "border-b border-slate-800" : "border-b border-slate-100") : ""
              }`}
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

      {/* Bottom padding to leave room for nav */}
      <View style={{ height: 140 }} />
    </View>
  );
}