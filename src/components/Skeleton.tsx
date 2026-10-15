import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  View,
  type DimensionValue,
  type ViewStyle,
} from "react-native";
import { useTheme } from "../context/ThemeContext";

/* ─────────────────────────────────────────────
   Pulse config
   ───────────────────────────────────────────── */
const PULSE_MIN = 0.4;
const PULSE_MAX = 0.75;
const PULSE_DURATION = 600; // half-cycle, in ms

/* ─────────────────────────────────────────────
   Skeleton primitive
   ───────────────────────────────────────────── */
interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  rounded?: number;
  style?: ViewStyle;
  /** 0–1 phase offset. Real stagger, not a tiny nudge. */
  delay?: number;
}

export function Skeleton({
  width = "100%",
  height = 16,
  rounded = 12,
  style,
  delay = 0,
}: SkeletonProps) {
  const { isDark } = useTheme();
  const [reduceMotion, setReduceMotion] = useState(false);

  // Seed the animated value at a phase-shifted point so each block
  // starts its breath at a slightly different brightness.
  const opacity = useRef(
    new Animated.Value(PULSE_MIN + (PULSE_MAX - PULSE_MIN) * (delay % 1)),
  ).current;

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(PULSE_MIN + (PULSE_MAX - PULSE_MIN) / 2);
      return;
    }

    const start = (opacity as any).__getValue?.() ?? PULSE_MIN;
    const goingUp = start < (PULSE_MIN + PULSE_MAX) / 2;

    const firstLeg = Animated.timing(opacity, {
      toValue: goingUp ? PULSE_MAX : PULSE_MIN,
      duration: PULSE_DURATION,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    });

    const loop = Animated.loop(
      Animated.sequence([
        firstLeg,
        Animated.timing(opacity, {
          toValue: goingUp ? PULSE_MIN : PULSE_MAX,
          duration: PULSE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: goingUp ? PULSE_MAX : PULSE_MIN,
          duration: PULSE_DURATION,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    loop.start();
    return () => loop.stop();
  }, [opacity, reduceMotion]);

  const bg = isDark ? "#2a2440" : "#e5e1ec";

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width,
          height,
          borderRadius: rounded,
          opacity,
          backgroundColor: bg,
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
          <Skeleton width={44} height={44} rounded={22} delay={0} />
          <View className="flex-row items-center gap-2">
            <Skeleton width={24} height={24} rounded={6} delay={0.1} />
            <Skeleton width={90} height={20} rounded={6} delay={0.15} />
          </View>
          <View className="flex-row items-center gap-2">
            <Skeleton width={44} height={44} rounded={22} delay={0.2} />
            <Skeleton width={44} height={44} rounded={22} delay={0.25} />
          </View>
        </View>
        <View className="mt-6 flex-row items-center gap-4 px-5">
          <Skeleton width={64} height={64} rounded={32} delay={0.1} />
          <View className="flex-1 gap-2">
            <Skeleton width="50%" height={14} rounded={6} delay={0.15} />
            <Skeleton width="80%" height={22} rounded={6} delay={0.2} />
            <Skeleton width="60%" height={12} rounded={6} delay={0.25} />
          </View>
        </View>
        <View className="mt-5 px-5">
          <Skeleton width="100%" height={44} rounded={16} delay={0.3} />
        </View>
      </View>

      <View className="-mt-6 flex-row gap-3 px-5">
        <View className={`flex-1 rounded-3xl border p-5 ${cardBorder} ${cardBg}`}>
          <Skeleton width={60} height={36} rounded={10} />
          <Skeleton
            width="70%"
            height={12}
            rounded={6}
            style={{ marginTop: 12 }}
            delay={0.1}
          />
          <Skeleton
            width="50%"
            height={10}
            rounded={6}
            style={{ marginTop: 8 }}
            delay={0.2}
          />
        </View>
        <View className={`flex-1 rounded-3xl border p-5 ${cardBorder} ${cardBg}`}>
          <Skeleton width={60} height={36} rounded={10} delay={0.1} />
          <Skeleton
            width="70%"
            height={12}
            rounded={6}
            style={{ marginTop: 12 }}
            delay={0.2}
          />
          <Skeleton
            width="50%"
            height={10}
            rounded={6}
            style={{ marginTop: 8 }}
            delay={0.3}
          />
        </View>
      </View>

      <View
        className={`mt-6 mx-5 rounded-3xl border p-5 ${cardBorder} ${cardBg}`}
      >
        <Skeleton width="50%" height={22} rounded={6} />
        <Skeleton
          width="35%"
          height={12}
          rounded={6}
          style={{ marginTop: 8 }}
          delay={0.1}
        />
        <View
          className="mt-6 flex-row items-end justify-between"
          style={{ height: 120 }}
        >
          {[60, 90, 70, 110, 80, 50, 40].map((h, i) => (
            <Skeleton
              key={i}
              width={28}
              height={h}
              rounded={6}
              delay={i * 0.1}
            />
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
              <Skeleton
                width={64}
                height={48}
                rounded={12}
                delay={i * 0.15}
              />
              <View className="flex-1 gap-2">
                <Skeleton
                  width="60%"
                  height={14}
                  rounded={6}
                  delay={i * 0.15 + 0.05}
                />
                <Skeleton
                  width="80%"
                  height={12}
                  rounded={6}
                  delay={i * 0.15 + 0.1}
                />
              </View>
              <Skeleton
                width={80}
                height={28}
                rounded={14}
                delay={i * 0.15 + 0.12}
              />
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
      <View className="rounded-b-[40px] bg-purple-800 pb-8 pt-14">
        <View className="flex-row items-center justify-between px-5">
          <Skeleton width={44} height={44} rounded={22} />
          <View className="flex-row items-center gap-2">
            <Skeleton width={24} height={24} rounded={6} delay={0.1} />
            <Skeleton width={70} height={20} rounded={6} delay={0.15} />
          </View>
          <View className="flex-row items-center gap-2">
            <Skeleton width={44} height={44} rounded={22} delay={0.2} />
            <Skeleton width={44} height={44} rounded={22} delay={0.25} />
          </View>
        </View>

        <View className="mt-6 flex-row items-center gap-4 px-5">
          <View className="flex-1 gap-2">
            <Skeleton width="30%" height={12} rounded={6} />
            <Skeleton width="60%" height={24} rounded={6} delay={0.1} />
            <Skeleton width="40%" height={12} rounded={6} delay={0.2} />
          </View>
          <Skeleton width={80} height={40} rounded={16} delay={0.15} />
        </View>
      </View>

      <View className="px-5 pt-4">
        <Skeleton width="100%" height={48} rounded={16} />

        <View className="mt-4 gap-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              className={`flex-row items-center gap-3 rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
            >
              <Skeleton
                width={48}
                height={48}
                rounded={24}
                delay={i * 0.12}
              />
              <View className="flex-1 gap-2">
                <Skeleton
                  width="55%"
                  height={14}
                  rounded={6}
                  delay={i * 0.12 + 0.05}
                />
                <Skeleton
                  width="75%"
                  height={12}
                  rounded={6}
                  delay={i * 0.12 + 0.1}
                />
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
      <View className="rounded-b-[40px] bg-purple-800 pb-8 pt-14">
        <View className="flex-row items-center justify-between px-5">
          <Skeleton width={44} height={44} rounded={22} />
          <View className="flex-row items-center gap-2">
            <Skeleton width={24} height={24} rounded={6} delay={0.1} />
            <Skeleton width={80} height={20} rounded={6} delay={0.15} />
          </View>
          <View className="flex-row items-center gap-2">
            <Skeleton width={44} height={44} rounded={22} delay={0.2} />
            <Skeleton width={44} height={44} rounded={22} delay={0.25} />
          </View>
        </View>

        <View className="mt-6 flex-row gap-3 px-5">
          {[0, 1, 2].map((i) => (
            <View key={i} className="flex-1 rounded-2xl bg-white/10 p-3.5">
              <Skeleton
                width={40}
                height={28}
                rounded={6}
                delay={i * 0.1}
              />
              <Skeleton
                width="70%"
                height={10}
                rounded={6}
                style={{ marginTop: 8 }}
                delay={i * 0.1 + 0.05}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Week strip — matches ScheduleScreen's mt-8 (no overlap) */}
      <View style={{ marginTop: 8 }}>
        <View className="flex-row gap-2 px-5 pt-1 pb-1">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton
              key={i}
              width={64}
              height={96}
              rounded={16}
              delay={i * 0.12}
            />
          ))}
        </View>
      </View>

      <View className="mt-6 flex-row items-end justify-between px-5">
        <View className="gap-2">
          <Skeleton width={60} height={12} rounded={6} />
          <Skeleton width={120} height={24} rounded={6} delay={0.1} />
        </View>
        <Skeleton width={90} height={28} rounded={14} delay={0.15} />
      </View>

      <View className="mt-5 gap-3 px-5">
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            className={`flex-row items-center gap-4 rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
          >
            <Skeleton
              width={64}
              height={48}
              rounded={12}
              delay={i * 0.12}
            />
            <Skeleton
              width={4}
              height={40}
              rounded={2}
              delay={i * 0.12 + 0.02}
            />
            <View className="flex-1 gap-2">
              <Skeleton
                width="60%"
                height={14}
                rounded={6}
                delay={i * 0.12 + 0.04}
              />
              <Skeleton
                width="80%"
                height={12}
                rounded={6}
                delay={i * 0.12 + 0.06}
              />
            </View>
            <Skeleton
              width={70}
              height={28}
              rounded={14}
              delay={i * 0.12 + 0.08}
            />
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
      <View className="rounded-b-[40px] bg-purple-800 pb-8 pt-14">
        <View className="flex-row items-center justify-between px-5">
          <Skeleton width={44} height={44} rounded={22} />
          <View className="flex-row items-center gap-2">
            <Skeleton width={24} height={24} rounded={6} delay={0.1} />
            <Skeleton width={70} height={20} rounded={6} delay={0.15} />
          </View>
          <View className="flex-row items-center gap-2">
            <Skeleton width={44} height={44} rounded={22} delay={0.2} />
          </View>
        </View>

        <View className="mt-6 flex-row items-center gap-4 px-5">
          <Skeleton width={80} height={80} rounded={24} />
          <View className="flex-1 gap-2">
            <Skeleton width="40%" height={10} rounded={6} delay={0.1} />
            <Skeleton width="70%" height={24} rounded={6} delay={0.15} />
            <Skeleton width="35%" height={12} rounded={6} delay={0.2} />
          </View>
        </View>

        <View className="mt-5 flex-row gap-2 px-5">
          <Skeleton width="48%" height={40} rounded={16} />
          <Skeleton width="48%" height={40} rounded={16} delay={0.1} />
        </View>
        <View className="mt-3 flex-row gap-2 px-5">
          <Skeleton width="48%" height={44} rounded={16} />
          <Skeleton width="48%" height={44} rounded={16} delay={0.1} />
        </View>
      </View>

      {/* Matches PatientDetailScreen's -mt-8 stats offset */}
      <View className="-mt-8 flex-row gap-3 px-5">
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            className={`flex-1 rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
          >
            <Skeleton
              width={40}
              height={28}
              rounded={6}
              delay={i * 0.12}
            />
            <Skeleton
              width="70%"
              height={10}
              rounded={6}
              style={{ marginTop: 8 }}
              delay={i * 0.12 + 0.05}
            />
          </View>
        ))}
      </View>

      <View
        className={`mx-5 mt-6 rounded-3xl border p-5 ${cardBorder} ${cardBg}`}
      >
        <View className="mb-4 flex-row items-center gap-2">
          <Skeleton width={16} height={16} rounded={4} />
          <Skeleton width={120} height={14} rounded={6} delay={0.1} />
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
                delay={i * 0.12}
              />
            </View>
          ))}
        </View>
      </View>

      <View className="mt-8 px-5">
        <View className="gap-2">
          <Skeleton width={80} height={10} rounded={6} />
          <Skeleton width={140} height={24} rounded={6} delay={0.1} />
        </View>
        <View className="mt-4 gap-3">
          {[0, 1].map((i) => (
            <View
              key={i}
              className={`overflow-hidden rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
            >
              <View className="flex-row items-start gap-3">
                <Skeleton
                  width={48}
                  height={48}
                  rounded={12}
                  delay={i * 0.15}
                />
                <View className="flex-1 gap-2">
                  <Skeleton width="40%" height={10} rounded={6} />
                  <Skeleton
                    width="70%"
                    height={14}
                    rounded={6}
                    delay={i * 0.15 + 0.05}
                  />
                </View>
                <Skeleton
                  width={60}
                  height={22}
                  rounded={11}
                  delay={i * 0.15 + 0.1}
                />
              </View>
              <Skeleton
                width="100%"
                height={12}
                rounded={6}
                style={{ marginTop: 12 }}
                delay={i * 0.15 + 0.12}
              />
              <Skeleton
                width="80%"
                height={12}
                rounded={6}
                style={{ marginTop: 6 }}
                delay={i * 0.15 + 0.15}
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
      <View className="rounded-b-[40px] bg-purple-800 pb-8 pt-14">
        <View className="flex-row items-center justify-between px-5">
          <Skeleton width={44} height={44} rounded={22} />
          <View className="flex-row items-center gap-2">
            <Skeleton width={24} height={24} rounded={6} delay={0.1} />
            <Skeleton width={70} height={20} rounded={6} delay={0.15} />
          </View>
          <View className="flex-row items-center gap-2">
            <Skeleton width={44} height={44} rounded={22} delay={0.2} />
          </View>
        </View>

        <View className="mt-6 px-5">
          <Skeleton width="100%" height={48} rounded={16} />
        </View>
      </View>

      <View className="px-5 pt-6">
        <View className="mb-3 flex-row items-center gap-2">
          <Skeleton width={70} height={12} rounded={6} />
          <Skeleton width={28} height={20} rounded={10} delay={0.1} />
        </View>

        <View className="gap-3">
          {[0, 1].map((i) => (
            <View
              key={i}
              className={`flex-row items-center gap-3 rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
            >
              <Skeleton
                width={48}
                height={48}
                rounded={24}
                delay={i * 0.15}
              />
              <View className="flex-1 gap-2">
                <Skeleton
                  width="55%"
                  height={14}
                  rounded={6}
                  delay={i * 0.15 + 0.05}
                />
                <Skeleton
                  width="75%"
                  height={12}
                  rounded={6}
                  delay={i * 0.15 + 0.1}
                />
              </View>
            </View>
          ))}
        </View>

        <View className="mb-3 mt-6 flex-row items-center gap-2">
          <Skeleton width={70} height={12} rounded={6} />
          <Skeleton width={28} height={20} rounded={10} delay={0.1} />
        </View>

        <View className="gap-3">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className={`overflow-hidden rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
            >
              <View className="flex-row items-start gap-3">
                <Skeleton
                  width={48}
                  height={48}
                  rounded={12}
                  delay={i * 0.15}
                />
                <View className="flex-1 gap-2">
                  <Skeleton
                    width="65%"
                    height={14}
                    rounded={6}
                    delay={i * 0.15 + 0.05}
                  />
                  <Skeleton
                    width="45%"
                    height={12}
                    rounded={6}
                    delay={i * 0.15 + 0.1}
                  />
                </View>
                <Skeleton
                  width={60}
                  height={22}
                  rounded={11}
                  delay={i * 0.15 + 0.12}
                />
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
      <View className="rounded-b-[40px] bg-purple-800 pb-8 pt-14">
        <View className="flex-row items-center justify-between px-5">
          <Skeleton width={44} height={44} rounded={22} />
          <View className="flex-row items-center gap-2">
            <Skeleton width={24} height={24} rounded={6} delay={0.1} />
            <Skeleton width={70} height={20} rounded={6} delay={0.15} />
          </View>
          <View className="flex-row items-center gap-2">
            <Skeleton width={44} height={44} rounded={22} delay={0.2} />
            <Skeleton width={44} height={44} rounded={22} delay={0.25} />
          </View>
        </View>

        <View className="mt-6 flex-row gap-2 px-5">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              width={78}
              height={38}
              rounded={19}
              delay={i * 0.1}
            />
          ))}
        </View>
      </View>

      <View className="mt-6 px-5">
        {[0, 1].map((group) => (
          <View key={group} className="mb-6">
            <Skeleton
              width={100}
              height={12}
              rounded={6}
              style={{ marginBottom: 12 }}
              delay={group * 0.15}
            />
            <View className="gap-3">
              {[0, 1, 2].map((i) => (
                <View
                  key={i}
                  className={`flex-row items-center gap-3 rounded-2xl border p-4 ${cardBorder} ${cardBg}`}
                >
                  <Skeleton
                    width={56}
                    height={56}
                    rounded={14}
                    delay={i * 0.12}
                  />
                  <View className="flex-1 gap-2">
                    <Skeleton
                      width="55%"
                      height={14}
                      rounded={6}
                      delay={i * 0.12 + 0.05}
                    />
                    <Skeleton
                      width="75%"
                      height={12}
                      rounded={6}
                      delay={i * 0.12 + 0.1}
                    />
                  </View>
                  <Skeleton
                    width={60}
                    height={22}
                    rounded={11}
                    delay={i * 0.12 + 0.12}
                  />
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}