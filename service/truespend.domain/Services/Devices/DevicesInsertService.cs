using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.ServiceInterfaces.Devices;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Entities.Messaging;

namespace TrueSpend.Domain.Services.Devices;

public sealed class DevicesInsertService(TrueSpendDbContext db) : IDevicesInsertService
{
    public async Task<int> RegisterDeviceAsync(OnboardingWorkflowUser user, RegisterDeviceRequest request, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;

        var platformId = await db.DevicePlatforms.AsNoTracking()
            .Where(p => p.Code == request.PlatformCode)
            .Select(p => (short?)p.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (platformId is null)
        {
            throw new InvalidOperationException($"Unknown device platform code '{request.PlatformCode}'.");
        }

        DeviceEntity? existing = null;
        if (!string.IsNullOrEmpty(request.PushToken))
        {
            existing = await db.Devices
                .Where(d => d.UserId == user.UserId && d.PushToken == request.PushToken)
                .FirstOrDefaultAsync(cancellationToken);
        }

        if (existing is not null)
        {
            existing.PlatformId = platformId.Value;
            existing.PushToken = request.PushToken;
            existing.DeviceName = request.DeviceName ?? existing.DeviceName;
            existing.AppVersion = request.AppVersion ?? existing.AppVersion;
            existing.OsVersion = request.OsVersion ?? existing.OsVersion;
            existing.Locale = request.Locale ?? existing.Locale;
            existing.Timezone = request.Timezone ?? existing.Timezone;
            existing.IsActive = true;
            existing.LastSeenAt = now;
            existing.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            return existing.Id;
        }

        var device = new DeviceEntity
        {
            UserId = user.UserId,
            PlatformId = platformId.Value,
            PushToken = request.PushToken,
            DeviceName = request.DeviceName,
            AppVersion = request.AppVersion,
            OsVersion = request.OsVersion,
            Locale = request.Locale,
            Timezone = request.Timezone,
            IsActive = true,
            LastSeenAt = now,
            RegisteredAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.Devices.Add(device);
        await db.SaveChangesAsync(cancellationToken);
        return device.Id;
    }
}
