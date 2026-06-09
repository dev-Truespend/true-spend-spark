using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.NotificationSettings;
using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Entities.Messaging;

namespace TrueSpend.Domain.Services.Notifications;

public sealed class NotificationProductionService(TrueSpendDbContext db) : INotificationProductionService
{
    public async Task<IReadOnlyList<NotificationReminder>> GetDueRemindersAsync(
        DateTimeOffset now, CancellationToken cancellationToken)
    {
        var rows = await db.NotificationReminders
            .AsNoTracking()
            .Where(r => !r.IsFired && r.RemindAt <= now)
            .ToListAsync(cancellationToken);

        return rows.Select(r => new NotificationReminder
        {
            Id = r.Id,
            UserId = r.UserId,
            SourceNotificationId = r.SourceNotificationId,
            RemindAt = r.RemindAt,
            Title = r.Title,
            Body = r.Body,
            IsFired = r.IsFired,
            CreatedAt = r.CreatedAt
        }).ToList();
    }

    public async Task<Dictionary<Guid, NotificationDeliveryPreference>> GetPreferencesAsync(
        IReadOnlyList<Guid> userIds, CancellationToken cancellationToken) =>
        await db.NotificationPreferences
            .AsNoTracking()
            .Where(p => userIds.Contains(p.UserId))
            .ToDictionaryAsync(
                p => p.UserId,
                p => new NotificationDeliveryPreference(p.MasterEnabled, p.PushEnabled, p.EmailEnabled, p.QuietHoursEnabled, p.QuietHoursStart, p.QuietHoursEnd),
                cancellationToken);

    public async Task<short> GetSystemNotificationTypeIdAsync(CancellationToken cancellationToken) =>
        await db.NotificationTypes
            .AsNoTracking()
            .Where(t => t.Code == "system" && t.IsActive)
            .Select(t => t.Id)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<Dictionary<int, short>> GetSourceNotificationTypeIdsAsync(
        IReadOnlyList<int> sourceNotificationIds, CancellationToken cancellationToken)
    {
        if (sourceNotificationIds.Count == 0) return [];

        return await db.Notifications
            .AsNoTracking()
            .Where(n => sourceNotificationIds.Contains(n.Id))
            .ToDictionaryAsync(n => n.Id, n => n.NotificationTypeId, cancellationToken);
    }

    public async Task<Dictionary<int, SourceNotificationInfo>> GetSourceNotificationsAsync(
        IReadOnlyList<int> sourceNotificationIds, CancellationToken cancellationToken)
    {
        if (sourceNotificationIds.Count == 0) return [];

        var rows = await (
            from n in db.Notifications.AsNoTracking().Where(n => sourceNotificationIds.Contains(n.Id))
            join t in db.NotificationTypes.AsNoTracking() on n.NotificationTypeId equals t.Id
            select new SourceNotificationInfo(n.Id, n.NotificationTypeId, t.Code, n.Payload))
            .ToListAsync(cancellationToken);

        return rows.ToDictionary(x => x.SourceNotificationId);
    }

