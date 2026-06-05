import { apiClient, apiGet, apiPost } from "@/shared/api/client";
import { ClientResponse } from "@/shared/api/types";
import { ProfileResponse, UpdateProfileRequest } from "@/features/profile/types/profile.types";

type AvatarFile = {
  uri: string;
  fileName: string;
  mimeType: string;
};

export const profileApi = {
  get: () => apiGet<ProfileResponse>("/api/v1/profile"),
  update: (request: UpdateProfileRequest) => apiPost<ProfileResponse>("/api/v1/profile", request),
  uploadAvatar: async (input: AvatarFile): Promise<ClientResponse<ProfileResponse>> => {
    const formData = new FormData();
    formData.append("file", {
      uri: input.uri,
      name: input.fileName,
      type: input.mimeType
    } as unknown as Blob);
    const response = await apiClient.post<ClientResponse<ProfileResponse>>(
      "/api/v1/profile/avatar",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    return response.data;
  }
};
