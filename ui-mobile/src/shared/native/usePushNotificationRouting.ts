import { useEffect } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";

type PushPayload = {
  type?: string;
  notificationId?: number | string;
  relatedTransactionId?: number | string;
  transactionId?: number | string;
  recommendationId?: number | string;
  merchantId?: number | string;
  missedRewardEventId?: number | string;
};

function asPositiveInt(value: number | string | undefined): number | null {
  if (value === undefined || value === null) return null;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function routeFromPayload(data: PushPayload | undefined): string | null {
  if (!data) return null;

  const notificationId = asPositiveInt(data.notificationId);
  if (notificationId !== null) {
    return `/(app)/notifications/${notificationId}`;
  }

  const transactionId = asPositiveInt(data.transactionId ?? data.relatedTransactionId);
  if (transactionId !== null) {
    return `/(app)/transactions/${transactionId}`;
  }
  return null;
}

export function usePushNotificationRouting(): void {
  useEffect(() => {
    let active = true;

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (!active || !response) return;
      const target = routeFromPayload(response.notification.request.content.data as PushPayload);
      if (target) router.push(target);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const target = routeFromPayload(response.notification.request.content.data as PushPayload);
      if (target) router.push(target);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
}
