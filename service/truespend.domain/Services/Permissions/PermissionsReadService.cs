using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.DbContext;
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

public sealed class PermissionsReadService(TrueSpendDbContext db) : IPermissionsReadService
{
    public async Task<PermissionsResponse> GetPermissionsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var permission = await db.UserPermissions.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == user.UserId, cancellationToken);
        if (permission is null)
        {
            return new PermissionsResponse(PermissionsConstants.StateNotDetermined, PermissionsConstants.StateNotDetermined, PermissionsConstants.StateNotDetermined, null, DateTimeOffset.UtcNow);
        }

        var deviceId = await db.Devices.AsNoTracking()
            .Where(d => d.UserId == user.UserId && d.IsActive)
            .OrderByDescending(d => d.LastSeenAt)
            .Select(d => (int?)d.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var states = await db.PermissionStates.AsNoTracking().ToDictionaryAsync(x => x.Id, x => x.Code, cancellationToken);
        return new PermissionsResponse(
            states.GetValueOrDefault(permission.LocationPermissionId, PermissionsConstants.StateNotDetermined),
            states.GetValueOrDefault(permission.CameraPermissionId, PermissionsConstants.StateNotDetermined),
            states.GetValueOrDefault(permission.NotificationPermissionId, PermissionsConstants.StateNotDetermined),
            deviceId,
            permission.LastReportedAt);
    }
}
