namespace TrueSpend.Api.Mappers;

internal static class MoneyFormatter
{
    public static string FormatMoney(decimal amount, string currencyCode) =>
        $"{currencyCode} {amount:F2}";

    public static string FormatReward(decimal amount, string? currencyCode) =>
        currencyCode is "USD" or "GBP" or "EUR" ? $"{amount:F2}" : $"{amount:F0} pts";
}
