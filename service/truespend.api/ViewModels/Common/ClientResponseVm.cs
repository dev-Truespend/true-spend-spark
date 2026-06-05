namespace TrueSpend.Api.ViewModels.Common;

public sealed record ClientResponseVm<T>(
    bool Success,
    T? Data,
    IReadOnlyList<string> Errors);
