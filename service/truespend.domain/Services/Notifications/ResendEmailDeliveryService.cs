using System.Net.Http.Json;
using System.Text.Json;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Notifications;

namespace TrueSpend.Domain.Services.Notifications;

public sealed class ResendEmailDeliveryService(HttpClient httpClient, ResendOptions options) : IEmailDeliveryService
{
    public async Task<EmailDeliveryResult> SendAsync(EmailDeliveryRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(options.FromAddress))
            return new EmailDeliveryResult(false, null, "config_missing", "Resend FromAddress missing");

        var payload = new
        {
            from = options.FromAddress,
            to = new[] { request.ToEmail },
            subject = request.Subject,
            html = request.Body
        };

        try
        {
            using var response = await httpClient.PostAsJsonAsync("emails", payload, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                return new EmailDeliveryResult(false, null, ((int)response.StatusCode).ToString(), Truncate(body, 500));
            }

            string? externalId = null;
            try
            {
                var json = await response.Content.ReadAsStringAsync(cancellationToken);
                using var doc = JsonDocument.Parse(json);
                if (doc.RootElement.TryGetProperty("id", out var idEl) && idEl.ValueKind == JsonValueKind.String)
                    externalId = idEl.GetString();
            }
            catch (JsonException) { }

            return new EmailDeliveryResult(true, externalId, null, null);
        }
        catch (HttpRequestException ex)
        {
            return new EmailDeliveryResult(false, null, "http_request_error", ex.Message);
        }
        catch (TaskCanceledException ex)
        {
            return new EmailDeliveryResult(false, null, "timeout", ex.Message);
        }
    }

    private static string Truncate(string value, int max) => value.Length <= max ? value : value[..max];
}

public sealed class ResendOptions
{
    public string ApiKey { get; set; } = string.Empty;
    public string FromAddress { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = "https://api.resend.com/";
}
