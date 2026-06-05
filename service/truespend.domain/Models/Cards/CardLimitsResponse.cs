namespace TrueSpend.Domain.Models.Cards;

public sealed record CardLimitsResponse(int PlaidUsed, int? PlaidLimit, int ManualUsed, int? ManualLimit, bool Unlimited);
