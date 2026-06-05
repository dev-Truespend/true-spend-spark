import { useMutation } from "@tanstack/react-query";
import { devicesApi, DeviceRegistrationInput } from "@/shared/api/devices.api";
import { registerDeviceSchema } from "@/features/devices/schemas/devices.schema";
import { ensurePushToken } from "@/shared/native/pushNotifications";

type RegisterDeviceOptions = {
  requestPushPermission?: boolean;
};

export function useRegisterDevice(options: RegisterDeviceOptions = {}) {
  return useMutation({
    mutationFn: async (input: DeviceRegistrationInput = {}) => {
      const parsed = registerDeviceSchema.parse(input);
      let pushToken = parsed.pushToken ?? null;
      if (options.requestPushPermission && pushToken === null) {
        const result = await ensurePushToken();
        pushToken = result.token;
      }
      return devicesApi.register({ pushToken });
    }
  });
}
