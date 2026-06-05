import { renderHook } from "@testing-library/react-native";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() }
}));

jest.mock("expo-notifications", () => ({
  getLastNotificationResponseAsync: jest.fn().mockResolvedValue(null),
  addNotificationResponseReceivedListener: jest.fn().mockImplementation((cb: unknown) => ({
    remove: jest.fn(),
    _cb: cb
  }))
}));

import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { usePushNotificationRouting } from "@/shared/native/usePushNotificationRouting";

type ListenerResult = { remove: jest.Mock; _cb: (response: { notification: { request: { content: { data: unknown } } } }) => void };

describe("usePushNotificationRouting", () => {
  beforeEach(() => {
    (router.push as jest.Mock).mockClear();
    (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockClear();
  });

  it("routes best_card_alert by notificationId to inbox detail (server flattens fields onto data; numbers arrive as strings)", () => {
    renderHook(() => usePushNotificationRouting());
    const listener = (Notifications.addNotificationResponseReceivedListener as jest.Mock).mock.results[0].value as ListenerResult;
    listener._cb({
      notification: {
        request: { content: { data: { type: "best_card_alert", notificationId: "42", recommendationId: "7", merchantId: "9" } } }
      }
    });
    expect(router.push).toHaveBeenCalledWith("/(app)/notifications/42");
  });

  it("routes unusual_transaction push to transaction detail when only transactionId is present", () => {
    renderHook(() => usePushNotificationRouting());
    const listener = (Notifications.addNotificationResponseReceivedListener as jest.Mock).mock.results[0].value as ListenerResult;
    listener._cb({
      notification: {
        request: { content: { data: { type: "unusual_transaction", transactionId: "99" } } }
      }
    });
    expect(router.push).toHaveBeenCalledWith("/(app)/transactions/99");
  });

  it("routes missed_rewards push to inbox detail by default (notificationId wins over transactionId)", () => {
    renderHook(() => usePushNotificationRouting());
    const listener = (Notifications.addNotificationResponseReceivedListener as jest.Mock).mock.results[0].value as ListenerResult;
    listener._cb({
      notification: {
        request: { content: { data: { type: "missed_rewards", notificationId: "55", transactionId: "99", missedRewardEventId: "8" } } }
      }
    });
    expect(router.push).toHaveBeenCalledWith("/(app)/notifications/55");
  });

  it("does nothing for empty payloads", () => {
    renderHook(() => usePushNotificationRouting());
    const listener = (Notifications.addNotificationResponseReceivedListener as jest.Mock).mock.results[0].value as ListenerResult;
    listener._cb({
      notification: {
        request: { content: { data: {} } }
      }
    });
    expect(router.push).not.toHaveBeenCalled();
  });
});
