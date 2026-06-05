using TrueSpend.Api.ViewModels.Common;

namespace TrueSpend.Api.ViewModels.Cards;

public sealed record CardsResponseVm(IReadOnlyList<CardSummaryVm> Cards, CardLimitsResponseVm Limits);
