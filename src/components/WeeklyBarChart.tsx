import { useMemo } from "react";
import { Text, View } from "react-native";
import Svg, { Rect } from "react-native-svg";
import {
  format,
  subDays,
  startOfDay,
  isSameDay,
  parseISO,
} from "date-fns";
import { useTheme } from "../context/ThemeContext";
import type { Session } from "../types";

interface Props {
  sessions: Session[];
}

const CHART_HEIGHT = 120;
const BAR_WIDTH = 28;
const GAP = 12;

export default function WeeklyBarChart({ sessions }: Props) {
  const { isDark } = useTheme();

  // Build a 7-day window ending today
  const days = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: 7 }, (_, i) => subDays(today, 6 - i));
  }, []);

  // Count sessions per day
  const counts = useMemo(() => {
    return days.map((day) => {
      return sessions.filter((s) => {
        try {
          const date = parseISO(s.session_date);
          return isSameDay(date, day);
        } catch {
          return false;
        }
      }).length;
    });
  }, [sessions, days]);

  const maxCount = Math.max(...counts, 1);
  const total = counts.reduce((a, b) => a + b, 0);
  const todayIndex = days.length - 1;

  // Compute week-over-week change (previous 7 days vs these 7 days)
  const previousWeekCount = useMemo(() => {
    const start = subDays(startOfDay(new Date()), 13);
    const end = subDays(startOfDay(new Date()), 6);
    return sessions.filter((s) => {
      try {
        const date = parseISO(s.session_date);
        return date >= start && date < end;
      } catch {
        return false;
      }
    }).length;
  }, [sessions]);

  const change =
    previousWeekCount > 0
      ? Math.round(((total - previousWeekCount) / previousWeekCount) * 100)
      : null;

  const cardBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const cardBorder = isDark ? "border-purple-900/40" : "border-purple-100";
  const headingText = isDark ? "text-white" : "text-slate-950";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";
  const barColor = isDark ? "#4c1d95" : "#d8b4fe";
  const todayBarColor = "#7c3aed";
  const changeBg = isDark ? "bg-purple-950" : "bg-purple-100";
  const changeText = isDark ? "text-purple-200" : "text-purple-800";

  // Total width needed for the SVG
  const svgWidth = days.length * BAR_WIDTH + (days.length - 1) * GAP;

  return (
    <View
      className={`mt-6 rounded-3xl border p-5 ${cardBorder} ${cardBg}`}
      style={{
        shadowColor: "#7c3aed",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
      }}
    >
      {/* Header */}
      <View className="mb-5 flex-row items-start justify-between">
        <View>
          <Text className={`text-xl font-extrabold ${headingText}`}>
            This week
          </Text>
          <Text className={`mt-1 text-xs ${bodyText}`}>
            {total} appointment{total === 1 ? "" : "s"}
          </Text>
        </View>

        {change !== null && (
          <View className={`rounded-full px-3 py-1.5 ${changeBg}`}>
            <Text className={`text-[10px] font-bold ${changeText}`}>
              {change >= 0 ? "+" : ""}
              {change}% vs last week
            </Text>
          </View>
        )}
      </View>

      {/* Chart */}
      <View className="items-center">
        <Svg width={svgWidth} height={CHART_HEIGHT}>
          {counts.map((count, i) => {
            const barHeight =
              count === 0
                ? 4
                : Math.max(8, (count / maxCount) * (CHART_HEIGHT - 10));
            const x = i * (BAR_WIDTH + GAP);
            const y = CHART_HEIGHT - barHeight;
            const isToday = i === todayIndex;

            return (
              <Rect
                key={i}
                x={x}
                y={y}
                width={BAR_WIDTH}
                height={barHeight}
                rx={BAR_WIDTH / 2}
                ry={BAR_WIDTH / 2}
                fill={isToday ? todayBarColor : barColor}
                opacity={count === 0 ? 0.3 : 1}
              />
            );
          })}
        </Svg>

        {/* Day labels */}
        <View
          className="mt-2 flex-row"
          style={{ width: svgWidth, gap: GAP }}
        >
          {days.map((day, i) => {
            const isToday = i === todayIndex;
            return (
              <View
                key={i}
                style={{ width: BAR_WIDTH }}
                className="items-center"
              >
                <Text
                  className={`text-[10px] font-bold uppercase ${
                    isToday ? "text-purple-600" : bodyText
                  }`}
                >
                  {format(day, "EEEEE")}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}