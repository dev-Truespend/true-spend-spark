import { useMutation } from "@tanstack/react-query";
import { Linking } from "react-native";
import { privacyApi } from "@/features/privacy/api/privacy.api";
import {
  requestDataExportSchema,
  RequestDataExportInput
} from "@/features/privacy/schemas/privacy.schema";

export function useRequestDataExport() {
  return useMutation({
    mutationFn: async (input: RequestDataExportInput) => {
      const parsed = requestDataExportSchema.parse(input);
      return privacyApi.requestExport(parsed);
    }
  });
}

export function useDownloadLocationHistory() {
  return useMutation({
    mutationFn: async () => {
      const response = await privacyApi.downloadLocationHistory();
      const url = response.data?.downloadUrl;
      if (url) await Linking.openURL(url);
      return response;
    }
  });
}
