using TrueSpend.Api.ViewModels.Common;

namespace TrueSpend.Api.ViewModels.Plaid;

public sealed record PlaidConnectionResponseVm(
    IReadOnlyList<PlaidConnectionVm> Connections,
    IReadOnlyList<CardSummaryVm> Cards,
    string CardSyncStatus);
