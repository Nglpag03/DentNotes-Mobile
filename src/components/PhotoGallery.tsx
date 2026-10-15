// components/PhotoGallery.tsx
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import * as FileSystem from "expo-file-system/legacy";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";
import ImageViewer from "./ImageViewer";

type Kind = "xray" | "photo" | "document";

interface Row {
  id: string;
  file_path: string;
  kind: Kind;
  url?: string;
}

interface Props {
  patientId: string;
  sessionId?: string;
  allSessions?: boolean;
  /** Show add/delete affordances. Defaults to true. */
  canEdit?: boolean;
  /** "row" = horizontal scroller (compact). "grid" = wrapped grid. */
  layout?: "row" | "grid";
  /** Notifies parent of the current image count (for badges). */
  onCountChange?: (count: number) => void;
}

const KIND_LABEL: Record<Kind, string> = {
  xray: "X-ray",
  photo: "Photo",
  document: "Document",
};

export default function PhotoGallery({
  patientId,
  sessionId,
  allSessions = false,
  canEdit = true,
  layout = "row",
  onCountChange,
}: Props) {
  const { session } = useAuth();
  const { isDark } = useTheme();

  const [images, setImages] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [filter, setFilter] = useState<Kind | "all">("all");

  const rowBg = isDark ? "bg-[#252033]" : "bg-purple-50";
  const borderCol = isDark ? "border-purple-900/40" : "border-purple-100";
  const textCol = isDark ? "text-white" : "text-slate-900";
  const subTextCol = isDark ? "text-slate-400" : "text-slate-500";
  const emptyBg = isDark ? "bg-[#1a1525]" : "bg-white";
  const chipBg = isDark ? "bg-[#252033]" : "bg-purple-100";
  const chipText = isDark ? "text-purple-200" : "text-purple-800";

  const load = useCallback(async () => {
    setLoading(true);

    let query = supabase
      .from("images")
      .select("id, file_path, kind, session_id")
      .order("created_at", { ascending: false });

    if (allSessions) {
      query = query.eq("patient_id", patientId);
    } else if (sessionId) {
      query = query.eq("session_id", sessionId);
    }

    const { data, error } = await query;

    if (error) {
      setLoading(false);
      return;
    }

    const rows = (data as Row[]) ?? [];

    if (rows.length > 0) {
      const { data: signed } = await supabase.storage
        .from("xrays")
        .createSignedUrls(
          rows.map((r) => r.file_path),
          3600,
        );
      rows.forEach((r, i) => {
        r.url = signed?.[i]?.signedUrl ?? undefined;
      });
    }

    setImages(rows);
    onCountChange?.(rows.length);
    setLoading(false);
  }, [sessionId, patientId, allSessions, onCountChange]);

  useEffect(() => {
    load();
  }, [load]);

  async function pickAndUpload(kind: Kind) {
    if (kind === "document") {
      Alert.alert(
        "Not yet supported",
        "Document uploads are coming soon. For now, please upload X-rays or photos.",
      );
      return;
    }

    const permission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        "Permission needed",
        "We need access to your photos to attach them.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 0.9,
    });

    if (result.canceled || result.assets.length === 0) return;

    const localUri = result.assets[0].uri;
    setUploading(true);

    try {
      const userId = session?.user.id;
      if (!userId) throw new Error("Not signed in");

      const manipulated = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: 1600 } }],
        {
          compress: 0.85,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }

      const ext = "jpg";
      const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const path = `${userId}/${patientId}/${uniqueId}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from("xrays")
        .upload(path, bytes, {
          contentType: "image/jpeg",
          upsert: false,
        });

      if (upErr) throw upErr;

      const { error: insErr } = await supabase.from("images").insert({
        patient_id: patientId,
        session_id: sessionId ?? null,
        file_path: path,
        kind,
      });

      if (insErr) {
        await supabase.storage.from("xrays").remove([path]);
        throw insErr;
      }

      await load();
    } catch (err) {
      Alert.alert(
        "Upload failed",
        err instanceof Error ? err.message : "Unknown error",
      );
    } finally {
      setUploading(false);
    }
  }

  function showAddMenu() {
    Alert.alert("Add image", "What kind of image is this?", [
      { text: "X-ray", onPress: () => pickAndUpload("xray") },
      { text: "Photo", onPress: () => pickAndUpload("photo") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  async function removeImage(row: Row) {
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        "Delete image?",
        "This cannot be undone.",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
          {
            text: "Delete",
            style: "destructive",
            onPress: () => resolve(true),
          },
        ],
        { cancelable: true, onDismiss: () => resolve(false) },
      );
    });

    if (!confirmed) return;

    // Optimistic remove
    const before = images;
    setImages((list) => list.filter((x) => x.id !== row.id));
    onCountChange?.(before.length - 1);

    const { error: sErr } = await supabase.storage
      .from("xrays")
      .remove([row.file_path]);
    const { error: dErr } = await supabase
      .from("images")
      .delete()
      .eq("id", row.id);

    if (sErr || dErr) {
      setImages(before);
      onCountChange?.(before.length);
      Alert.alert(
        "Couldn't delete image",
        "Please check your connection and try again.",
      );
    }
  }

  const visible =
    filter === "all" ? images : images.filter((i) => i.kind === filter);

  const counts = images.reduce<Record<string, number>>((acc, i) => {
    acc[i.kind] = (acc[i.kind] ?? 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <View className="items-center py-6">
        <ActivityIndicator size="small" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View>
      {/* Toolbar: count + Add button */}
      <View className="mb-3 flex-row items-center justify-between">
        <Text
          className={`text-[10px] font-bold uppercase tracking-widest ${subTextCol}`}
        >
          {images.length === 0
            ? "No images"
            : `${images.length} image${images.length === 1 ? "" : "s"}`}
        </Text>

        {canEdit ? (
          <Pressable
            onPress={showAddMenu}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Add image"
            accessibilityState={{ disabled: uploading, busy: uploading }}
            className="flex-row items-center gap-1.5 rounded-full bg-purple-700 px-3 py-1.5 active:opacity-80"
          >
            {uploading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Feather name="plus" size={12} color="#ffffff" />
            )}
            <Text className="text-[10px] font-bold text-white">
              {uploading ? "Uploading…" : "Add"}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Filter chips (only when there's something to filter) */}
      {images.length > 4 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
          className="mb-3"
        >
          {(["all", "xray", "photo", "document"] as const).map((k) => {
            const active = filter === k;
            const label =
              k === "all" ? `All (${images.length})` : `${KIND_LABEL[k]} (${counts[k] ?? 0})`;
            return (
              <Pressable
                key={k}
                onPress={() => setFilter(k)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                className={`rounded-full px-3 py-1.5 active:opacity-80 ${
                  active ? "bg-purple-800" : chipBg
                }`}
              >
                <Text
                  className={`text-[10px] font-bold ${
                    active ? "text-white" : chipText
                  }`}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}

      {/* Empty state */}
      {images.length === 0 ? (
        <View
          className={`items-center rounded-2xl border border-dashed py-8 ${borderCol} ${emptyBg}`}
        >
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-purple-50">
            <Feather name="camera" size={20} color="#7c3aed" />
          </View>
          <Text className={`mt-3 text-sm font-bold ${textCol}`}>
            No images yet
          </Text>
          <Text className={`mt-1 text-center text-xs ${subTextCol}`}>
            {canEdit
              ? "Attach X-rays or intraoral photos to keep them with this patient."
              : "No images on record."}
          </Text>
          {canEdit ? (
            <Pressable
              onPress={showAddMenu}
              accessibilityRole="button"
              accessibilityLabel="Add first image"
              className="mt-4 rounded-full bg-purple-700 px-4 py-2 active:opacity-80"
            >
              <Text className="text-xs font-bold text-white">Add image</Text>
            </Pressable>
          ) : null}
        </View>
      ) : layout === "grid" ? (
        <View className="flex-row flex-wrap" style={{ gap: 8 }}>
          {visible.map((img) => (
            <Thumbnail
              key={img.id}
              img={img}
              size={null} // flex
              borderCol={borderCol}
              rowBg={rowBg}
              canEdit={canEdit}
              onPress={() => {
                const idx = images.findIndex((x) => x.id === img.id);
                if (idx >= 0) setViewerIndex(idx);
              }}
              onLongPress={
                canEdit ? () => removeImage(img) : undefined
              }
            />
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {visible.map((img) => (
            <Thumbnail
              key={img.id}
              img={img}
              size={100}
              borderCol={borderCol}
              rowBg={rowBg}
              canEdit={canEdit}
              onPress={() => {
                const idx = images.findIndex((x) => x.id === img.id);
                if (idx >= 0) setViewerIndex(idx);
              }}
              onLongPress={
                canEdit ? () => removeImage(img) : undefined
              }
            />
          ))}
        </ScrollView>
      )}

      {canEdit && images.length > 0 ? (
        <Text className={`mt-2 text-[10px] ${subTextCol}`}>
          Tap to view · Long-press to delete
        </Text>
      ) : null}

      {viewerIndex !== null ? (
        <ImageViewer
          photos={images
            .filter((i) => i.url)
            .map((i) => ({ id: i.id, url: i.url!, kind: i.kind }))}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      ) : null}
    </View>
  );
}

function Thumbnail({
  img,
  size,
  borderCol,
  rowBg,
  canEdit,
  onPress,
  onLongPress,
}: {
  img: Row;
  size: number | null;
  borderCol: string;
  rowBg: string;
  canEdit: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}) {
  const containerStyle =
    size === null
      ? { width: "31.5%" as const, aspectRatio: 1 as const }
      : { width: size, height: size };

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      accessibilityRole="imagebutton"
      accessibilityLabel={`${KIND_LABEL[img.kind]} thumbnail`}
      accessibilityHint={
        canEdit ? "Tap to view, long-press to delete" : "Tap to view"
      }
      className={`overflow-hidden rounded-xl border ${borderCol}`}
      style={containerStyle}
    >
      {img.url ? (
        <Image source={{ uri: img.url }} style={{ flex: 1 }} resizeMode="cover" />
      ) : (
        <View className={`h-full w-full items-center justify-center ${rowBg}`}>
          <Feather name="image" size={20} color="#94a3b8" />
        </View>
      )}
      <View
        className="absolute bottom-0 left-0 right-0 px-1.5 py-1"
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      >
        <Text className="text-[9px] font-bold uppercase tracking-wider text-white">
          {img.kind}
        </Text>
      </View>
    </Pressable>
  );
}