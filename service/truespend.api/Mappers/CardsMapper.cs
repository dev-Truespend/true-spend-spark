using TrueSpend.Api.ViewModels.Cards;
using DomainCardSummary = TrueSpend.Domain.Models.Cards.CardSummary;
using DomainCards = TrueSpend.Domain.Models.Cards.CardsResponse;
using DomainLimits = TrueSpend.Domain.Models.Cards.CardLimitsResponse;
using DomainDetail = TrueSpend.Domain.Models.Cards.CardDetailResponse;
using DomainCreate = TrueSpend.Domain.Models.Cards.CreateManualCardRequest;
using DomainUpdate = TrueSpend.Domain.Models.Cards.UpdateCardRequest;
using DomainUpsertOverride = TrueSpend.Domain.Models.Cards.UpsertRewardOverrideRequest;
using DomainDeleteOverride = TrueSpend.Domain.Models.Cards.DeleteRewardOverrideRequest;
using DomainRewardOverrides = TrueSpend.Domain.Models.Cards.RewardOverridesResponse;
using CommonVm = TrueSpend.Api.ViewModels.Common;

namespace TrueSpend.Api.Mappers;

public interface ICardsMapper
{
    DomainCreate ToDomain(CreateManualCardRequestVm request);
    DomainUpdate ToDomain(UpdateCardRequestVm request);
    DomainUpsertOverride ToDomain(UpsertRewardOverrideRequestVm request);
    DomainDeleteOverride ToDomain(DeleteRewardOverrideRequestVm request);
    CommonVm.CardSummaryVm ToCardSummary(DomainCardSummary domain);
    CardsResponseVm ToResponse(DomainCards domain);
    CardLimitsResponseVm ToLimits(DomainLimits domain);
    CardDetailResponseVm ToDetail(DomainDetail domain);
    RewardOverridesResponseVm ToRewardOverrides(DomainRewardOverrides domain);
}

public sealed class CardsMapper : ICardsMapper
{
    public DomainCreate ToDomain(CreateManualCardRequestVm request) =>
        new(request.CardProductId, request.IssuerId, request.Nickname, request.LastFour, request.IsPrimary);

    public DomainUpdate ToDomain(UpdateCardRequestVm request) =>
        new(request.Nickname, request.LastFour, request.IsPrimary);

    public DomainUpsertOverride ToDomain(UpsertRewardOverrideRequestVm request) =>
        new(request.CategoryCode, request.Multiplier, request.Notes);

    public DomainDeleteOverride ToDomain(DeleteRewardOverrideRequestVm request) =>
        new(request.CategoryCode);

    public CommonVm.CardSummaryVm ToCardSummary(DomainCardSummary domain) =>
        new(domain.Id, domain.DisplayName, domain.IssuerName, domain.LastFour, domain.Source, domain.IsPrimary, domain.SyncStatus, domain.CardArtUrl);

    public CardsResponseVm ToResponse(DomainCards domain) =>
        new(domain.Cards.Select(ToCardSummary).ToArray(), ToLimits(domain.Limits));

    public CardLimitsResponseVm ToLimits(DomainLimits domain) =>
        new(domain.PlaidUsed, domain.PlaidLimit, domain.ManualUsed, domain.ManualLimit, domain.Unlimited);

    public CardDetailResponseVm ToDetail(DomainDetail domain) =>
        new(
            ToCardSummary(domain.Card),
            domain.RewardRules.Select(r => new RewardRuleVm(r.CategoryCode, r.CategoryName, r.Multiplier, r.CapDisplay, r.Notes)).ToArray(),
            domain.MonthlyRewardContribution is null ? null
                : new MonthlyRewardContributionVm(domain.MonthlyRewardContribution.Points, domain.MonthlyRewardContribution.EstimatedValue, domain.MonthlyRewardContribution.CurrencyCode, domain.MonthlyRewardContribution.PeriodLabel),
            domain.Terms is null ? null
                : new CardTermsVm(domain.Terms.AnnualFee, domain.Terms.PurchaseApr, domain.Terms.ForeignTransactionFee, domain.Terms.TermsSummary));

    public RewardOverridesResponseVm ToRewardOverrides(DomainRewardOverrides domain) =>
        new(domain.RewardRules.Select(r => new RewardOverrideVm(r.CategoryCode, r.CategoryName, r.Multiplier, r.Notes)).ToArray());
}
