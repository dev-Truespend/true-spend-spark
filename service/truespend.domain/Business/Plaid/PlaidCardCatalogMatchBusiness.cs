using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Catalog;
using TrueSpend.Domain.ServiceInterfaces.Plaid;

namespace TrueSpend.Domain.Business.Plaid;

// Matches a Plaid-linked card to a catalog.card_products row by fuzzy-comparing
// the (institution name, plaid account name) pair against (issuer display name,
// card display name). Used in two places:
//   1. Inline after PlaidInsertBusiness.ExchangePlaidTokenAsync persists a new
//      connection so freshly-linked cards immediately surface their rewards.
//   2. Back-fill pass from the rewards catalog sync orchestration job so cards
//      that were linked before the catalog had data also get matched.
public sealed class PlaidCardCatalogMatchBusiness(
    ICatalogReadService catalogRead,
    IPlaidUpdateService plaidUpdate,
    ILogger<PlaidCardCatalogMatchBusiness> logger) : IPlaidCardCatalogMatchBusiness
{
    public async Task<int?> MatchOneAsync(string institutionName, string accountName, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(institutionName) || string.IsNullOrWhiteSpace(accountName))
            return null;

        var candidates = await catalogRead.GetCardMatchCandidatesAsync(institutionName, cancellationToken);
        return PickBestProductId(candidates, accountName);
    }

    // Pure in-memory ranking — no DB access — so the back-fill loop can reuse one fetched
    // candidate set across many orphan cards from the same institution.
    private static int? PickBestProductId(IReadOnlyList<CatalogCardMatchCandidate> candidates, string accountName)
    {
        if (candidates.Count == 0) return null;

        var accountTokens = Tokenize(accountName);
        if (accountTokens.Length == 0) return null;

        // Score each candidate by the count of account-name tokens its card
        // display_name contains. The best score wins; ties broken by shortest
        // card name (prefer "Travel Rewards" over "Travel Rewards Premier" when
        // both match "Travel Rewards").
        var ranked = candidates
            .Select(c => new
            {
                Candidate = c,
                Score = ScoreTokens(c.CardDisplayName, accountTokens),
                Length = c.CardDisplayName.Length
            })
            .Where(r => r.Score > 0)
            .OrderByDescending(r => r.Score)
            .ThenBy(r => r.Length)
            .ToList();

        if (ranked.Count == 0) return null;
        return ranked[0].Candidate.CardProductId;
    }

    public async Task<PlaidCardCatalogMatchSummary> MatchAllOrphansAsync(DateTimeOffset now, CancellationToken cancellationToken)
    {
        var orphans = await plaidUpdate.GetUnmatchedPlaidUserCardsAsync(cancellationToken);
        if (orphans.Count == 0) return new PlaidCardCatalogMatchSummary(0, 0);

        // Candidate sets are keyed only by institution name, and many orphans share an institution.
        // Fetch each distinct institution's candidates once (the read itself is a full catalog scan)
        // instead of re-querying per orphan — was an N+1 over orphans.
        var candidatesByInstitution = new Dictionary<string, IReadOnlyList<CatalogCardMatchCandidate>>(StringComparer.OrdinalIgnoreCase);

        var matched = 0;
        var skipped = 0;
        foreach (var orphan in orphans)
        {
            if (cancellationToken.IsCancellationRequested) break;

            int? productId = null;
            if (!string.IsNullOrWhiteSpace(orphan.InstitutionName) && !string.IsNullOrWhiteSpace(orphan.AccountName))
            {
                if (!candidatesByInstitution.TryGetValue(orphan.InstitutionName, out var candidates))
                {
                    candidates = await catalogRead.GetCardMatchCandidatesAsync(orphan.InstitutionName, cancellationToken);
                    candidatesByInstitution[orphan.InstitutionName] = candidates;
                }
                productId = PickBestProductId(candidates, orphan.AccountName);
            }

            if (productId is int id)
            {
                await plaidUpdate.SetUserCardProductIdAsync(orphan.UserCardId, id, now, cancellationToken);
                matched++;
            }
            else
            {
                skipped++;
            }
        }

        logger.LogInformation(
            "Plaid card catalog match back-fill: matched {Matched}, skipped {Skipped} of {Total} orphan cards",
            matched, skipped, orphans.Count);

        return new PlaidCardCatalogMatchSummary(matched, skipped);
    }

    private static string[] Tokenize(string value) =>
        value.ToLowerInvariant()
            .Split(new[] { ' ', '-', '.', ',', '\'', '®', '™' }, StringSplitOptions.RemoveEmptyEntries)
            .Where(t => t.Length >= 3 && !StopWords.Contains(t))
            .ToArray();

    private static int ScoreTokens(string candidate, string[] tokens)
    {
        var candidateLower = candidate.ToLowerInvariant();
        return tokens.Count(t => candidateLower.Contains(t));
    }

    // Common tokens that appear on most card names and add noise to scoring.
    private static readonly HashSet<string> StopWords = new(StringComparer.OrdinalIgnoreCase)
    {
        "card", "credit", "the", "and", "for", "with"
    };
}
