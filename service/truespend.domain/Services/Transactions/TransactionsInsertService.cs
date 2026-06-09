using TrueSpend.Domain.Models.Transactions;
using TrueSpend.Domain.ServiceInterfaces.Transactions;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Plaid;
using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Entities.Finance;
using TrueSpend.Domain.Constants;

namespace TrueSpend.Domain.Services.Transactions;

public sealed class TransactionsInsertService(TrueSpendDbContext db) : ITransactionsInsertService
{
    private const string DefaultRewardCurrencyCode = "cash_back";

    private async Task<short?> GetDefaultRewardCurrencyIdAsync(CancellationToken cancellationToken) =>
        await db.RewardCurrencies.AsNoTracking()
            .Where(c => c.Code == DefaultRewardCurrencyCode)
            .Select(c => (short?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<int> InsertTransactionAsync(
        OnboardingWorkflowUser user,
        CreateTransactionRequest request,
        int? merchantId,
        short? categoryId,
        CancellationToken cancellationToken)
    {
        var entity = new TransactionEntity
        {
            UserId = user.UserId,
            Source = TransactionsConstants.SourceManual,
            UserCardId = request.CardId,
            MerchantId = merchantId,
            CategoryId = categoryId,
            Amount = request.Amount,
            TransactionDate = request.TransactionDate,
            TransactionTime = request.TransactionTime,
            IsPending = false,
            Description = request.MerchantName,
            LocationLabel = request.LocationLabel,
            LocationLat = request.LocationLat,
            LocationLng = request.LocationLng,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        db.Transactions.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }

    public async Task InsertRewardResultAsync(
        int transactionId,
        TransactionRewardResult result,
        CancellationToken cancellationToken)
    {
        var currencyId = await GetDefaultRewardCurrencyIdAsync(cancellationToken);
        db.TransactionRewardResults.Add(new TransactionRewardResultEntity
        {
            TransactionId = transactionId,
            EarnedRate = result.EarnedRate,
            EarnedAmount = result.EarnedAmount,
            RewardCurrencyId = currencyId,
            RuleAppliedId = result.RuleAppliedId,
            ComputedAt = DateTimeOffset.UtcNow,
            CreatedAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<int> InsertMissedRewardAsync(
        int transactionId,
        int betterCardId,
        decimal actualAmount,
        decimal potentialAmount,
        decimal missedAmount,
        CancellationToken cancellationToken)
    {
        var entity = new MissedRewardEventEntity
        {
            TransactionId = transactionId,
            BetterUserCardId = betterCardId,
            ActualRewardAmount = actualAmount,
            PotentialRewardAmount = potentialAmount,
            MissedAmount = missedAmount,
            IsDismissed = false,
            DetectedAt = DateTimeOffset.UtcNow,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        db.MissedRewardEvents.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }

    public async Task<PlaidTransactionUpsertResult?> UpsertPlaidTransactionAsync(
        OnboardingWorkflowUser user,
        int connectionId,
        PlaidTransactionData transaction,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;

        var account = await db.PlaidAccounts.AsNoTracking()
            .Where(a => a.PlaidItemId == connectionId && a.PlaidAccountId == transaction.PlaidAccountId)
            .Select(a => new { a.Id })
            .FirstOrDefaultAsync(cancellationToken);
        if (account is null) return null;

        var userCardId = await db.UserCards.AsNoTracking()
            .Where(c => c.PlaidAccountId == account.Id && c.UserId == user.UserId && c.IsActive)
            .Select(c => c.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (userCardId == 0) return null;

        var existing = await db.Transactions.AsNoTracking()
            .Where(t => t.PlaidTransactionId == transaction.PlaidTransactionId)
            .Select(t => new { t.Id })
            .FirstOrDefaultAsync(cancellationToken);

        var transactionCategoryId = await ResolveTransactionCategoryIdAsync(
            transaction.PlaidDetailedCategory,
            transaction.PlaidPrimaryCategory,
            cancellationToken);

        // Bridge the Plaid leaf to a RewardsCC catalog category so reward calc can apply category
        // bonuses. Unbridged leaf -> null category -> base reward rate (safe fallback).
        var (categoryId, categoryCode) = await ResolveBridgedCategoryAsync(transactionCategoryId, cancellationToken);

        if (existing is null)
        {
            var entity = new TransactionEntity
            {
                UserId = user.UserId,
                Source = TransactionsConstants.SourcePlaid,
                PlaidTransactionId = transaction.PlaidTransactionId,
                PlaidAccountId = account.Id,
                UserCardId = userCardId,
                CategoryId = categoryId,
                TransactionCategoryId = transactionCategoryId,
                PlaidConfidenceLevel = transaction.PlaidConfidenceLevel,
                Amount = transaction.Amount,
                TransactionDate = transaction.Date,
                IsPending = transaction.IsPending,
                Description = transaction.MerchantName ?? transaction.Description,
                CreatedAt = now,
                UpdatedAt = now
            };
            db.Transactions.Add(entity);
            await db.SaveChangesAsync(cancellationToken);
            return new PlaidTransactionUpsertResult(entity.Id, true, userCardId, transaction.Amount, transaction.Date, categoryCode, transaction.MerchantName);
        }

        await db.Transactions
            .Where(t => t.PlaidTransactionId == transaction.PlaidTransactionId)
            .ExecuteUpdateAsync(s => s
                .SetProperty(t => t.Amount, transaction.Amount)
                .SetProperty(t => t.TransactionDate, transaction.Date)
                .SetProperty(t => t.IsPending, transaction.IsPending)
                .SetProperty(t => t.Description, transaction.MerchantName ?? transaction.Description)
                // CategoryId intentionally NOT updated on modify: preserve any user category override.
                .SetProperty(t => t.TransactionCategoryId, transactionCategoryId)
                .SetProperty(t => t.PlaidConfidenceLevel, transaction.PlaidConfidenceLevel)
                .SetProperty(t => t.UpdatedAt, now),
            cancellationToken);

        return new PlaidTransactionUpsertResult(existing.Id, false, userCardId, transaction.Amount, transaction.Date, categoryCode, transaction.MerchantName);
    }

    private async Task<short?> ResolveTransactionCategoryIdAsync(
        string? detailedCode,
        string? primaryCode,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(detailedCode))
        {
            var detailedId = await db.TransactionCategories.AsNoTracking()
                .Where(c => c.Code == detailedCode && c.IsActive)
                .Select(c => (short?)c.Id)
                .FirstOrDefaultAsync(cancellationToken);
            if (detailedId is not null) return detailedId;
        }
        if (!string.IsNullOrWhiteSpace(primaryCode))
        {
            return await db.TransactionCategories.AsNoTracking()
                .Where(c => c.Code == primaryCode && c.IsActive)
                .Select(c => (short?)c.Id)
                .FirstOrDefaultAsync(cancellationToken);
        }
        return null;
    }

    // Plaid leaf -> bridge -> subcategory_group -> RewardsCC catalog category.
    // Returns (null, null) when the leaf is unbridged or no catalog category carries that
    // subcategory_group — caller falls back to base reward rate.
    private async Task<(short? CategoryId, string? CategoryCode)> ResolveBridgedCategoryAsync(
        short? transactionCategoryId,
        CancellationToken cancellationToken)
    {
        if (transactionCategoryId is null) return (null, null);

        var subcategoryGroup = await db.TransactionCategoryBridges.AsNoTracking()
            .Where(b => b.TransactionCategoryId == transactionCategoryId.Value)
            .Select(b => b.SubcategoryGroup)
            .FirstOrDefaultAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(subcategoryGroup)) return (null, null);

        var category = await db.Categories.AsNoTracking()
            .Where(c => c.SubcategoryGroup == subcategoryGroup && c.IsActive)
            .Select(c => new { c.Id, c.Code })
            .FirstOrDefaultAsync(cancellationToken);
        return category is null ? (null, null) : ((short?)category.Id, category.Code);
    }

    public async Task<PlaidTransactionRemoveResult?> RemovePlaidTransactionAsync(OnboardingWorkflowUser user, string plaidTransactionId, CancellationToken cancellationToken)
    {
        var doomed = await db.Transactions.AsNoTracking()
            .Where(t => t.UserId == user.UserId && t.PlaidTransactionId == plaidTransactionId)
            .Select(t => new { t.Id, t.UserCardId, t.Amount, t.TransactionDate })
            .FirstOrDefaultAsync(cancellationToken);
        if (doomed is null) return null;

        await db.Transactions
            .Where(t => t.UserId == user.UserId && t.PlaidTransactionId == plaidTransactionId)
            .ExecuteDeleteAsync(cancellationToken);

        return new PlaidTransactionRemoveResult(doomed.Id, doomed.UserCardId, doomed.Amount, doomed.TransactionDate);
    }
}
