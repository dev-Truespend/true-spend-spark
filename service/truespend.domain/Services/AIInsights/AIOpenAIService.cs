using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using TrueSpend.Domain.Models.AIInsights;
using TrueSpend.Domain.ServiceInterfaces.AIInsights;

namespace TrueSpend.Domain.Services.AIInsights;

public sealed class AIOpenAIService(HttpClient httpClient, AzureOpenAIConfig config) : IAIOpenAIService
{
    private const string SystemPrompt =
        "You are a personal-finance assistant for the TrueSpend app. Generate up to 3 short, actionable " +
        "reward-optimization insights for the user. Respond as a JSON array of objects with fields: " +
        "type_code (one of 'reward_optimization', 'spending_pattern', 'category_overspend'), " +
        "priority ('low'|'medium'|'high'), title (max 60 chars), body (max 240 chars). Return only the JSON array.";

    public async Task<IReadOnlyList<GeneratedInsight>> GenerateInsightsAsync(Guid userId, CancellationToken cancellationToken)
    {
        var uri = $"{config.Endpoint.TrimEnd('/')}/openai/deployments/{config.DeploymentName}/chat/completions?api-version={config.ApiVersion}";
        var requestBody = new ChatCompletionRequest(
            new[]
            {
                new ChatMessage("system", SystemPrompt),
                new ChatMessage("user", $"Generate insights for user {userId}.")
            },
            Temperature: 0.4,
            ResponseFormat: new ResponseFormat("json_object"));

        using var request = new HttpRequestMessage(HttpMethod.Post, uri)
        {
            Content = JsonContent.Create(requestBody)
        };
        request.Headers.Add("api-key", config.ApiKey);

        using var response = await httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            return Array.Empty<GeneratedInsight>();
        }

        var completion = await response.Content.ReadFromJsonAsync<ChatCompletionResponse>(cancellationToken: cancellationToken);
        var content = completion?.Choices?.FirstOrDefault()?.Message?.Content;
        return ParseInsights(content);
    }

    private static IReadOnlyList<GeneratedInsight> ParseInsights(string? content)
    {
        if (string.IsNullOrWhiteSpace(content)) return Array.Empty<GeneratedInsight>();

        try
        {
            using var doc = JsonDocument.Parse(content);
            var root = doc.RootElement;
            JsonElement array = root.ValueKind == JsonValueKind.Array
                ? root
                : root.TryGetProperty("insights", out var insightsArr) ? insightsArr : default;

            if (array.ValueKind != JsonValueKind.Array) return Array.Empty<GeneratedInsight>();

            var list = new List<GeneratedInsight>();
            foreach (var item in array.EnumerateArray())
            {
                var typeCode = item.TryGetProperty("type_code", out var t) ? t.GetString() ?? "reward_optimization" : "reward_optimization";
                var priority = item.TryGetProperty("priority", out var p) ? p.GetString() ?? "medium" : "medium";
                var title = item.TryGetProperty("title", out var ti) ? ti.GetString() ?? "" : "";
                var body = item.TryGetProperty("body", out var b) ? b.GetString() ?? "" : "";
                if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(body)) continue;
                list.Add(new GeneratedInsight(typeCode, priority, title, body));
            }
            return list;
        }
        catch (JsonException)
        {
            return Array.Empty<GeneratedInsight>();
        }
    }

    private sealed record ChatCompletionRequest(
        [property: JsonPropertyName("messages")] IReadOnlyList<ChatMessage> Messages,
        [property: JsonPropertyName("temperature")] double Temperature,
        [property: JsonPropertyName("response_format")] ResponseFormat ResponseFormat);

    private sealed record ChatMessage(
        [property: JsonPropertyName("role")] string Role,
        [property: JsonPropertyName("content")] string Content);

    private sealed record ResponseFormat([property: JsonPropertyName("type")] string Type);

    private sealed record ChatCompletionResponse([property: JsonPropertyName("choices")] IReadOnlyList<ChatChoice>? Choices);

    private sealed record ChatChoice([property: JsonPropertyName("message")] ChatMessage? Message);
}
