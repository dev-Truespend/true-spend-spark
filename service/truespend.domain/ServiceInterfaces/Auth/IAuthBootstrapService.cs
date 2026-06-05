using TrueSpend.Domain.Models.Auth;

namespace TrueSpend.Domain.ServiceInterfaces.Auth;

public interface IAuthBootstrapService
{
    Task<ProfileResult?> FindProfileAsync(Guid userId, CancellationToken cancellationToken);
    Task<ProfileResult> InsertProfileAsync(Guid userId, string displayName, string email, CancellationToken cancellationToken);

    Task<PreferencesResult?> FindPreferencesAsync(Guid userId, CancellationToken cancellationToken);
    Task<PreferencesResult> InsertDefaultPreferencesAsync(Guid userId, string locale, string timezone, CancellationToken cancellationToken);

    Task<PermissionsResult?> FindPermissionsAsync(Guid userId, CancellationToken cancellationToken);
    Task<PermissionsResult> InsertDefaultPermissionsAsync(Guid userId, CancellationToken cancellationToken);

    Task<OnboardingStateSnapshot?> FindOnboardingAsync(Guid userId, CancellationToken cancellationToken);
    Task<OnboardingStateSnapshot> InsertDefaultOnboardingAsync(Guid userId, CancellationToken cancellationToken);
    Task<string?> GetOnboardingStepCodeAsync(short stepId, CancellationToken cancellationToken);

    Task<IReadOnlyList<string>> GetRoleCodesAsync(Guid userId, CancellationToken cancellationToken);

    Task<int> UpsertDeviceAsync(Guid userId, DeviceInput device, CancellationToken cancellationToken);
}

public sealed record OnboardingStateSnapshot(
    short CurrentStepId,
    bool CardConnectionPlaid,
    bool CardConnectionManual,
    bool CardConnectionSkipped,
    bool Completed);
