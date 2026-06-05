import * as ImagePicker from "expo-image-picker";

export type PickedImage = {
  uri: string;
  fileName: string;
  mimeType: string;
};

export async function ensureMediaLibraryPermission(): Promise<boolean> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return permission.granted;
}

export async function pickSquareImage(): Promise<PickedImage | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect: [1, 1],
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8
  });
  if (result.canceled || result.assets.length === 0) return null;
  const asset = result.assets[0];
  const mimeType = asset.mimeType ?? "image/jpeg";
  return {
    uri: asset.uri,
    fileName: asset.fileName ?? deriveFileName(asset.uri, mimeType),
    mimeType
  };
}

function deriveFileName(uri: string, mimeType: string): string {
  const segment = uri.split("/").pop() ?? "avatar";
  if (segment.includes(".")) return segment;
  const ext = mimeType.startsWith("image/") ? mimeType.split("/")[1] : "jpg";
  return `${segment}.${ext}`;
}
