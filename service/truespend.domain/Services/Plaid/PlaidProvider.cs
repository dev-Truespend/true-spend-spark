using Going.Plaid;
using Going.Plaid.Item;
using Going.Plaid.Accounts;
using Going.Plaid.Transactions;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using TrueSpend.Domain.Models.Onboarding;
using Going.Plaid.Entity;
using Microsoft.Extensions.Options;
using TrueSpend.Domain.Exceptions;
using Going.Plaid.Link;

namespace TrueSpend.Domain.Services.Plaid;

public sealed class PlaidProviderOptions
{
    public string ClientId { get; set; } = string.Empty;
    public string Secret { get; set; } = string.Empty;
    public string Environment { get; set; } = "sandbox";
    public string ClientName { get; set; } = "TrueSpend";
    public string[] CountryCodes { get; set; } = new[] { "US" };
    public string Language { get; set; } = "en";
    public int TransactionsDaysRequested { get; set; } = 90;
}

public sealed class PlaidProvider(PlaidClient client, IOptions<PlaidProviderOptions> optionsAccessor) : IPlaidProvider
{
    private const string ProviderName = "plaid";

    private readonly PlaidProviderOptions _options = optionsAccessor.Value;

    public async Task<PlaidLinkTokenResponse> CreateLinkTokenAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        try
        {
            var response = await client.LinkTokenCreateAsync(new LinkTokenCreateRequest
            {
                User = new LinkTokenCreateRequestUser { ClientUserId = user.UserId.ToString("N") },
                ClientName = _options.ClientName,
                Products = new[] { Products.Transactions },
                CountryCodes = ParseCountryCodes(_options.CountryCodes),
                Language = Language.English,
                Transactions = new LinkTokenTransactions { DaysRequested = _options.TransactionsDaysRequested }
            });

            if (response.Error is { } error)
            {
                throw new ExternalProviderAppException(ProviderName, $"Plaid link-token error: {error.ErrorMessage ?? error.ErrorCode.ToString()}");
            }

            return new PlaidLinkTokenResponse(response.LinkToken, response.Expiration);
        }
        catch (ExternalProviderAppException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new ExternalProviderAppException(ProviderName, "Plaid link-token request failed.", ex);
        }
    }

    public async Task<PlaidExchangeResult> ExchangePublicTokenAsync(string publicToken, CancellationToken cancellationToken)
    {
        try
        {
            var exchange = await client.ItemPublicTokenExchangeAsync(new ItemPublicTokenExchangeRequest
            {
                PublicToken = publicToken
            });
            if (exchange.Error is { } exchangeError)
            {
                throw new ExternalProviderAppException(ProviderName, $"Plaid exchange error: {exchangeError.ErrorMessage ?? exchangeError.ErrorCode.ToString()}");
            }

            var accounts = await client.AccountsGetAsync(new AccountsGetRequest { AccessToken = exchange.AccessToken });
            if (accounts.Error is { } accountsError)
            {
                throw new ExternalProviderAppException(ProviderName, $"Plaid accounts error: {accountsError.ErrorMessage ?? accountsError.ErrorCode.ToString()}");
            }

            var institutionName = accounts.Item?.InstitutionId is { Length: > 0 } institutionId
                ? await ResolveInstitutionAsync(institutionId, cancellationToken)
                : (Name: "Unknown Institution", LogoUrl: (string?)null);

            var accountInfos = accounts.Accounts
                .Where(a => a.Type == AccountType.Credit)
                .Select(a => new PlaidAccountInfo(
                    a.AccountId,
                    a.Name,
                    a.Subtype?.ToString() ?? "credit",
                    a.Mask))
                .ToList();

            return new PlaidExchangeResult(
                exchange.ItemId,
                exchange.AccessToken,
                accounts.Item?.InstitutionId ?? string.Empty,
                institutionName.Name,
                institutionName.LogoUrl,
                accountInfos);
        }
        catch (ExternalProviderAppException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new ExternalProviderAppException(ProviderName, "Plaid exchange-token request failed.", ex);
        }
    }

    public async Task<PlaidTransactionsSyncResult> SyncTransactionsAsync(string accessToken, string? cursor, bool force, CancellationToken cancellationToken)
    {
        try
        {
            var added = new List<PlaidTransactionData>();
            var modified = new List<PlaidTransactionData>();
            var removed = new List<string>();
            var nextCursor = force ? null : cursor;

            bool hasMore;
            do
            {
                var response = await client.TransactionsSyncAsync(new TransactionsSyncRequest
                {
                    AccessToken = accessToken,
                    Cursor = nextCursor
                });

                if (response.Error is { } error)
                {
                    throw new ExternalProviderAppException(ProviderName, $"Plaid transactions/sync error: {error.ErrorMessage ?? error.ErrorCode.ToString()}");
                }

                foreach (var tx in response.Added ?? [])
                    added.Add(MapTransaction(tx));
                foreach (var tx in response.Modified ?? [])
                    modified.Add(MapTransaction(tx));
                foreach (var tx in response.Removed ?? [])
                    if (!string.IsNullOrEmpty(tx.TransactionId)) removed.Add(tx.TransactionId);

                nextCursor = response.NextCursor;
                hasMore = response.HasMore;
            }
            while (hasMore);

            return new PlaidTransactionsSyncResult(added, modified, removed, nextCursor, DateTimeOffset.UtcNow);
        }
        catch (ExternalProviderAppException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new ExternalProviderAppException(ProviderName, "Plaid transactions/sync request failed.", ex);
        }
    }

    public Task<IReadOnlyList<PlaidInstitutionData>> GetInstitutionsAsync(
        IReadOnlyCollection<string> countryCodes,
        IReadOnlyCollection<string> products,
        int pageSize,
        CancellationToken cancellationToken)
    {
        // Going.Plaid 6.61.1 exposes InstitutionsGetByIdAsync + InstitutionsSearchAsync but does
        // not surface the paginated /institutions/get list endpoint. Until the SDK is upgraded
        // or a raw HTTP call is wired in, the real provider fails closed and we rely on the
        // placeholder for screen 2.2 common-banks grid + admin/dev environments.
        throw new ExternalProviderAppException(
            ProviderName,
            "Paginated /institutions/get is not supported by Going.Plaid 6.61.1; upgrade the SDK or implement a raw HTTP call to populate finance.plaid_institutions.");
    }

    private static PlaidTransactionData MapTransaction(Transaction tx) =>
        new(tx.TransactionId,
            tx.AccountId,
            tx.MerchantName,
            (decimal)tx.Amount,
            tx.Date ?? DateOnly.FromDateTime(DateTime.UtcNow),
            tx.Pending ?? false,
            tx.OriginalDescription,
            tx.PersonalFinanceCategory?.Primary,
            tx.PersonalFinanceCategory?.Detailed,
            tx.PersonalFinanceCategory?.ConfidenceLevel);

    private async Task<(string Name, string? LogoUrl)> ResolveInstitutionAsync(string institutionId, CancellationToken cancellationToken)
    {
        try
        {
            var response = await client.InstitutionsGetByIdAsync(new Going.Plaid.Institutions.InstitutionsGetByIdRequest
            {
                InstitutionId = institutionId,
                CountryCodes = ParseCountryCodes(_options.CountryCodes)
            });
            if (response.Error is not null || response.Institution is null)
            {
                return ("Unknown Institution", null);
            }
            return (response.Institution.Name, response.Institution.Logo);
        }
        catch
        {
            return ("Unknown Institution", null);
        }
    }

    private static CountryCode[] ParseCountryCodes(string[] codes) =>
        codes.Select(c => Enum.TryParse<CountryCode>(c, ignoreCase: true, out var parsed) ? parsed : CountryCode.Us).ToArray();
}
