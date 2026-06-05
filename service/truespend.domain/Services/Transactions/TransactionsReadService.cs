using TrueSpend.Domain.Models.Transactions;
using TrueSpend.Domain.ServiceInterfaces.Transactions;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Models.Cards;

namespace TrueSpend.Domain.Services.Transactions;

public sealed class TransactionsReadService(TrueSpendDbContext db) : ITransactionsReadService
{
    public async Task<IReadOnlyList<Transaction>> GetTransactionsAsync(
        OnboardingWorkflowUser user,
        TransactionListQuery query,
        CancellationToken cancellationToken)
    {
        var q = from tx in db.Transactions.AsNoTracking().Where(x => x.UserId == user.UserId)
                join card in db.UserCards.AsNoTracking() on tx.UserCardId equals card.Id into cardJoin
                from card in cardJoin.DefaultIfEmpty()
                join product in db.CardProducts.AsNoTracking() on card.CardProductId equals product.Id into productJoin
                from product in productJoin.DefaultIfEmpty()
                join issuer in db.CardIssuers.AsNoTracking() on product.IssuerId equals issuer.Id into issuerJoin
                from issuer in issuerJoin.DefaultIfEmpty()
                join cat in db.Categories.AsNoTracking() on tx.CategoryId equals cat.Id into catJoin
                from cat in catJoin.DefaultIfEmpty()
                join reward in db.TransactionRewardResults.AsNoTracking() on tx.Id equals reward.TransactionId into rewardJoin
                from reward in rewardJoin.DefaultIfEmpty()
                join rewardCur in db.RewardCurrencies.AsNoTracking() on reward.RewardCurrencyId equals rewardCur.Id into rewardCurJoin
                from rewardCur in rewardCurJoin.DefaultIfEmpty()
                join missed in db.MissedRewardEvents.AsNoTracking() on tx.Id equals missed.TransactionId into missedJoin
                from missed in missedJoin.DefaultIfEmpty()
                join merchant in db.Merchants.AsNoTracking() on tx.MerchantId equals merchant.Id into merchantJoin
                from merchant in merchantJoin.DefaultIfEmpty()
                select new
                {
                    tx.Id,
                    MerchantName = merchant.CanonicalName ?? tx.Description ?? "Unknown",
                    tx.Amount,
                    CurrencyCode = "USD",
                    CardId = card.Id,
                    CardDisplayName = card.Nickname ?? product.DisplayName ?? card.CustomCardName ?? "Card",
                    CategoryCode = cat.Code,
                    CategoryName = cat.DisplayName,
                    tx.TransactionDate,
                    tx.TransactionTime,
                    tx.LocationLabel,
                    tx.Source,
                    tx.IsPending,
                    SyncStatus = (string?)null,
                    EarnedRewardAmount = (decimal?)reward.EarnedAmount,
                    EarnedRewardCurrency = (string?)rewardCur.Code,
                    MissedRewardAmount = (decimal?)missed.MissedAmount
                };

        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var lower = query.Q.ToLower();
            q = q.Where(x => x.MerchantName.ToLower().Contains(lower));
        }

        if (!string.IsNullOrWhiteSpace(query.CategoryCode))
            q = q.Where(x => x.CategoryCode == query.CategoryCode);

        if (query.CardId.HasValue)
            q = q.Where(x => x.CardId == query.CardId.Value);

        var rows = await q.OrderByDescending(x => x.TransactionDate).ThenByDescending(x => x.Id).ToListAsync(cancellationToken);

