namespace TrueSpend.Domain.Models.Cards;

public sealed record MonthlyRewardContribution(
    decimal Points,
    decimal EstimatedValue,
    string CurrencyCode,
    string PeriodLabel);
