namespace TrueSpend.Api.ViewModels.Lookups;

public sealed record PermissionStateOptionVm(string Code, string DisplayName);

public sealed record PermissionStatesResponseVm(IReadOnlyList<PermissionStateOptionVm> PermissionStates);
