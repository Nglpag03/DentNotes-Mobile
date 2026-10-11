import { Pressable, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

interface Props {
  onPress: () => void;
  placeholder?: string;
}

export default function SearchBar({
  onPress,
  placeholder = "Search patients or records",
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-full bg-white/15 px-4 py-3"
    >
      <Feather name="search" size={16} color="#ffffff" />
      <Text className="flex-1 text-sm text-purple-100">{placeholder}</Text>
      <View className="rounded-full bg-white/10 px-2 py-0.5">
        <Text className="text-[10px] font-bold text-purple-100">Search</Text>
      </View>
    </Pressable>
  );
}