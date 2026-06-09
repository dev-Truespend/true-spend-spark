import { useEffect } from "react";
import { router } from "expo-router";
import * as Notifications from "expo-notifications";
import { z } from "zod";

// Reminder pushes inherit the source notification's type and carry both:
//   notificationId           — the newly fired reminder notification record
//   sourceNotificationId     — the original notification that produced it
// See _docs/Workflows/notification-production.md §12.
const pushIdSchema = z.union([z.number(), z.string()]).optional();
const pushPayloadSchema = z
  .object({
    type: z.string().optional(),
    reminder: z.union([z.boolean(), z.string()]).optional(),
    notificationId: pushIdSchema,
    sourceNotificationId: pushIdSchema,
    relatedTransactionId: pushIdSchema,
    transactionId: pushIdSchema,
    recommendationId: pushIdSchema,
    merchantId: pushIdSchema,
    missedRewardEventId: pushIdSchema
  })
  .passthrough();

type PushPayload = z.infer<typeof pushPayloadSchema>;

function asPositiveInt(value: number | string | undefined): number | null {
  if (value === undefined || value === null) return null;
  const num = Number(value);
  return Number.isFinite(num) && num > 0 ? num : null;
}

function parsePayload(raw: unknown): PushPayload | null {
  const result = pushPayloadSchema.safeParse(raw);
  if (!result.success) {
    // Malformed producer payload — log and drop; the OS notification still
    // surfaces, but we won't deep-link to a bad route.
    console.warn("[push] dropped malformed payload", result.error.flatten());
    return null;
  }
  return result.data;
}

function routeFromPayload(data: PushPayload | undefined): string | null {
  if (!data) return null;

  const notificationId =
    asPositiveInt(data.notificationId) ?? asPositiveInt(data.sourceNotificationId);
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
      const payload = parsePayload(response.notification.request.content.data);
      const target = routeFromPayload(payload ?? undefined);
      if (target) router.push(target);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const payload = parsePayload(response.notification.request.content.data);
      const target = routeFromPayload(payload ?? undefined);
      if (target) router.push(target);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
}