    public async Task<int> InsertNotificationAsync(NotificationToProduce input, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var entity = new NotificationEntity
        {
            UserId = input.UserId,
            NotificationTypeId = input.NotificationTypeId,
            Title = input.Title,
            Body = input.Body,
            RelatedTransactionId = input.RelatedTransactionId,
            RelatedMissedRewardEventId = input.RelatedMissedRewardEventId,
            Payload = input.Payload,
            IsRead = false,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.Notifications.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }

    public async Task UpdateNotificationPayloadAsync(int notificationId, string payload, CancellationToken cancellationToken)
    {
        var entity = await db.Notifications.FirstOrDefaultAsync(n => n.Id == notificationId, cancellationToken);
        if (entity is null) return;
        entity.Payload = payload;
        entity.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task MarkReminderFiredAsync(
        int reminderId, DateTimeOffset firedAt, CancellationToken cancellationToken)
    {
        var entity = await db.NotificationReminders.FirstOrDefaultAsync(r => r.Id == reminderId, cancellationToken);
        if (entity is null) return;

        entity.IsFired = true;
        entity.FiredAt = firedAt;
        entity.UpdatedAt = firedAt;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<short> GetNotificationTypeIdAsync(string typeCode, CancellationToken cancellationToken) =>
        await db.NotificationTypes.AsNoTracking()
            .Where(t => t.Code == typeCode && t.IsActive)
            .Select(t => t.Id)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<MissedRewardForNotification?> GetMissedRewardForNotificationAsync(int missedRewardEventId, CancellationToken cancellationToken)
    {
        return await (
            from m in db.MissedRewardEvents.AsNoTracking()
            join t in db.Transactions.AsNoTracking() on m.TransactionId equals t.Id
            join betterCard in db.UserCards.AsNoTracking() on m.BetterUserCardId equals betterCard.Id into bc
            from betterCard in bc.DefaultIfEmpty()
            join cat in db.Categories.AsNoTracking() on t.CategoryId equals cat.Id into cj
            from cat in cj.DefaultIfEmpty()
            where m.Id == missedRewardEventId && !m.IsDismissed
            select new MissedRewardForNotification(
                m.Id,
                m.TransactionId,
                t.UserId,
                m.MissedAmount,
                betterCard != null ? (betterCard.Nickname ?? betterCard.CustomCardName) : null,
                cat != null ? cat.DisplayName : null))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<bool> HasExistingMissedRewardNotificationAsync(int missedRewardEventId, CancellationToken cancellationToken) =>
        await db.Notifications.AsNoTracking()
            .AnyAsync(n => n.RelatedMissedRewardEventId == missedRewardEventId, cancellationToken);

    public async Task<IReadOnlyList<EligibleSummaryUser>> GetActiveUsersWithTimezoneAsync(CancellationToken cancellationToken)
    {
        var users = await (
            from prof in db.Profiles.AsNoTracking()
            join pref in db.UserPreferences.AsNoTracking() on prof.UserId equals pref.UserId into pj
            from pref in pj.DefaultIfEmpty()
            select new EligibleSummaryUser(prof.UserId, pref != null ? pref.Timezone : null))
            .ToListAsync(cancellationToken);
        return users;
    }

    public async Task<IReadOnlyList<UnusualTransactionCandidate>> GetUnusualTransactionCandidatesAsync(
        DateTimeOffset since,
        decimal thresholdAmount,
        CancellationToken cancellationToken)
    {
        return await db.Transactions.AsNoTracking()
            .Where(t => t.CreatedAt >= since && t.Amount >= thresholdAmount)
            .OrderBy(t => t.Id)
            .Select(t => new UnusualTransactionCandidate(t.Id, t.UserId, t.Amount, t.TransactionDate))
            .ToListAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<ExpiringSubscription>> GetExpiringSubscriptionsAsync(
        DateTimeOffset now,
        DateTimeOffset windowEnd,
        CancellationToken cancellationToken)
    {
        return await (
            from sub in db.Subscriptions.AsNoTracking()
            join status in db.SubscriptionStatuses.AsNoTracking() on sub.StatusId equals status.Id
            // Trial ending: a trialing subscription whose trial_end falls inside the reminder window.
            where (status.Code == BillingConstants.TrialingStatusCode
                       && sub.TrialEnd != null && sub.TrialEnd > now && sub.TrialEnd <= windowEnd)
                  // Paid plan ending: set to cancel at period end and the period end is inside the window.
                  || (status.Code == BillingConstants.ActiveStatusCode
                       && sub.CancelAtPeriodEnd
                       && sub.CurrentPeriodEnd > now && sub.CurrentPeriodEnd <= windowEnd)
            select new ExpiringSubscription(
                sub.UserId,
                status.Code == BillingConstants.TrialingStatusCode
                    ? NotificationsConstants.SubscriptionExpiryTrialKind
                    : NotificationsConstants.SubscriptionExpiryPlanKind,
                status.Code == BillingConstants.TrialingStatusCode
                    ? sub.TrialEnd!.Value
                    : sub.CurrentPeriodEnd))
            .ToListAsync(cancellationToken);
    }

    public Task<bool> HasNotificationOfTypeSinceAsync(
        Guid userId, short notificationTypeId, DateTimeOffset since, CancellationToken cancellationToken) =>
        db.Notifications.AsNoTracking()
            .AnyAsync(n => n.UserId == userId
                           && n.NotificationTypeId == notificationTypeId
                           && n.CreatedAt >= since, cancellationToken);
}
