using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.ServiceInterfaces.Devices;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using Microsoft.EntityFrameworkCore;

namespace TrueSpend.Domain.Services.Devices;

public sealed class DevicesUpdateService(TrueSpendDbContext db) : IDevicesUpdateService
{
    public async Task<bool> UpdateDeviceAsync(OnboardingWorkflowUser user, int deviceId, UpdateDeviceRequest request, CancellationToken cancellationToken)
    {
        var device = await db.Devices
            .FirstOrDefaultAsync(d => d.Id == deviceId && d.UserId == user.UserId && d.IsActive, cancellationToken);
        if (device is null) return false;

        var now = DateTimeOffset.UtcNow;
        if (request.PushToken is not null) device.PushToken = request.PushToken;
        if (request.DeviceName is not null) device.DeviceName = request.DeviceName;
        if (request.AppVersion is not null) device.AppVersion = request.AppVersion;
        if (request.OsVersion is not null) device.OsVersion = request.OsVersion;
        if (request.Locale is not null) device.Locale = request.Locale;
        if (request.Timezone is not null) device.Timezone = request.Timezone;
        device.LastSeenAt = now;
        device.UpdatedAt = now;

        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> DeactivateDeviceAsync(OnboardingWorkflowUser user, int deviceId, CancellationToken cancellationToken)
    {
        var device = await db.Devices
            .FirstOrDefaultAsync(d => d.Id == deviceId && d.UserId == user.UserId, cancellationToken);
        if (device is null) return false;

        device.IsActive = false;
        device.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<DeviceCleanupResult> DeactivateDevicesWithInvalidTokensAsync(
        DateTimeOffset since,
        IReadOnlyCollection<string> errorCodes,
        CancellationToken cancellationToken)
    {
        if (errorCodes.Count == 0)
            return new DeviceCleanupResult(0, 0, 0);

        var pushChannelId = await db.NotificationChannels
            .Where(c => c.Code == NotificationsConstants.ChannelPush)
            .Select(c => (short?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);
        var failedStatusId = await db.DeliveryStatuses
            .Where(s => s.Code == NotificationsConstants.DeliveryStatusFailed)
            .Select(s => (short?)s.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (pushChannelId is null || failedStatusId is null)
            return new DeviceCleanupResult(0, 0, 0);

        var deliveriesQuery = db.NotificationDeliveries
            .AsNoTracking()
            .Where(d => d.ChannelId == pushChannelId
                        && d.StatusId == failedStatusId
                        && d.AttemptedAt >= since
                        && d.ErrorCode != null
                        && errorCodes.Contains(d.ErrorCode)
                        && d.DeviceId != null);

        var deliveriesScanned = await deliveriesQuery.CountAsync(cancellationToken);
        var deviceIds = await deliveriesQuery
            .Select(d => d.DeviceId!.Value)
            .Distinct()
            .ToListAsync(cancellationToken);

        if (deviceIds.Count == 0)
            return new DeviceCleanupResult(deliveriesScanned, 0, 0);

        var iosPlatformId = await db.DevicePlatforms
            .Where(p => p.Code == NotificationsConstants.PlatformIos)
            .Select(p => (short?)p.Id)
            .FirstOrDefaultAsync(cancellationToken);
        var androidPlatformId = await db.DevicePlatforms
            .Where(p => p.Code == NotificationsConstants.PlatformAndroid)
            .Select(p => (short?)p.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var devices = await db.Devices
            .Where(d => deviceIds.Contains(d.Id) && d.IsActive)
            .ToListAsync(cancellationToken);

        if (devices.Count == 0)
            return new DeviceCleanupResult(deliveriesScanned, 0, 0);

        var now = DateTimeOffset.UtcNow;
        var ios = 0;
        var android = 0;
        foreach (var device in devices)
        {
            device.IsActive = false;
            device.UpdatedAt = now;
            if (iosPlatformId is not null && device.PlatformId == iosPlatformId) ios++;
            else if (androidPlatformId is not null && device.PlatformId == androidPlatformId) android++;
        }
        await db.SaveChangesAsync(cancellationToken);

        return new DeviceCleanupResult(deliveriesScanned, ios, android);
    }
}
