using System.Text.Json;
using TrueSpend.Domain.Models.Billing;

namespace TrueSpend.Domain.Services.Billing;

internal static class StripeEventMapper
{
    public static StripeEventEnvelope? FromRawJson(string rawPayload)
    {
        if (string.IsNullOrWhiteSpace(rawPayload)) return null;

        try
        {
            using var doc = JsonDocument.Parse(rawPayload);
            var root = doc.RootElement;
            var id = root.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
            var type = root.TryGetProperty("type", out var typeEl) ? typeEl.GetString() : null;
            if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(type)) return null;

            var data = root.TryGetProperty("data", out var dataEl) && dataEl.TryGetProperty("object", out var obj)
                ? (JsonElement?)obj
                : null;

            StripeSubscriptionData? subscription = null;
            StripePaymentMethodData? paymentMethod = null;
            StripeCustomerData? customer = null;

            if (data is { } d)
            {
                if (type!.StartsWith("customer.subscription.", StringComparison.OrdinalIgnoreCase) ||
                    string.Equals(type, "invoice.paid", StringComparison.OrdinalIgnoreCase))
                {
                    subscription = ReadSubscriptionFromJson(d);
                }
                else if (type.StartsWith("payment_method.", StringComparison.OrdinalIgnoreCase))
                {
                    paymentMethod = ReadPaymentMethodFromJson(d, type);
                }
                else if (string.Equals(type, "checkout.session.completed", StringComparison.OrdinalIgnoreCase))
                {
                    customer = ReadCustomerFromJson(d);
                }
            }

            return new StripeEventEnvelope(id!, type!, subscription, paymentMethod, customer);
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static StripeSubscriptionData? ReadSubscriptionFromJson(JsonElement obj)
    {
        var id = obj.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? string.Empty : string.Empty;
        var customerId = obj.TryGetProperty("customer", out var custEl) ? custEl.GetString() ?? string.Empty : string.Empty;
        var status = obj.TryGetProperty("status", out var statusEl) ? statusEl.GetString() ?? string.Empty : string.Empty;
        var currentPeriodStart = ReadUnixSeconds(obj, "current_period_start") ?? DateTimeOffset.UtcNow;
        var currentPeriodEnd = ReadUnixSeconds(obj, "current_period_end") ?? DateTimeOffset.UtcNow;
        var trialEnd = ReadUnixSeconds(obj, "trial_end");
        var cancelAtPeriodEnd = obj.TryGetProperty("cancel_at_period_end", out var capEl) && capEl.ValueKind == JsonValueKind.True;
        var canceledAt = ReadUnixSeconds(obj, "canceled_at");

        var priceId = string.Empty;
        if (obj.TryGetProperty("items", out var itemsEl) &&
            itemsEl.TryGetProperty("data", out var itemsData) &&
            itemsData.ValueKind == JsonValueKind.Array &&
            itemsData.GetArrayLength() > 0)
        {
            var first = itemsData[0];
            if (first.TryGetProperty("price", out var priceEl) && priceEl.TryGetProperty("id", out var priceIdEl))
            {
                priceId = priceIdEl.GetString() ?? string.Empty;
            }
        }

        if (string.IsNullOrWhiteSpace(id)) return null;
        return new StripeSubscriptionData(id, customerId, priceId, status, currentPeriodStart, currentPeriodEnd, trialEnd, cancelAtPeriodEnd, canceledAt);
    }

    private static StripePaymentMethodData? ReadPaymentMethodFromJson(JsonElement obj, string eventType)
    {
        var id = obj.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? string.Empty : string.Empty;
        var customerId = obj.TryGetProperty("customer", out var custEl) ? custEl.GetString() ?? string.Empty : string.Empty;
        string? brand = null;
        string? last4 = null;
        short? expMonth = null;
        short? expYear = null;

        if (obj.TryGetProperty("card", out var cardEl) && cardEl.ValueKind == JsonValueKind.Object)
        {
            brand = cardEl.TryGetProperty("brand", out var brandEl) ? brandEl.GetString() : null;
            last4 = cardEl.TryGetProperty("last4", out var l4El) ? l4El.GetString() : null;
            if (cardEl.TryGetProperty("exp_month", out var emEl) && emEl.TryGetInt32(out var em)) expMonth = (short)em;
            if (cardEl.TryGetProperty("exp_year", out var eyEl) && eyEl.TryGetInt32(out var ey)) expYear = (short)ey;
        }

        var detached = string.Equals(eventType, "payment_method.detached", StringComparison.OrdinalIgnoreCase);

        if (string.IsNullOrWhiteSpace(id)) return null;
        return new StripePaymentMethodData(id, customerId, brand, last4, expMonth, expYear, detached);
    }

    private static StripeCustomerData? ReadCustomerFromJson(JsonElement obj)
    {
        var customerId = obj.TryGetProperty("customer", out var custEl) ? custEl.GetString() : null;
        if (string.IsNullOrWhiteSpace(customerId)) return null;

        var email = string.Empty;
        if (obj.TryGetProperty("customer_email", out var emEl) && emEl.ValueKind == JsonValueKind.String)
        {
            email = emEl.GetString() ?? string.Empty;
        }
        else if (obj.TryGetProperty("customer_details", out var detEl) &&
                 detEl.TryGetProperty("email", out var detEmEl) &&
                 detEmEl.ValueKind == JsonValueKind.String)
        {
            email = detEmEl.GetString() ?? string.Empty;
        }

        Guid? userId = null;
        if (obj.TryGetProperty("client_reference_id", out var crEl) &&
            crEl.ValueKind == JsonValueKind.String &&
            Guid.TryParseExact(crEl.GetString(), "N", out var parsed))
        {
            userId = parsed;
        }

        return new StripeCustomerData(customerId, email, userId);
    }

    private static DateTimeOffset? ReadUnixSeconds(JsonElement obj, string property)
    {
        if (!obj.TryGetProperty(property, out var el) || el.ValueKind != JsonValueKind.Number) return null;
        return el.TryGetInt64(out var seconds) ? DateTimeOffset.FromUnixTimeSeconds(seconds) : null;
    }
}