        return rows.Select(x => new Transaction(
            x.Id, x.MerchantName, x.Amount, x.CurrencyCode, x.CardId, x.CardDisplayName,
            x.CategoryCode, x.CategoryName, x.TransactionDate, x.TransactionTime,
            x.LocationLabel, x.Source, x.IsPending, x.SyncStatus,
            x.EarnedRewardAmount, x.EarnedRewardCurrency, x.MissedRewardAmount))
            .ToList();
    }

    public async Task<TransactionDetail?> GetTransactionDetailAsync(
        OnboardingWorkflowUser user,
        int transactionId,
        CancellationToken cancellationToken)
    {
        var row = await (from tx in db.Transactions.AsNoTracking()
                             .Where(x => x.UserId == user.UserId && x.Id == transactionId)
                         join card in db.UserCards.AsNoTracking() on tx.UserCardId equals card.Id into cardJoin
                         from card in cardJoin.DefaultIfEmpty()
                         join product in db.CardProducts.AsNoTracking() on card.CardProductId equals product.Id into productJoin
                         from product in productJoin.DefaultIfEmpty()
                         join cat in db.Categories.AsNoTracking() on tx.CategoryId equals cat.Id into catJoin
                         from cat in catJoin.DefaultIfEmpty()
                         join merchant in db.Merchants.AsNoTracking() on tx.MerchantId equals merchant.Id into merchantJoin
                         from merchant in merchantJoin.DefaultIfEmpty()
                         select new
                         {
                             tx.Id,
                             MerchantName = merchant.CanonicalName ?? tx.Description ?? "Unknown",
                             tx.Amount,
                             CardId = card.Id,
                             CardDisplayName = card.Nickname ?? product.DisplayName ?? card.CustomCardName ?? "Card",
                             CategoryCode = cat.Code,
                             CategoryName = cat.DisplayName,
                             tx.TransactionDate,
                             tx.TransactionTime,
                             tx.LocationLabel,
                             tx.LocationLat,
                             tx.LocationLng,
                             tx.Source,
                             tx.IsPending
                         })
                        .FirstOrDefaultAsync(cancellationToken);

        if (row is null) return null;

        return new TransactionDetail(
            row.Id, row.MerchantName, row.Amount, "USD", row.CardId, row.CardDisplayName,
            row.CategoryCode, row.CategoryName, row.TransactionDate, row.TransactionTime,
            row.LocationLabel, row.LocationLat, row.LocationLng, row.Source, row.IsPending);
    }

    public async Task<TransactionRewardResult?> GetRewardResultAsync(int transactionId, CancellationToken cancellationToken)
    {
        var row = await (from r in db.TransactionRewardResults.AsNoTracking().Where(x => x.TransactionId == transactionId)
                         join cur in db.RewardCurrencies.AsNoTracking() on r.RewardCurrencyId equals cur.Id into curJoin
                         from cur in curJoin.DefaultIfEmpty()
                         select new { r.EarnedRate, r.EarnedAmount, CurrencyCode = (string?)cur.Code, r.RuleAppliedId })
                        .FirstOrDefaultAsync(cancellationToken);

        return row is null ? null : new TransactionRewardResult(row.EarnedRate, row.EarnedAmount, row.CurrencyCode, row.RuleAppliedId);
    }

    public async Task<MissedReward?> GetMissedRewardAsync(
        OnboardingWorkflowUser user,
        int transactionId,
        CancellationToken cancellationToken)
    {
        return await BuildMissedRewardQuery(user)
            .Where(x => x.TransactionId == transactionId)
            .Select(x => x.MissedReward)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<IReadOnlyList<MissedReward>> GetMissedRewardsAsync(
        OnboardingWorkflowUser user,
        CancellationToken cancellationToken)
    {
        return await BuildMissedRewardQuery(user)
            .Select(x => x.MissedReward)
            .ToListAsync(cancellationToken);
    }

    private IQueryable<(int TransactionId, MissedReward MissedReward)> BuildMissedRewardQuery(OnboardingWorkflowUser user)
    {
        return from missed in db.MissedRewardEvents.AsNoTracking()
               join tx in db.Transactions.AsNoTracking().Where(x => x.UserId == user.UserId)
                   on missed.TransactionId equals tx.Id
               join merchant in db.Merchants.AsNoTracking() on tx.MerchantId equals merchant.Id into merchantJoin
               from merchant in merchantJoin.DefaultIfEmpty()
               join actualCard in db.UserCards.AsNoTracking() on tx.UserCardId equals actualCard.Id into actualCardJoin
               from actualCard in actualCardJoin.DefaultIfEmpty()
               join actualProduct in db.CardProducts.AsNoTracking() on actualCard.CardProductId equals actualProduct.Id into actualProductJoin
               from actualProduct in actualProductJoin.DefaultIfEmpty()
               join actualIssuer in db.CardIssuers.AsNoTracking() on actualProduct.IssuerId equals actualIssuer.Id into actualIssuerJoin
               from actualIssuer in actualIssuerJoin.DefaultIfEmpty()
               join betterCard in db.UserCards.AsNoTracking() on missed.BetterUserCardId equals betterCard.Id into betterCardJoin
               from betterCard in betterCardJoin.DefaultIfEmpty()
               join betterProduct in db.CardProducts.AsNoTracking() on betterCard.CardProductId equals betterProduct.Id into betterProductJoin
               from betterProduct in betterProductJoin.DefaultIfEmpty()
               join betterIssuer in db.CardIssuers.AsNoTracking() on betterProduct.IssuerId equals betterIssuer.Id into betterIssuerJoin
               from betterIssuer in betterIssuerJoin.DefaultIfEmpty()
               select ValueTuple.Create(
                   missed.TransactionId,
                   new MissedReward(
                       missed.Id,
                       missed.TransactionId,
                       merchant.CanonicalName ?? tx.Description ?? "Unknown",
                       new CardSummary(actualCard.Id, actualCard.Nickname ?? actualProduct.DisplayName ?? "Card",
                           actualIssuer.DisplayName ?? "Unknown", actualCard.LastFour, "manual", actualCard.IsPrimary, actualCard.SyncStatus, actualProduct.CardArtUrl),
                       new CardSummary(betterCard.Id, betterCard.Nickname ?? betterProduct.DisplayName ?? "Card",
                           betterIssuer.DisplayName ?? "Unknown", betterCard.LastFour, "manual", betterCard.IsPrimary, betterCard.SyncStatus, betterProduct.CardArtUrl),
                       missed.ActualRewardAmount,
                       missed.PotentialRewardAmount,
                       missed.MissedAmount,
                       missed.IsDismissed));
    }
}
