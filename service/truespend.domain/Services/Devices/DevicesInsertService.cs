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

        // Prefer the stable per-install identity: a re-register (even a tokenless one before push
        // permission is granted) resolves to the same row, so we update in place instead of leaking a
        // duplicate. Fall back to push-token matching for older clients that don't send an installation id.
        var installationId = Guid.TryParse(request.InstallationId, out var parsed) ? parsed : (Guid?)null;
        DeviceEntity? existing = null;
        if (installationId is not null)
        {
            existing = await db.Devices
                .Where(d => d.UserId == user.UserId && d.InstallationId == installationId)
                .FirstOrDefaultAsync(cancellationToken);
        }

        // Fall back to the push token when the install id doesn't match yet. This also covers the
        // migration: a pre-existing row created before installation_id existed is adopted here (and
        // stamped with the id below) instead of inserting a duplicate that would collide on the unique
        // push_token. push_token is unique, so this matches at most one row.
        if (existing is null && !string.IsNullOrEmpty(request.PushToken))
        {
            existing = await db.Devices
                .Where(d => d.UserId == user.UserId && d.PushToken == request.PushToken)
                .FirstOrDefaultAsync(cancellationToken);
        }

        if (existing is not null)
        {
            existing.PlatformId = platformId.Value;
            // Don't overwrite a previously captured token with null — a tokenless re-register (permission
            // not yet granted) must not wipe a working token already on this install's row.
            if (!string.IsNullOrEmpty(request.PushToken)) existing.PushToken = request.PushToken;
            if (installationId is not null) existing.InstallationId = installationId;
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
            InstallationId = installationId,
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
