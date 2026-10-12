import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "./supabase";
import * as FileSystem from "expo-file-system/legacy";
/**
 * Opens the image picker and returns the local URI, or null if cancelled.
 * Automatically requests permissions on first use.
 */
export async function pickAvatarImage(): Promise<string | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(
      "We need access to your photos to upload a profile picture.",
    );
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9,
  });

  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
}

export async function uploadAvatar(
  userId: string,
  localUri: string,
): Promise<string> {
  // 1. Resize to 512×512 and compress
  const manipulated = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: 512, height: 512 } }],
    {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  );

  // 2. Read the file as Base64 (this is the reliable way in RN)
  const base64 = await FileSystem.readAsStringAsync(manipulated.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  // 3. Convert Base64 → Uint8Array
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // 4. Upload the bytes
  const path = `${userId}/avatar-${Date.now()}.jpg`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, bytes, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (error) throw error;

  // 5. Get public URL
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Removes the user's old avatar files from storage.
 * (Optional cleanup — leaves the current one in place.)
 */
export async function deleteOldAvatars(
  userId: string,
  keepUrl: string,
): Promise<void> {
  try {
    const { data } = await supabase.storage.from("avatars").list(userId);
    if (!data) return;

    const keepPath = keepUrl.split("?")[0];
    const toDelete = data
      .filter((f) => !keepPath.endsWith(f.name))
      .map((f) => `${userId}/${f.name}`);

    if (toDelete.length > 0) {
      await supabase.storage.from("avatars").remove(toDelete);
    }
  } catch {
    // Silent — cleanup failure shouldn't break the upload flow
  }
}