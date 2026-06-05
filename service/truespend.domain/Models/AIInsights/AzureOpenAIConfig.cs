namespace TrueSpend.Domain.Models.AIInsights;

public sealed record AzureOpenAIConfig(string Endpoint, string ApiKey, string DeploymentName, string ApiVersion = "2024-08-01-preview");
