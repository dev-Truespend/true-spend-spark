namespace TrueSpend.Api.ViewModels.Plaid;

public sealed record PlaidConnectionsResponseVm(IReadOnlyList<PlaidConnectionVm> Connections);
