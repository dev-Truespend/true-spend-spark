using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.Constants;

namespace TrueSpend.Domain.Business.Notifications;

public sealed class NotificationInboxCacheInvalidatorBusiness(
    IMemoryCache cache,
    ILogger<NotificationInboxCacheInvalidatorBusiness> logger) : INotificationInboxCacheInvalidatorBusiness
{
    public Task InvalidateAsync(Guid userId, CancellationToken cancellationToken)
    {
        foreach (var filter in NotificationsConstants.InboxFilters)
        {
            cache.Remove(NotificationsConstants.InboxCacheKey(userId, filter));
        }
        logger.LogInformation("Invalidated inbox cache for user {UserId}", userId);
        return Task.CompletedTask;
    }
}
