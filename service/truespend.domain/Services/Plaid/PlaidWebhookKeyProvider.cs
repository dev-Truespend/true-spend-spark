using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Caching.Memory;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Plaid;

namespace TrueSpend.Domain.Services.Plaid;

// Calls Plaid's POST /webhook_verification_key/get to fetch the EC P-256 JWK used to sign
// the Plaid-Verification JWS header. Plaid recommends caching keys for up to 24h, so the
// successful lookups are memoized in IMemoryCache.
public sealed class PlaidWebhookKeyProvider(
    HttpClient httpClient,
    IMemoryCache cache,
    Microsoft.Extensions.Options.IOptions<PlaidProviderOptions> options) : IPlaidWebhookKeyProvider
{
    private static readonly TimeSpan CacheTtl = TimeSpan.FromHours(24);
    private readonly PlaidProviderOptions _options = options.Value;

    public async Task<PlaidWebhookVerificationKey?> GetKeyAsync(string keyId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(keyId)) return null;

        var cacheKey = $"plaid:webhook_key:{keyId}";
        if (cache.TryGetValue(cacheKey, out PlaidWebhookVerificationKey? cached) && cached is not null)
        {
            return cached;
        }

        var baseUrl = ResolveBaseUrl(_options.Environment);
        var requestUri = new Uri(new Uri(baseUrl), "webhook_verification_key/get");
        var payload = new GetKeyRequest(_options.ClientId, _options.Secret, keyId);

        using var response = await httpClient.PostAsJsonAsync(requestUri, payload, cancellationToken);
        if (!response.IsSuccessStatusCode) return null;

        var body = await response.Content.ReadFromJsonAsync<GetKeyResponse>(cancellationToken: cancellationToken);
        if (body?.Key is null) return null;

        var key = new PlaidWebhookVerificationKey(
            body.Key.Kid,
            body.Key.Alg,
            body.Key.Crv,
            body.Key.X,
            body.Key.Y,
            body.Key.ExpiredAt);

        cache.Set(cacheKey, key, CacheTtl);
        return key;
    }

    private static string ResolveBaseUrl(string environment) =>
        environment?.ToLowerInvariant() switch
        {
            "production" => "https://production.plaid.com/",
            "development" => "https://development.plaid.com/",
            _ => "https://sandbox.plaid.com/"
        };

    private sealed record GetKeyRequest(
        [property: JsonPropertyName("client_id")] string ClientId,
        [property: JsonPropertyName("secret")] string Secret,
        [property: JsonPropertyName("key_id")] string KeyId);

    private sealed record GetKeyResponse([property: JsonPropertyName("key")] PlaidJwk? Key);

    private sealed record PlaidJwk(
        [property: JsonPropertyName("kid")] string Kid,
        [property: JsonPropertyName("alg")] string Alg,
        [property: JsonPropertyName("crv")] string Crv,
        [property: JsonPropertyName("x")] string X,
        [property: JsonPropertyName("y")] string Y,
        [property: JsonPropertyName("expired_at")] DateTimeOffset? ExpiredAt);
}
