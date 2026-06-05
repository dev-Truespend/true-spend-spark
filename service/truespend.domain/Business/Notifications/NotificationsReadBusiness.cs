using Microsoft.Extensions.Caching.Memory;
using TrueSpend.Domain.BusinessInterfaces.Notifications;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;

namespace TrueSpend.Domain.Business.Notifications;

public sealed class NotificationsReadBusiness(INotificationsReadService service, IMemoryCache cache) : INotificationsReadBusiness
{
    private static readonly TimeSpan InboxCacheTtl = TimeSpan.FromMinutes(1);

    public async Task<BusinessResponse<NotificationsResponse>> GetNotificationsAsync(
        OnboardingWorkflowUser user,
        string filter,
        CancellationToken cancellationToken)
    {
        var normalizedFilter = string.IsNullOrWhiteSpace(filter) ? "all" : filter.Trim().ToLowerInvariant();
        if (!NotificationsConstants.InboxFilters.Contains(normalizedFilter))
        {
            return BusinessResponse<NotificationsResponse>.Fail([$"Unsupported filter '{filter}'."], 400);
        }

        var key = NotificationsConstants.InboxCacheKey(user.UserId, normalizedFilter);
        if (!cache.TryGetValue(key, out NotificationsResponse? cached) || cached is null)
        {
            var notifications = await service.GetNotificationsAsync(user, normalizedFilter, cancellationToken);
            cached = new NotificationsResponse(notifications);
            cache.Set(key, cached, InboxCacheTtl);
        }
        return BusinessResponse<NotificationsResponse>.Ok(cached);
    }

    public async Task<BusinessResponse<NotificationDetailResponse>> GetNotificationDetailAsync(
        OnboardingWorkflowUser user,
        int notificationId,
        CancellationToken cancellationToken)
    {
        var detail = await service.GetNotificationDetailAsync(user, notificationId, cancellationToken);
        if (detail is null)
            return BusinessResponse<NotificationDetailResponse>.Fail(["Notification not found."], 404);

        return BusinessResponse<NotificationDetailResponse>.Ok(
            new NotificationDetailResponse(detail.Notification, detail.RelatedTransaction, detail.RelatedMissedReward));
    }

    public async Task<BusinessResponse<NotificationRemindersResponse>> GetRemindersAsync(
        OnboardingWorkflowUser user,
        CancellationToken cancellationToken)
    {
        var reminders = await service.GetRemindersAsync(user, cancellationToken);
        return BusinessResponse<NotificationRemindersResponse>.Ok(new NotificationRemindersResponse(reminders));
    }
}
