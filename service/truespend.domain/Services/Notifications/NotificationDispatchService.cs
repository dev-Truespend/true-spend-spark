using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.Messaging;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.ServiceInterfaces.Notifications;

namespace TrueSpend.Domain.Services.Notifications;

public sealed class NotificationDispatchService(TrueSpendDbContext db) : INotificationDispatchService
{
    public async Task<NotificationDispatchInput?> GetDispatchInputAsync(int notificationId, CancellationToken cancellationToken)
    {
        return await (
            from n in db.Notifications.AsNoTracking()
            join t in db.NotificationTypes.AsNoTracking() on n.NotificationTypeId equals t.Id
            where n.Id == notificationId
            select new NotificationDispatchInput(n.Id, n.UserId, n.Title, n.Body, n.Payload, t.HonorsQuietHours))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<NotificationDeliveryPreference?> GetPreferenceAsync(Guid userId, CancellationToken cancellationToken)
    {
        var row = await db.NotificationPreferences.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => new { p.MasterEnabled, p.PushEnabled, p.EmailEnabled, p.QuietHoursEnabled, p.QuietHoursStart, p.QuietHoursEnd })
            .FirstOrDefaultAsync(cancellationToken);
        return row is null
            ? null
            : new NotificationDeliveryPreference(row.MasterEnabled, row.PushEnabled, row.EmailEnabled, row.QuietHoursEnabled, row.QuietHoursStart, row.QuietHoursEnd);
    }

    public async Task<string?> GetUserTimezoneAsync(Guid userId, CancellationToken cancellationToken)
    {
        return await db.Devices.AsNoTracking()
            .Where(d => d.UserId == userId && d.IsActive && d.Timezone != null)
            .OrderByDescending(d => d.LastSeenAt)
            .Select(d => d.Timezone)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<PushTarget>> GetActivePushTargetsAsync(Guid userId, CancellationToken cancellationToken)
    {
        return await db.Devices.AsNoTracking()
            .Where(d => d.UserId == userId && d.IsActive && d.PushToken != null && d.PushToken != "")
            .Select(d => new PushTarget(d.Id, d.PushToken!))
            .ToListAsync(cancellationToken);
    }

    public async Task<string?> GetUserEmailAsync(Guid userId, CancellationToken cancellationToken)
    {
        var email = await db.Profiles.AsNoTracking()
            .Where(p => p.UserId == userId)
            .Select(p => p.Email)
            .FirstOrDefaultAsync(cancellationToken);
        return string.IsNullOrWhiteSpace(email) ? null : email;
    }

    public async Task<short> GetChannelIdAsync(string channelCode, CancellationToken cancellationToken)
    {
        return await db.NotificationChannels.AsNoTracking()
            .Where(c => c.Code == channelCode)
            .Select(c => c.Id)
            .FirstAsync(cancellationToken);
    }

    public async Task<short> GetDeliveryStatusIdAsync(string statusCode, CancellationToken cancellationToken)
    {
        return await db.DeliveryStatuses.AsNoTracking()
            .Where(s => s.Code == statusCode)
            .Select(s => s.Id)
            .FirstAsync(cancellationToken);
    }

    public async Task InsertDeliveryAsync(int notificationId, int? deviceId, short channelId, short statusId, string? externalId, string? errorCode, string? errorMessage, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var entity = new NotificationDeliveryEntity
        {
            NotificationId = notificationId,
            DeviceId = deviceId,
            ChannelId = channelId,
            StatusId = statusId,
            ExternalId = externalId,
            ErrorCode = errorCode,
            ErrorMessage = errorMessage,
            AttemptedAt = now,
            DeliveredAt = errorCode is null ? now : null,
            AttemptCount = 1,
            CreatedAt = now
        };
        db.NotificationDeliveries.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
    }
}
