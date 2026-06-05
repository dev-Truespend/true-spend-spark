using TrueSpend.Api.ViewModels.Common;
using TrueSpend.Api.ViewModels.Profile;
using DomainUpdate = TrueSpend.Domain.Models.Profile.UpdateProfileRequest;
using DomainResponse = TrueSpend.Domain.Models.Profile.ProfileResponse;

namespace TrueSpend.Api.Mappers;

public interface IProfileMapper
{
    DomainUpdate ToDomain(UpdateProfileRequestVm request);
    ProfileResponseVm ToResponse(DomainResponse domain);
}

public sealed class ProfileMapper : IProfileMapper
{
    public DomainUpdate ToDomain(UpdateProfileRequestVm request) =>
        new(request.DisplayName, request.Phone, request.CountryCode, request.CurrencyCode);

    public ProfileResponseVm ToResponse(DomainResponse domain) =>
        new(domain.DisplayName, domain.Email, domain.Phone, domain.AvatarUrl, domain.CountryCode, domain.CurrencyCode, domain.CurrentPlanCode);
}
