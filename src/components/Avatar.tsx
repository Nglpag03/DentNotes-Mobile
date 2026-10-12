import { Image, Text, View } from "react-native";

interface Props {
  url?: string | null;
  initials: string;
  size?: number;
  /** Show a subtle white ring around the avatar */
  ring?: boolean;
  /** Background tint when showing initials */
  variant?: "light" | "dark" | "onPurple";
}

export default function Avatar({
  url,
  initials,
  size = 44,
  ring = false,
  variant = "light",
}: Props) {
  const ringStyle = ring
    ? { borderWidth: 2, borderColor: "rgba(255,255,255,0.4)" }
    : undefined;

  const bgClass =
    variant === "onPurple"
      ? "bg-white/20"
      : variant === "dark"
        ? "bg-purple-900/40"
        : "bg-purple-100";

  const textClass =
    variant === "onPurple"
      ? "text-white"
      : variant === "dark"
        ? "text-purple-200"
        : "text-purple-800";

  if (url) {
    return (
      <Image
        source={{ uri: url,cache: "reload", }}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          ...ringStyle,
        }}
      />
    );
  }

  return (
    <View
      className={`items-center justify-center rounded-full ${bgClass}`}
      style={{
        width: size,
        height: size,
        ...ringStyle,
      }}
    >
      <Text
        className={`font-extrabold ${textClass}`}
        style={{ fontSize: size * 0.32 }}
      >
        {initials}
      </Text>
    </View>
  );
}