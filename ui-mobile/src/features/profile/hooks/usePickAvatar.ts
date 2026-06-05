import { useCallback, useState } from "react";
import { useUploadAvatar } from "@/features/profile/hooks/useUploadAvatar";
import { ensureMediaLibraryPermission, pickSquareImage } from "@/shared/native/imagePicker";

type PickResult =
  | { status: "idle" }
  | { status: "permission-denied" }
  | { status: "cancelled" }
  | { status: "uploaded" }
  | { status: "error"; message: string };

export function usePickAvatar() {
  const uploadMutation = useUploadAvatar();
  const [result, setResult] = useState<PickResult>({ status: "idle" });

  const pickAndUpload = useCallback(async () => {
    setResult({ status: "idle" });

    const granted = await ensureMediaLibraryPermission();
    if (!granted) {
      const next: PickResult = { status: "permission-denied" };
      setResult(next);
      return next;
    }

    const asset = await pickSquareImage();
    if (!asset) {
      const next: PickResult = { status: "cancelled" };
      setResult(next);
      return next;
    }

    try {
      await uploadMutation.mutateAsync(asset);
      const next: PickResult = { status: "uploaded" };
      setResult(next);
      return next;
    } catch (e) {
      const next: PickResult = { status: "error", message: (e as Error).message ?? "Upload failed." };
      setResult(next);
      return next;
    }
  }, [uploadMutation]);

  return {
    pickAndUpload,
    isUploading: uploadMutation.isPending,
    result
  };
}
