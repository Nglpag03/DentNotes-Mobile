import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../context/ThemeContext";

interface Photo {
  id: string;
  url: string;
  kind: "xray" | "photo" | "document";
}

interface Props {
  photos: Photo[];
  initialIndex: number;
  onClose: () => void;
  /** Optional: caller handles the actual deletion. If omitted, no delete button. */
  onDelete?: (photo: Photo) => void;
  /** Optional: caller handles the actual share. If omitted, no share button. */
  onShare?: (photo: Photo) => void;
}

const ZOOM_SCALE = 2.5;

const KIND_LABEL: Record<Photo["kind"], string> = {
  xray: "X-ray",
  photo: "Photo",
  document: "Document",
};

export default function ImageViewer({
  photos,
  initialIndex,
  onClose,
  onDelete,
  onShare,
}: Props) {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();

  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const [loadingIds, setLoadingIds] = useState<Set<string>>(
    () => new Set([photos[initialIndex]?.id].filter(Boolean) as string[]),
  );
  const [erroredIds, setErroredIds] = useState<Set<string>>(() => new Set());

  const scrollRef = useRef<ScrollView>(null);
  const zoomRefs = useRef<Record<string, ScrollView | null>>({});

  const current = photos[index];

  const onScrollEnd = useCallback(
    (e: any) => {
      const x = e.nativeEvent.contentOffset.x;
      const next = Math.round(x / SCREEN_WIDTH);
      if (next !== index && next >= 0 && next < photos.length) {
        setIndex(next);
        setZoomed(false);
        // Reset any zoom on the previous image.
        const prev = photos[index];
        if (prev) {
          zoomRefs.current[prev.id]?.scrollTo({ x: 0, y: 0, animated: false });
        }
      }
    },
    [index, photos, SCREEN_WIDTH],
  );

  // Tap once: nothing (we don't want to accidentally toggle chrome).
  // Double-tap: toggle zoom on the current image.
  const lastTapRef = useRef<{ id: string; at: number } | null>(null);
  const onImagePress = useCallback(
    (p: Photo) => {
      const now = Date.now();
      const last = lastTapRef.current;
      if (last && last.id === p.id && now - last.at < 300) {
        // Double tap
        lastTapRef.current = null;
        const ref = zoomRefs.current[p.id];
        if (!ref) return;
        if (zoomed) {
          ref.scrollTo({ x: 0, y: 0, animated: true });
          setZoomed(false);
        } else {
          // Zoom to the center-ish of the image.
          const cx = SCREEN_WIDTH * (ZOOM_SCALE - 1) / 2;
          const cy = SCREEN_HEIGHT * (ZOOM_SCALE - 1) / 2;
          ref.scrollTo({ x: cx, y: cy, animated: true });
          setZoomed(true);
        }
      } else {
        lastTapRef.current = { id: p.id, at: now };
      }
    },
    [zoomed, SCREEN_WIDTH, SCREEN_HEIGHT],
  );

  // Virtualization: only render the current image and its neighbors.
  // Prevents 20 X-rays from loading at once.
  const windowedPhotos = useMemo(() => {
    return photos.filter((_, i) => Math.abs(i - index) <= 1);
  }, [photos, index]);

  const onLoadStart = (id: string) => {
    setLoadingIds((s) => new Set(s).add(id));
  };
  const onLoadEnd = (id: string) => {
    setLoadingIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
  };
  const onError = (id: string) => {
    setErroredIds((s) => new Set(s).add(id));
    setLoadingIds((s) => {
      const n = new Set(s);
      n.delete(id);
      return n;
    });
  };

  return (
    <Modal visible transparent={false} animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        <StatusBar style="light" />

        {/* ───── Top control bar ───── */}
        <View
          className="absolute inset-x-0 top-0 z-10 flex-row items-center justify-between px-4"
          style={{ paddingTop: insets.top + 8 }}
        >
          <View className="rounded-full bg-black/60 px-3 py-1.5">
            <Text className="text-xs font-bold text-white">
              {index + 1} / {photos.length}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            {onShare && current ? (
              <Pressable
                onPress={() => onShare(current)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Share image"
                className="h-10 w-10 items-center justify-center rounded-full bg-black/60 active:opacity-70"
              >
                <Feather name="share-2" size={18} color="#ffffff" />
              </Pressable>
            ) : null}

            {onDelete && current ? (
              <Pressable
                onPress={() => onDelete(current)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Delete image"
                className="h-10 w-10 items-center justify-center rounded-full bg-black/60 active:opacity-70"
              >
                <Feather name="trash-2" size={18} color="#ffffff" />
              </Pressable>
            ) : null}

            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Close viewer"
              className="h-10 w-10 items-center justify-center rounded-full bg-black/60 active:opacity-70"
            >
              <Feather name="x" size={20} color="#ffffff" />
            </Pressable>
          </View>
        </View>

        {/* ───── Swipe gallery ───── */}
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onScrollEnd}
          contentOffset={{ x: initialIndex * SCREEN_WIDTH, y: 0 }}
        >
          {photos.map((p, i) => {
            const inWindow = windowedPhotos.some((w) => w.id === p.id);
            const isLoading = loadingIds.has(p.id);
            const hasError = erroredIds.has(p.id);

            return (
              <View
                key={p.id}
                style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                className="items-center justify-center"
              >
                {inWindow ? (
                  <Pressable
                    onPress={() => onImagePress(p)}
                    accessibilityRole="image"
                    accessibilityLabel={`${KIND_LABEL[p.kind]}, ${i + 1} of ${photos.length}`}
                    style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                  >
                    <ScrollView
                      ref={(r) => {
                        zoomRefs.current[p.id] = r;
                      }}
                      // iOS honors these props; on Android they're mostly
                      // ignored, so double-tap is the primary zoom there.
                      maximumZoomScale={ZOOM_SCALE}
                      minimumZoomScale={1}
                      bouncesZoom
                      centerContent
                      showsVerticalScrollIndicator={false}
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{
                        width: SCREEN_WIDTH,
                        height: SCREEN_HEIGHT,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                      scrollEnabled={zoomed}
                    >
                      <Image
                        source={{ uri: p.url }}
                        style={{
                          width: SCREEN_WIDTH,
                          height: SCREEN_HEIGHT,
                        }}
                        resizeMode="contain"
                        onLoadStart={() => onLoadStart(p.id)}
                        onLoadEnd={() => onLoadEnd(p.id)}
                        onError={() => onError(p.id)}
                        accessibilityIgnoresInvertColors
                      />
                    </ScrollView>

                    {/* Loading spinner */}
                    {isLoading && !hasError ? (
                      <View
                        pointerEvents="none"
                        className="absolute items-center justify-center"
                        style={{
                          width: SCREEN_WIDTH,
                          height: SCREEN_HEIGHT,
                        }}
                      >
                        <ActivityIndicator size="large" color="#ffffff" />
                      </View>
                    ) : null}

                    {/* Error state */}
                    {hasError ? (
                      <View
                        pointerEvents="none"
                        className="absolute items-center justify-center gap-3 px-8"
                        style={{
                          width: SCREEN_WIDTH,
                          height: SCREEN_HEIGHT,
                        }}
                      >
                        <Feather name="image" size={40} color="#64748b" />
                        <Text className="text-center text-sm text-slate-400">
                          This image couldn't be loaded.
                        </Text>
                      </View>
                    ) : null}
                  </Pressable>
                ) : (
                  // Placeholder for far-away images so paging stays smooth.
                  <View
                    style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                  />
                )}
              </View>
            );
          })}
        </ScrollView>

        {/* ───── Bottom: kind pill + filmstrip ───── */}
        <View
          className="absolute inset-x-0 bottom-0 items-center gap-3"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          {/* Kind pill */}
          {current ? (
            <View className="rounded-full bg-black/60 px-4 py-2">
              <Text className="text-xs font-bold uppercase tracking-widest text-white">
                {KIND_LABEL[current.kind]}
              </Text>
            </View>
          ) : null}

          {/* Filmstrip (only when there are multiple photos) */}
          {photos.length > 1 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 16 }}
            >
              {photos.map((p, i) => {
                const active = i === index;
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      scrollRef.current?.scrollTo({
                        x: i * SCREEN_WIDTH,
                        animated: true,
                      });
                      setIndex(i);
                      setZoomed(false);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Go to image ${i + 1}`}
                    accessibilityState={{ selected: active }}
                    className={`overflow-hidden rounded-lg ${
                      active ? "opacity-100" : "opacity-50"
                    }`}
                    style={{
                      width: 48,
                      height: 48,
                      borderWidth: 2,
                      borderColor: active ? "#a78bfa" : "transparent",
                    }}
                  >
                    <Image
                      source={{ uri: p.url }}
                      style={{ width: 48, height: 48 }}
                      resizeMode="cover"
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}