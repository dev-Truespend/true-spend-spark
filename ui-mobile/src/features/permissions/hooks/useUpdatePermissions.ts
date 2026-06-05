import { useMutation, useQueryClient } from "@tanstack/react-query";
import { permissionsApi, PermissionsUpdateInput } from "@/features/permissions/api/permissions.api";
import { updatePermissionsSchema } from "@/features/permissions/schemas/permissions.schema";
import { QueryKeys } from "@/shared/constants/QueryKeys";

export function useUpdatePermissions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: PermissionsUpdateInput) => {
      const parsed = updatePermissionsSchema.parse(input);
      return (await permissionsApi.update(parsed)).data;
    },
    onSuccess: (permissions) => {
      queryClient.setQueryData(QueryKeys.Permissions, permissions);
    }
  });
}
