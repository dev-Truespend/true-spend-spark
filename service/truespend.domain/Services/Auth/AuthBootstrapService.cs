using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.App;
using TrueSpend.Domain.Entities.Messaging;
using TrueSpend.Domain.Models.Auth;
using TrueSpend.Domain.ServiceInterfaces.Auth;

namespace TrueSpend.Domain.Services.Auth;

public sealed class AuthBootstrapService(TrueSpendDbContext db) : IAuthBootstrapService
{
    public async Task<ProfileResult?> FindProfileAsync(Guid userId, CancellationToken cancellationToken)
    {
        var profile = await db.Profiles.AsNoTracking()
            .Where(x => x.UserId == userId)
            .Select(x => new { x.DisplayName, x.Email, x.Phone, x.AvatarUrl })
            .FirstOrDefaultAsync(cancellationToken);
        return profile is null
            ? null
            : new ProfileResult(profile.DisplayName, profile.Email, profile.Phone, profile.AvatarUrl, null, string.Empty, string.Empty);
    }

    public async Task<ProfileResult> InsertProfileAsync(Guid userId, string displayName, string email, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var profile = new ProfileEntity
        {
            UserId = userId,
            DisplayName = displayName,
            Email = email,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.Profiles.Add(profile);
        await db.SaveChangesAsync(cancellationToken);
        return new ProfileResult(profile.DisplayName, profile.Email, profile.Phone, profile.AvatarUrl, null, string.Empty, string.Empty);
    }

    public async Task<PreferencesResult?> FindPreferencesAsync(Guid userId, CancellationToken cancellationToken)
    {
        var preferences = await db.UserPreferences.AsNoTracking()
            .Where(x => x.UserId == userId)
            .Select(x => new { x.Theme, x.Locale, x.Timezone, x.HideAmounts, x.BiometricUnlockEnabled })
            .FirstOrDefaultAsync(cancellationToken);
        return preferences is null
            ? null
            : new PreferencesResult(preferences.Theme, preferences.Locale, preferences.Timezone, preferences.HideAmounts, preferences.BiometricUnlockEnabled);
    }

    public async Task<PreferencesResult> InsertDefaultPreferencesAsync(Guid userId, string locale, string timezone, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var preferences = new UserPreferenceEntity
        {
            UserId = userId,
            Locale = locale,
            Timezone = timezone,
            Theme = AppConstants.DefaultTheme,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.UserPreferences.Add(preferences);
        await db.SaveChangesAsync(cancellationToken);
        return new PreferencesResult(preferences.Theme, preferences.Locale, preferences.Timezone, preferences.HideAmounts, preferences.BiometricUnlockEnabled);
    }

    public async Task<PermissionsResult?> FindPermissionsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var permission = await db.UserPermissions.AsNoTracking()
            .FirstOrDefaultAsync(x => x.UserId == userId, cancellationToken);
        if (permission is null) return null;

        var codes = await GetPermissionStateCodesAsync(cancellationToken);
        return new PermissionsResult(
            codes.GetValueOrDefault(permission.LocationPermissionId, PermissionsConstants.StateNotDetermined),
            codes.GetValueOrDefault(permission.CameraPermissionId, PermissionsConstants.StateNotDetermined),
            codes.GetValueOrDefault(permission.NotificationPermissionId, PermissionsConstants.StateNotDetermined),
            null,
            permission.LastReportedAt);
    }

    public async Task<PermissionsResult> InsertDefaultPermissionsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var notDeterminedId = await db.PermissionStates
            .Where(x => x.Code == PermissionsConstants.StateNotDetermined)
            .Select(x => x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var permissions = new UserPermissionEntity
        {
            UserId = userId,
            LocationPermissionId = notDeterminedId,
            CameraPermissionId = notDeterminedId,
            NotificationPermissionId = notDeterminedId,
            LastReportedAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.UserPermissions.Add(permissions);
        await db.SaveChangesAsync(cancellationToken);
        return new PermissionsResult(
            PermissionsConstants.StateNotDetermined,
            PermissionsConstants.StateNotDetermined,
            PermissionsConstants.StateNotDetermined,
            null,
            permissions.LastReportedAt);
    }

    public async Task<OnboardingStateSnapshot?> FindOnboardingAsync(Guid userId, CancellationToken cancellationToken)
    {
        var onboarding = await db.OnboardingStates.AsNoTracking()
            .Where(x => x.UserId == userId)
            .Select(x => new { x.CurrentStepId, x.CardConnectionPlaid, x.CardConnectionManual, x.CardConnectionSkipped, x.CompletedAt })
            .FirstOrDefaultAsync(cancellationToken);
        return onboarding is null
            ? null
            : new OnboardingStateSnapshot(
                onboarding.CurrentStepId,
                onboarding.CardConnectionPlaid,
                onboarding.CardConnectionManual,
                onboarding.CardConnectionSkipped,
                onboarding.CompletedAt is not null);
    }

    public async Task<OnboardingStateSnapshot> InsertDefaultOnboardingAsync(Guid userId, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var firstStepId = await db.OnboardingSteps
            .OrderBy(x => x.SortOrder)
            .Select(x => x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var entity = new OnboardingStateEntity
        {
            UserId = userId,
            CurrentStepId = firstStepId,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.OnboardingStates.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return new OnboardingStateSnapshot(firstStepId, false, false, false, false);
    }

    public Task<string?> GetOnboardingStepCodeAsync(short stepId, CancellationToken cancellationToken) =>
        db.OnboardingSteps.AsNoTracking()
            .Where(x => x.Id == stepId)
            .Select(x => x.Code)
            .FirstOrDefaultAsync(cancellationToken)!;

    public async Task<IReadOnlyList<string>> GetRoleCodesAsync(Guid userId, CancellationToken cancellationToken)
    {
        return await db.UserRoles.AsNoTracking()
            .Where(x => x.UserId == userId && x.RevokedAt == null)
            .Join(db.Roles.AsNoTracking(), ur => ur.RoleId, r => r.Id, (_, r) => r.Code)
            .ToListAsync(cancellationToken);
    }

    public async Task<int> UpsertDeviceAsync(Guid userId, DeviceInput device, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var platformId = await db.DevicePlatforms
            .Where(x => x.Code == device.PlatformCode)
            .Select(x => x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var existing = await ResolveExistingDeviceAsync(userId, platformId, device.PushToken, cancellationToken);
        if (existing is not null)
        {
            existing.PlatformId = platformId;
            if (!string.IsNullOrEmpty(device.PushToken)) existing.PushToken = device.PushToken;
            existing.DeviceName = device.DeviceName ?? existing.DeviceName;
            existing.AppVersion = device.AppVersion ?? existing.AppVersion;
            existing.OsVersion = device.OsVersion ?? existing.OsVersion;
            existing.IsActive = true;
            existing.LastSeenAt = now;
            existing.UpdatedAt = now;
            await db.SaveChangesAsync(cancellationToken);
            return existing.Id;
        }

        var inserted = new DeviceEntity
        {
            UserId = userId,
            PlatformId = platformId,
            PushToken = device.PushToken,
            DeviceName = device.DeviceName,
            AppVersion = device.AppVersion,
            OsVersion = device.OsVersion,
            IsActive = true,
            LastSeenAt = now,
            RegisteredAt = now,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.Devices.Add(inserted);
        await db.SaveChangesAsync(cancellationToken);
        return inserted.Id;
    }

    private async Task<DeviceEntity?> ResolveExistingDeviceAsync(
        Guid userId,
        short platformId,
        string? pushToken,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrEmpty(pushToken))
        {
            var byToken = await db.Devices
                .Where(d => d.UserId == userId && d.PushToken == pushToken)
                .FirstOrDefaultAsync(cancellationToken);
            if (byToken is not null) return byToken;
        }

        return await db.Devices
            .Where(d => d.UserId == userId && d.PlatformId == platformId && d.PushToken == null)
            .OrderByDescending(d => d.UpdatedAt)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private Task<Dictionary<short, string>> GetPermissionStateCodesAsync(CancellationToken cancellationToken) =>
        db.PermissionStates.AsNoTracking().ToDictionaryAsync(x => x.Id, x => x.Code, cancellationToken);
}
