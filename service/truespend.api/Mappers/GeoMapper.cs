using System.Globalization;
using System.Text.Json;
using TrueSpend.Api.ViewModels.Geo;
using TrueSpend.Domain.Models.Geo;

namespace TrueSpend.Api.Mappers;

public interface IGeoMapper
{
    FoursquareWebhookInput ParseFoursquareEvent(string rawBody);
    WebhookAckResponseVm ToAckResponse(FoursquareWebhookResult result);
}

public sealed class GeoMapper : IGeoMapper
{
    public FoursquareWebhookInput ParseFoursquareEvent(string rawBody)
    {
        if (string.IsNullOrWhiteSpace(rawBody))
        {
            return new FoursquareWebhookInput(
                FoursquareEventId: string.Empty,
                EventType: string.Empty,
                ExternalUserId: null,
                PlaceChain: null,
                PlaceName: null,
                GeofenceTag: null,
                Lat: null,
                Lng: null,
                AccuracyMeters: null,
                OccurredAt: default,
                RawPayload: "{}");
        }

        using var doc = JsonDocument.Parse(rawBody);
        var root = doc.RootElement;

        var foursquareEventId = ReadString(root, "id") ?? string.Empty;
        var eventType = ReadString(root, "type") ?? ReadString(root, "event_type") ?? string.Empty;
        var externalUserId = ReadString(root, "external_user_id")
            ?? ReadString(root, "externalId")
            ?? ReadNestedString(root, "user", "external_user_id")
            ?? ReadNestedString(root, "user", "externalId");

        string? placeChain = null;
        string? placeName = null;
        string? geofenceTag = null;
        decimal? lat = null;
        decimal? lng = null;
        decimal? accuracy = null;
        DateTimeOffset occurredAt = ReadDate(root, "occurred_at")
            ?? ReadDate(root, "occurredAt")
            ?? ReadDate(root, "created_at")
            ?? DateTimeOffset.UtcNow;

        if (root.TryGetProperty("place", out var placeEl) && placeEl.ValueKind == JsonValueKind.Object)
        {
            placeName = ReadString(placeEl, "name");
            placeChain = ReadString(placeEl, "chain") ?? ReadString(placeEl, "chain_name");
            if (placeEl.TryGetProperty("geocodes", out var geocodes) && geocodes.ValueKind == JsonValueKind.Object
                && geocodes.TryGetProperty("main", out var main) && main.ValueKind == JsonValueKind.Object)
            {
                lat = ReadDecimal(main, "latitude");
                lng = ReadDecimal(main, "longitude");
            }
        }

        if (root.TryGetProperty("geofence", out var geofenceEl) && geofenceEl.ValueKind == JsonValueKind.Object)
        {
            geofenceTag = ReadString(geofenceEl, "tag");
        }

        if (root.TryGetProperty("location", out var locationEl) && locationEl.ValueKind == JsonValueKind.Object)
        {
            lat ??= ReadDecimal(locationEl, "lat") ?? ReadDecimal(locationEl, "latitude");
            lng ??= ReadDecimal(locationEl, "lng") ?? ReadDecimal(locationEl, "longitude");
            accuracy = ReadDecimal(locationEl, "accuracy") ?? ReadDecimal(locationEl, "accuracy_meters");
        }

        return new FoursquareWebhookInput(
            FoursquareEventId: foursquareEventId,
            EventType: eventType,
            ExternalUserId: externalUserId,
            PlaceChain: placeChain,
            PlaceName: placeName,
            GeofenceTag: geofenceTag,
            Lat: lat,
            Lng: lng,
            AccuracyMeters: accuracy,
            OccurredAt: occurredAt,
            RawPayload: rawBody);
    }

    public WebhookAckResponseVm ToAckResponse(FoursquareWebhookResult result) =>
        new(result.Received, result.Deduplicated);

    private static string? ReadString(JsonElement parent, string name)
    {
        if (!parent.TryGetProperty(name, out var el)) return null;
        return el.ValueKind == JsonValueKind.String ? el.GetString() : null;
    }

    private static string? ReadNestedString(JsonElement parent, string first, string second)
    {
        if (!parent.TryGetProperty(first, out var firstEl) || firstEl.ValueKind != JsonValueKind.Object) return null;
        return ReadString(firstEl, second);
    }

    private static decimal? ReadDecimal(JsonElement parent, string name)
    {
        if (!parent.TryGetProperty(name, out var el)) return null;
        if (el.ValueKind == JsonValueKind.Number && el.TryGetDecimal(out var num)) return num;
        if (el.ValueKind == JsonValueKind.String && decimal.TryParse(el.GetString(), NumberStyles.Float, CultureInfo.InvariantCulture, out var parsed)) return parsed;
        return null;
    }

    private static DateTimeOffset? ReadDate(JsonElement parent, string name)
    {
        if (!parent.TryGetProperty(name, out var el)) return null;
        if (el.ValueKind == JsonValueKind.String && DateTimeOffset.TryParse(el.GetString(), CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var dto))
            return dto;
        return null;
    }
}
