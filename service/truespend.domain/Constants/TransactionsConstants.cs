namespace TrueSpend.Domain.Constants;

public static class TransactionsConstants
{
    public const string SourceManual = "manual";
    public const string SourcePlaid = "plaid";
    public const decimal MinimumAmount = 0.01m;
    public const int MaxMerchantNameLength = 200;
}
