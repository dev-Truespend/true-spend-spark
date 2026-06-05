using System.Net.Http.Headers;
using Microsoft.Extensions.Options;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.ServiceInterfaces.Privacy;

namespace TrueSpend.Domain.Services.Privacy;

public sealed class SupabaseAdminProviderOptions
{
    public string Url { get; set; } = string.Empty;
    public string ServiceRoleKey { get; set; } = string.Empty;
}

public sealed class SupabaseAdminProvider(HttpClient httpClient, IOptions<SupabaseAdminProviderOptions> optionsAccessor) : ISupabaseAdminProvider
{
    private const string ProviderName = "supabaseAdmin";
    private readonly SupabaseAdminProviderOptions _options = optionsAccessor.Value;

    public async Task DeleteAuthUserAsync(Guid userId, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(_options.Url) || string.IsNullOrWhiteSpace(_options.ServiceRoleKey))
            throw new ExternalProviderAppException(ProviderName, "Supabase admin provider is not configured (Url/ServiceRoleKey missing).");

        var url = new Uri(new Uri(_options.Url.TrimEnd('/') + "/"), $"auth/v1/admin/users/{userId:D}");
        using var request = new HttpRequestMessage(HttpMethod.Delete, url);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _options.ServiceRoleKey);
        request.Headers.Add("apikey", _options.ServiceRoleKey);

        try
        {
            using var response = await httpClient.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync(cancellationToken);
                throw new ExternalProviderAppException(ProviderName, $"Supabase admin DELETE auth user returned {(int)response.StatusCode}: {body}");
            }
        }
        catch (ExternalProviderAppException)
        {
            throw;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            throw new ExternalProviderAppException(ProviderName, "Supabase admin DELETE auth user failed.", ex);
        }
    }
}
