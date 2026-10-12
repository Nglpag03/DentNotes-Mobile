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

interface Row {
  id: string;
  file_path: string;
  kind: "xray" | "photo" | "document";
  url?: string;
}

interface Props {
  patientId: string;
  sessionId?: string;
  allSessions?: boolean;
  readOnly?: boolean;
}

export default function PhotoGallery({ 
  patientId, sessionId,
  allSessions = false,
  readOnly = false, 
  }: Props) {

  const { session } = useAuth();
  const { isDark } = useTheme();

  const [images, setImages] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);

  const rowBg = isDark ? "bg-[#252033]" : "bg-purple-50";
  const borderCol = isDark ? "border-purple-900/40" : "border-purple-100";
  const textCol = isDark ? "text-white" : "text-slate-900";
  const subTextCol = isDark ? "text-slate-400" : "text-slate-500";
  const emptyBg = isDark ? "bg-[#1a1525]" : "bg-white";

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
  setLoading(false);
  }, [sessionId, patientId, allSessions]);

  useEffect(() => {
    load();
  }, [load]);

  async function pickAndUpload(kind: "xray" | "photo") {
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

      // Resize + compress
      const manipulated = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: 1600 } }],
        {
          compress: 0.85,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      // Read as base64 (reliable on RN)
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
        session_id: sessionId,
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
    Alert.alert("Add photo", "What kind of image is this?", [
      {
        text: "X-ray",
        onPress: () => pickAndUpload("xray"),
      },
      {
        text: "Photo",
        onPress: () => pickAndUpload("photo"),
      },
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

    await supabase.storage.from("xrays").remove([row.file_path]);
    await supabase.from("images").delete().eq("id", row.id);
    load();
  }

  if (loading) {
    return (
      <View className="py-6 items-center">
        <ActivityIndicator size="small" color="#7c3aed" />
      </View>
    );
  }

  return (
    <View>
      {/* Header */}
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Feather name="image" size={14} color="#7c3aed" />
          <Text
            className={`text-[10px] font-bold uppercase tracking-widest ${subTextCol}`}
          >
            Photos {images.length > 0 ? `· ${images.length}` : ""}
          </Text>
        </View>
      {!readOnly && (
        <Pressable
          onPress={showAddMenu}
          disabled={uploading}
          className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${rowBg}`}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#7c3aed" />
          ) : (
            <Feather name="plus" size={12} color="#7c3aed" />
          )}
          <Text className="text-[10px] font-bold text-purple-700">
            {uploading ? "Uploading" : "Add"}
          </Text>
        </Pressable>
      )}
      </View>

      {/* Gallery */}
      {images.length === 0 ? (
        <View
          className={`items-center rounded-2xl border border-dashed py-8 ${borderCol} ${emptyBg}`}
        >
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-purple-50">
            <Feather name="camera" size={20} color="#7c3aed" />
          </View>
          <Text className={`mt-3 text-sm font-bold ${textCol}`}>
            No photos yet
          </Text>
          <Text className={`mt-1 text-center text-xs ${subTextCol}`}>
            {readOnly
              ? "No photos on record yet"
              : "Attach X-rays or intraoral photos"}
          </Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {images.map((img, i) => (
            <Pressable
              key={img.id}
              onPress={() => setViewerIndex(i)}
              onLongPress={readOnly ? undefined : () => removeImage(img)}
              className={`overflow-hidden rounded-xl border ${borderCol}`}
              style={{ width: 100, height: 100 }}
            >
              {img.url ? (
                <Image
                  source={{ uri: img.url }}
                  style={{ width: 100, height: 100 }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  className={`h-full w-full items-center justify-center ${rowBg}`}
                >
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
          ))}
        </ScrollView>
      )}

      <Text className={`mt-2 text-[10px] ${subTextCol}`}>
        Tap to view · Long-press to delete
      </Text>

      {/* Fullscreen viewer */}
      {viewerIndex !== null && (
        <ImageViewer
          photos={images
            .filter((i) => i.url)
            .map((i) => ({
              id: i.id,
              url: i.url!,
              kind: i.kind,
            }))}
          initialIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </View>
  );
}