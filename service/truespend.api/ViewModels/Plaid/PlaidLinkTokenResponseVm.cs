namespace TrueSpend.Api.ViewModels.Plaid;

public sealed record PlaidLinkTokenResponseVm(string LinkToken, DateTimeOffset Expiration);
