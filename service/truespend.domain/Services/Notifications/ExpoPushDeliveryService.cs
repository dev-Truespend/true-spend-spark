using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Notifications;

namespace TrueSpend.Domain.Services.Notifications;

public sealed class ExpoPushDeliveryService(HttpClient httpClient) : IPushDeliveryService
{
    private const string ExpoPushUrl = "https://exp.host/--/api/v2/push/send";

    public async Task<PushDeliveryResult> SendAsync(PushDeliveryRequest request, CancellationToken cancellationToken)
    {
        var message = new ExpoPushMessage(
            request.PushToken,
            request.Title,
            request.Body,
            FlattenPayload(request.Payload));

        using var response = await httpClient.PostAsJsonAsync(ExpoPushUrl, message, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            return new PushDeliveryResult(false, null, ((int)response.StatusCode).ToString(), Truncate(body, 1000));
        }

        var receipt = await response.Content.ReadFromJsonAsync<ExpoPushResponse>(cancellationToken: cancellationToken);
        var data = receipt?.Data;
        if (data is null || data.Status != "ok")
        {
            return new PushDeliveryResult(false, data?.Id, data?.Details?.Error ?? "expo_error", data?.Message ?? "unknown");
        }
        return new PushDeliveryResult(true, data.Id, null, null);
    }

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];

    // Expo's `data` payload is delivered to the device as a JSON object on `notification.request.content.data`.
    // The mobile router reads top-level keys (`type`, `notificationId`, `transactionId`, ...), so the producer's
    // discriminated-union JSON is flattened into individual `data` entries here.
    private static IDictionary<string, string>? FlattenPayload(string? payload)
    {
        if (string.IsNullOrWhiteSpace(payload)) return null;
        try
        {
            using var doc = JsonDocument.Parse(payload);
            if (doc.RootElement.ValueKind != JsonValueKind.Object) return null;
            var flat = new Dictionary<string, string>();
            foreach (var prop in doc.RootElement.EnumerateObject())
            {
                flat[prop.Name] = prop.Value.ValueKind switch
                {
                    JsonValueKind.String => prop.Value.GetString() ?? string.Empty,
                    JsonValueKind.Null => string.Empty,
                    _ => prop.Value.GetRawText()
                };
            }
            return flat.Count == 0 ? null : flat;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private sealed record ExpoPushMessage(
        [property: JsonPropertyName("to")] string To,
        [property: JsonPropertyName("title")] string Title,
        [property: JsonPropertyName("body")] string Body,
        [property: JsonPropertyName("data")] IDictionary<string, string>? Data);

    private sealed record ExpoPushResponse([property: JsonPropertyName("data")] ExpoPushReceipt? Data);

    private sealed record ExpoPushReceipt(
        [property: JsonPropertyName("status")] string Status,
        [property: JsonPropertyName("id")] string? Id,
        [property: JsonPropertyName("message")] string? Message,
        [property: JsonPropertyName("details")] ExpoPushDetails? Details);

    private sealed record ExpoPushDetails([property: JsonPropertyName("error")] string? Error);
}
