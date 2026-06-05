namespace TrueSpend.Domain.Models.AIInsights;

public sealed record AIInsight(
    int Id,
    string TypeCode,
    string Priority,
    string Title,
    string Body,
    DateTimeOffset GeneratedAt);
