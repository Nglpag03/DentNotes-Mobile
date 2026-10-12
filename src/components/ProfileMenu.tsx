import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import Avatar from "./Avatar";

interface Props {
  size?: number;
  onOpenProfile?: () => void;
  onOpenAbout?: () => void;
  onOpenSettings?: () => void;
}

export default function ProfileMenu({ size = 44, onOpenProfile, onOpenAbout, onOpenSettings,}: Props) {
  const { session, signOut } = useAuth();
  const { isDark } = useTheme();
  const [open, setOpen] = useState(false);

  const firstName = session?.user.user_metadata?.first_name || "Doctor";
  const lastName = session?.user.user_metadata?.last_name || "";
  const email = session?.user.email ?? "";
  const initials =
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "DR";

  const menuBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const menuBorder = isDark ? "border-slate-800" : "border-slate-100";
  const headingText = isDark ? "text-white" : "text-slate-900";
  const bodyText = isDark ? "text-slate-400" : "text-slate-500";

  const avatarUrl = session?.user.user_metadata?.avatar_url ?? null;

  return (
    <>
      {/* Menu button */}
      <Pressable
        onPress={() => setOpen(true)}
        className="items-center justify-center rounded-full bg-white/10"
        style={{ height: size, width: size }}
      >
        <Feather name="menu" size={22} color="#ffffff" />
      </Pressable>

      {/* Dropdown overlay */}
      {open && (
        <>
          <Pressable
            onPress={() => setOpen(false)}
            className="absolute inset-0 z-40"
            style={{ left: -1000, right: -1000, top: -1000, bottom: -1000 }}
          />
          <View
            className={`absolute left-0 top-14 z-50 w-64 overflow-hidden rounded-2xl border ${menuBorder} ${menuBg}`}
            style={{
              shadowColor: "#4c1d95",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
              elevation: 12,
            }}
          >
            {/* Profile info */}
            <View
              className={`border-b px-4 py-3 ${menuBorder}`}
            >
              <Text
                className={`text-sm font-bold ${headingText}`}
                numberOfLines={1}
              >
                Dr. {firstName} {lastName}
              </Text>
              <Text
                className={`mt-0.5 text-[11px] ${bodyText}`}
                numberOfLines={1}
              >
                {email}
              </Text>
            </View>

            {/* Items */}
            <Pressable
              onPress={() => {
                setOpen(false);
                    setOpen(false);
                    onOpenProfile?.();
              }}
              className="flex-row items-center gap-3 px-4 py-3"
            >
              <Feather
                name="user"
                size={16}
                color={isDark ? "#c4b5fd" : "#7c3aed"}
              />
              <Text className={`text-sm font-semibold ${headingText}`}>
                My profile
              </Text>
            </Pressable>

            <Pressable
              onPress={() => {
                setOpen(false);
                onOpenSettings?.();
              }}
              className="flex-row items-center gap-3 px-4 py-3"
            >
              <Feather
                name="settings"
                size={16}
                color={isDark ? "#c4b5fd" : "#7c3aed"}
              />
              <Text className={`text-sm font-semibold ${headingText}`}>
                Settings
              </Text>
            </Pressable>

            <Pressable
            onPress={() => {
              setOpen(false);
              onOpenAbout?.();
            }}
            className="flex-row items-center gap-3 px-4 py-3"
          >
            <Feather
              name="info"
              size={16}
              color={isDark ? "#c4b5fd" : "#7c3aed"}
            />
            <Text className={`text-sm font-semibold ${headingText}`}>
              About DentNotes
            </Text>
          </Pressable>

            <View className={`border-t ${menuBorder}`}>
              <Pressable
                onPress={() => {
                  setOpen(false);
                  signOut();
                }}
                className="flex-row items-center gap-3 px-4 py-3.5"
              >
                <Feather name="log-out" size={16} color="#f87171" />
                <Text className="text-sm font-bold text-red-500">
                  Sign out
                </Text>
              </Pressable>
            </View>
          </View>
        </>
      )}
    </>
  );
}