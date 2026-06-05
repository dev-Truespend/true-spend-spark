using TrueSpend.Api.ViewModels.Common;
using TrueSpend.Api.ViewModels.Preferences;
using DomainUpdate = TrueSpend.Domain.Models.Preferences.UpdatePreferencesRequest;
using DomainResponse = TrueSpend.Domain.Models.Preferences.PreferencesResponse;

namespace TrueSpend.Api.Mappers;

public interface IPreferencesMapper
{
    DomainUpdate ToDomain(UpdatePreferencesRequestVm request);
    PreferencesResponseVm ToResponse(DomainResponse domain);
}

public sealed class PreferencesMapper : IPreferencesMapper
{
    public DomainUpdate ToDomain(UpdatePreferencesRequestVm request) =>
        new(request.Theme, request.Locale, request.Timezone, request.HideAmounts, request.BiometricUnlockEnabled);

    public PreferencesResponseVm ToResponse(DomainResponse domain) =>
        new(domain.Theme, domain.Locale, domain.Timezone, domain.HideAmounts, domain.BiometricUnlockEnabled);
}
