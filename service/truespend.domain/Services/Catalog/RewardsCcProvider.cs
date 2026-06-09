using System.Net.Http.Json;
using Microsoft.Extensions.Options;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Catalog;

namespace TrueSpend.Domain.Services.Catalog;

public sealed class RewardsCcProviderOptions
{
    public string BaseUrl { get; set; } = string.Empty;
    public string ApiKey { get; set; } = string.Empty;
    public string Host { get; set; } = string.Empty;
}

public sealed class RewardsCcProvider(HttpClient httpClient, IOptions<RewardsCcProviderOptions> optionsAccessor) : IRewardsCcProvider
{
    private const string ProviderName = "rewardsCc";
    // BASIC RapidAPI plan throttles at ~1 req/sec. Sleep a hair over that after each call.
    private static readonly TimeSpan RateLimitDelay = TimeSpan.FromMilliseconds(1100);
    private readonly RewardsCcProviderOptions _options = optionsAccessor.Value;

    public async Task<IReadOnlyList<RapidApiSearchResult>> SearchCardByNameAsync(string cardName, CancellationToken cancellationToken)
    {
        EnsureConfigured();
        try
        {
            var response = await httpClient.GetFromJsonAsync<IReadOnlyList<RapidApiSearchResult>>(
                $"/creditcard-detail-namesearch/{Uri.EscapeDataString(cardName)}",
                cancellationToken);
            await Task.Delay(RateLimitDelay, cancellationToken);
            return response ?? Array.Empty<RapidApiSearchResult>();
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            throw new ExternalProviderAppException(ProviderName, $"RewardsCC search-by-name request failed for '{cardName}'.", ex);
        }
    }

    public async Task<IReadOnlyList<RapidApiSearchResult>> ListAllCardsAsync(CancellationToken cancellationToken)
    {
        EnsureConfigured();
        try
        {
            // RapidAPI "Reward Credit Cards" card-list endpoint: lightweight {cardKey, cardIssuer, cardName} rows.
            var response = await httpClient.GetFromJsonAsync<IReadOnlyList<RapidApiSearchResult>>(
                "/creditcard-card-list",
                cancellationToken);
            await Task.Delay(RateLimitDelay, cancellationToken);
            return response ?? Array.Empty<RapidApiSearchResult>();
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            throw new ExternalProviderAppException(ProviderName, "RewardsCC list-all-cards request failed.", ex);
        }
    }

    public async Task<RapidApiCardDetail?> GetCardDetailAsync(string cardKey, CancellationToken cancellationToken)
    {
        EnsureConfigured();
        try
        {
            var response = await httpClient.GetFromJsonAsync<IReadOnlyList<RapidApiCardDetail>>(
                $"/creditcard-detail-bycard/{Uri.EscapeDataString(cardKey)}",
                cancellationToken);
            await Task.Delay(RateLimitDelay, cancellationToken);
            return response is { Count: > 0 } ? response[0] : null;
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            throw new ExternalProviderAppException(ProviderName, $"RewardsCC card-detail request failed for '{cardKey}'.", ex);
        }
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_options.BaseUrl) || string.IsNullOrWhiteSpace(_options.ApiKey) || string.IsNullOrWhiteSpace(_options.Host))
            throw new ExternalProviderAppException(ProviderName, "RewardsCC provider is not configured (BaseUrl/ApiKey/Host missing).");
    }
}
