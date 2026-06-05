namespace TrueSpend.Domain.Models.Common;

public sealed record BusinessResponse<T>(
    bool Success,
    T? Data,
    IReadOnlyList<string> Errors,
    int StatusCode)
{
    public static BusinessResponse<T> Ok(T data, int statusCode = 200) => new(true, data, Array.Empty<string>(), statusCode);

    public static BusinessResponse<T> Fail(IReadOnlyList<string> errors, int statusCode) => new(false, default, errors, statusCode);
}
