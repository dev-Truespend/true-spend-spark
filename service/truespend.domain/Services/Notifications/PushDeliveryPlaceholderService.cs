using Microsoft.Extensions.Logging;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Notifications;

namespace TrueSpend.Domain.Services.Notifications;

// No-op push sender used when ExpoPush:AccessToken is unset. It reports success with a "placeholder-"
// receipt id so the dispatch pipeline keeps working in local/unconfigured envs — but nothing is ever
// delivered to Expo/APNs. We log a single loud warning the first time it's used so this isn't silent:
// a notification showing status "sent" with a placeholder receipt is NOT a real push.
public sealed class PushDeliveryPlaceholderService(ILogger<PushDeliveryPlaceholderService> logger) : IPushDeliveryService
{
    private static int _warned;

    public Task<PushDeliveryResult> SendAsync(PushDeliveryRequest request, CancellationToken cancellationToken)
    {
        if (Interlocked.Exchange(ref _warned, 1) == 0)
        {
            logger.LogWarning(
                "Push delivery is using the PLACEHOLDER sender — ExpoPush:AccessToken is not configured, so " +
                "notifications are recorded as 'sent' but NOT delivered to Expo/APNs. Set ExpoPush:AccessToken " +
                "(KV secret ExpoPush--AccessToken) to enable real pushes.");
        }

        return Task.FromResult(new PushDeliveryResult(true, $"placeholder-{Guid.NewGuid():N}", null, null));
    }
}
