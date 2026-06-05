using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.Storage;
using TrueSpend.Domain.ServiceInterfaces.Storage;

namespace TrueSpend.Domain.Services.Storage;

public sealed class SupabaseStorageOptions
{
    public string Url { get; set; } = string.Empty;
    public string ServiceRoleKey { get; set; } = string.Empty;
    public string PublicBaseUrl { get; set; } = string.Empty;
}

public sealed class SupabaseStorageProvider(HttpClient httpClient, IOptions<SupabaseStorageOptions> options) : IStorageProvider
{
    private readonly SupabaseStorageOptions _options = options.Value;

    public async Task<string> UploadAsync(UploadObjectRequest request, CancellationToken cancellationToken)
    {
        var url = $"{_options.Url.TrimEnd('/')}/storage/v1/object/{request.Bucket}/{request.ObjectKey}";

        using var http = new HttpRequestMessage(HttpMethod.Put, url);
        http.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ServiceRoleKey);
        http.Headers.TryAddWithoutValidation("x-upsert", "true");

        var content = new StreamContent(request.Content);
        content.Headers.ContentType = MediaTypeHeaderValue.Parse(request.ContentType);
        if (request.Length > 0) content.Headers.ContentLength = request.Length;
        http.Content = content;

        using var response = await httpClient.SendAsync(http, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var body = await response.Content.ReadAsStringAsync(cancellationToken);
            throw new ExternalProviderAppException("supabase_storage", $"Supabase storage upload failed ({(int)response.StatusCode}): {body}");
        }

        var publicBase = string.IsNullOrWhiteSpace(_options.PublicBaseUrl)
            ? $"{_options.Url.TrimEnd('/')}/storage/v1/object/public"
            : _options.PublicBaseUrl.TrimEnd('/');

        return $"{publicBase}/{request.Bucket}/{request.ObjectKey}";
    }
}
