using TrueSpend.Api.ViewModels.Merchants;
using DomainResolve = TrueSpend.Domain.Models.Recommendations.ResolveMerchantRequest;
using DomainMerchantResp = TrueSpend.Domain.Models.Recommendations.MerchantResponse;
using DomainMerchant = TrueSpend.Domain.Models.Recommendations.Merchant;
using DomainCreateVisit = TrueSpend.Domain.Models.Recommendations.CreateMerchantVisitRequest;
using DomainVisits = TrueSpend.Domain.Models.Recommendations.MerchantVisitsResponse;
using DomainVisit = TrueSpend.Domain.Models.Recommendations.MerchantVisit;
using DomainRecentVisit = TrueSpend.Domain.Models.Recommendations.RecentMerchantVisit;

namespace TrueSpend.Api.Mappers;

public interface IMerchantsMapper
{
    DomainResolve ToDomain(ResolveMerchantRequestVm request);
    DomainCreateVisit ToDomain(CreateMerchantVisitRequestVm request);
    MerchantResponseVm ToResponse(DomainMerchantResp domain);
    MerchantVm ToMerchant(DomainMerchant domain);
    MerchantVisitsResponseVm ToVisits(DomainVisits domain);
    RecentVisitsResponseVm ToRecentVisits(IReadOnlyList<DomainRecentVisit> domain);
}

public sealed class MerchantsMapper : IMerchantsMapper
{
    public DomainResolve ToDomain(ResolveMerchantRequestVm request) =>
        new(request.Name, request.Provider, request.ProviderPlaceId, request.Lat, request.Lng, request.Address);

    public DomainCreateVisit ToDomain(CreateMerchantVisitRequestVm request) =>
        new(request.MerchantId, request.SelectedCategoryCode, request.VisitedAt);

    public MerchantResponseVm ToResponse(DomainMerchantResp domain) => new(ToMerchant(domain.Merchant));

    public MerchantVm ToMerchant(DomainMerchant domain) =>
        new(domain.Id, domain.Name, domain.CategoryCode, domain.IsMultiCategory, domain.Address);

    public MerchantVisitsResponseVm ToVisits(DomainVisits domain) =>
        new(domain.Visits.Select(visit => new MerchantVisitVm(visit.MerchantId, visit.SelectedCategoryCode, visit.VisitedAt)).ToArray());

    public RecentVisitsResponseVm ToRecentVisits(IReadOnlyList<DomainRecentVisit> domain) =>
        new(domain.Select(v => new RecentVisitVm(ToMerchant(v.Merchant), v.CategoryCode, v.VisitedAt)).ToArray());
}
