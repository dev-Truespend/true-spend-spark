namespace TrueSpend.Domain.Models.Auth;

public sealed record EntitlementsResult(string PlanCode, IReadOnlyDictionary<string, object> Features);
