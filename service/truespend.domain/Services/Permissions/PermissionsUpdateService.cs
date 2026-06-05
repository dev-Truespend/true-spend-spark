using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.App;
using TrueSpend.Domain.Entities.Messaging;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.ServiceInterfaces.Permissions;

namespace TrueSpend.Domain.Services.Permissions;

public sealed class PermissionsUpdateService(TrueSpendDbContext db) : IPermissionsUpdateService
{
    public async Task<PermissionsResponse> SavePermissionsAsync(OnboardingWorkflowUser user, PermissionsResponse permissions, CancellationToken cancellationToken)
    {
        var states = await db.PermissionStates.AsNoTracking().ToDictionaryAsync(x => x.Code, x => x.Id, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        var entity = await db.UserPermissions.FirstOrDefaultAsync(x => x.UserId == user.UserId, cancellationToken);
        if (entity is null)
        {
            entity = new UserPermissionEntity
            {
                UserId = user.UserId,
                LocationPermissionId = states.GetValueOrDefault(permissions.Location, (short)1),
                CameraPermissionId = states.GetValueOrDefault(permissions.Camera, (short)1),
                NotificationPermissionId = states.GetValueOrDefault(permissions.Notifications, (short)1),
                LastReportedAt = now,
                CreatedAt = now,
                UpdatedAt = now
            };
            db.UserPermissions.Add(entity);
        }
        else
        {
            entity.LocationPermissionId = states.GetValueOrDefault(permissions.Location, entity.LocationPermissionId);
            entity.CameraPermissionId = states.GetValueOrDefault(permissions.Camera, entity.CameraPermissionId);
            entity.NotificationPermissionId = states.GetValueOrDefault(permissions.Notifications, entity.NotificationPermissionId);
            entity.LastReportedAt = now;
            entity.UpdatedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken);
        return permissions with { LastReportedAt = entity.LastReportedAt };
    }

    public async Task<int> EnsureDeviceIdAsync(OnboardingWorkflowUser user, int? supplied, CancellationToken cancellationToken)
    {
        if (supplied is int id && await db.Devices.AnyAsync(d => d.Id == id && d.UserId == user.UserId, cancellationToken)) return id;

        var existing = await db.Devices.AsNoTracking()
            .Where(d => d.UserId == user.UserId && d.IsActive)
            .OrderByDescending(d => d.LastSeenAt)
            .Select(d => (int?)d.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (existing is int existingId) return existingId;

        var platformId = await db.DevicePlatforms.AsNoTracking()
            .OrderBy(x => x.Id)
            .Select(x => x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var now = DateTimeOffset.UtcNow;
        var device = new DeviceEntity
        {
            UserId = user.UserId,
            PlatformId = platformId,
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
