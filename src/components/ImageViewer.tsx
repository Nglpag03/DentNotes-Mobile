import { useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

interface Photo {
  id: string;
  url: string;
  kind: "xray" | "photo" | "document";
}

interface Props {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
}

export default function ImageViewer({ photos, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const scrollRef = useRef<ScrollView>(null);

  function onScrollEnd(e: any) {
    const x = e.nativeEvent.contentOffset.x;
    setIndex(Math.round(x / SCREEN_WIDTH));
  }

  const current = photos[index];

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        <StatusBar style="light" />

        {/* Top bar */}
        <View
          className="absolute inset-x-0 top-0 z-10 flex-row items-center justify-between px-5"
          style={{ paddingTop: 56 }}
        >
          <View className="rounded-full bg-white/15 px-3 py-1.5">
            <Text className="text-xs font-bold text-white">
              {index + 1} / {photos.length}
            </Text>
          </View>
          <Pressable
            onPress={onClose}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/15"
          >
            <Feather name="x" size={20} color="#ffffff" />
          </Pressable>
        </View>

        {/* Swipe gallery */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          contentOffset={{ x: initialIndex * SCREEN_WIDTH, y: 0 }}
        >
          {photos.map((p) => (
            <View
              key={p.id}
              style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
              className="items-center justify-center"
            >
              <Image
                source={{ uri: p.url }}
                style={{
                  width: SCREEN_WIDTH,
                  height: SCREEN_HEIGHT,
                }}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>

        {/* Bottom label */}
        <View
          className="absolute inset-x-0 bottom-0 items-center px-5"
          style={{ paddingBottom: 60 }}
        >
          <View className="rounded-full bg-white/15 px-4 py-2">
            <Text className="text-xs font-bold uppercase tracking-widest text-white">
              {current?.kind ?? "photo"}
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}