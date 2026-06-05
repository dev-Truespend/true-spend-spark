namespace TrueSpend.Api.ViewModels.AIInsights;

public sealed record AIInsightVm(int Id, string TypeCode, string Priority, string Title, string Body, DateTimeOffset GeneratedAt);
