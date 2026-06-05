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
}

public sealed class RewardsCcProvider(HttpClient httpClient, IOptions<RewardsCcProviderOptions> optionsAccessor) : IRewardsCcProvider
{
    private const string ProviderName = "rewardsCc";
    private readonly RewardsCcProviderOptions _options = optionsAccessor.Value;

    public async Task<IReadOnlyList<RewardsCcIssuerData>> GetIssuersAsync(CancellationToken cancellationToken)
    {
        EnsureConfigured();
        try
        {
            var response = await httpClient.GetFromJsonAsync<IReadOnlyList<RewardsCcIssuerData>>("/issuers", cancellationToken);
            return response ?? Array.Empty<RewardsCcIssuerData>();
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            throw new ExternalProviderAppException(ProviderName, "RewardsCC /issuers request failed.", ex);
        }
    }

    public async Task<IReadOnlyList<RewardsCcCardProductData>> GetCardProductsAsync(CancellationToken cancellationToken)
    {
        EnsureConfigured();
        try
        {
            var response = await httpClient.GetFromJsonAsync<IReadOnlyList<RewardsCcCardProductData>>("/cards", cancellationToken);
            return response ?? Array.Empty<RewardsCcCardProductData>();
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            throw new ExternalProviderAppException(ProviderName, "RewardsCC /cards request failed.", ex);
        }
    }

    public async Task<IReadOnlyList<RewardsCcRewardRuleData>> GetRewardRulesAsync(string providerCardId, CancellationToken cancellationToken)
    {
        EnsureConfigured();
        try
        {
            var response = await httpClient.GetFromJsonAsync<IReadOnlyList<RewardsCcRewardRuleData>>($"/cards/{Uri.EscapeDataString(providerCardId)}/rewards", cancellationToken);
            return response ?? Array.Empty<RewardsCcRewardRuleData>();
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            throw new ExternalProviderAppException(ProviderName, $"RewardsCC /cards/{providerCardId}/rewards request failed.", ex);
        }
    }

    private void EnsureConfigured()
    {
        if (string.IsNullOrWhiteSpace(_options.BaseUrl) || string.IsNullOrWhiteSpace(_options.ApiKey))
            throw new ExternalProviderAppException(ProviderName, "RewardsCC provider is not configured (BaseUrl/ApiKey missing).");
    }
}
