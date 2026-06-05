namespace TrueSpend.Api.ViewModels.Auth;

public sealed record AuthBootstrapEntitlementsVm(
    string PlanCode,
    IReadOnlyDictionary<string, object> Features);
