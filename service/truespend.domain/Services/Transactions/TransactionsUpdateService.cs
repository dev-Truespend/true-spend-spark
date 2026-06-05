using TrueSpend.Domain.Models.Transactions;
using TrueSpend.Domain.ServiceInterfaces.Transactions;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Entities.Finance;

namespace TrueSpend.Domain.Services.Transactions;

public sealed class TransactionsUpdateService(TrueSpendDbContext db) : ITransactionsUpdateService
{
    private const string DefaultRewardCurrencyCode = "cash_back";

    private async Task<short?> GetDefaultRewardCurrencyIdAsync(CancellationToken cancellationToken) =>
        await db.RewardCurrencies.AsNoTracking()
            .Where(c => c.Code == DefaultRewardCurrencyCode)
            .Select(c => (short?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);

    public async Task UpdateTransactionAsync(
        OnboardingWorkflowUser user,
        int transactionId,
        UpdateTransactionRequest request,
        short? categoryId,
        CancellationToken cancellationToken)
    {
        var entity = await db.Transactions
            .FirstOrDefaultAsync(x => x.Id == transactionId && x.UserId == user.UserId, cancellationToken);
        if (entity is null) return;

        if (request.MerchantName is not null)
        {
            entity.Description = request.MerchantName;
            entity.MerchantId = await ResolveMerchantIdByNameAsync(request.MerchantName, cancellationToken);
        }
        if (request.Amount.HasValue) entity.Amount = request.Amount.Value;
        if (request.CardId.HasValue) entity.UserCardId = request.CardId.Value;
        if (categoryId.HasValue) entity.CategoryId = categoryId;
        if (request.TransactionDate.HasValue) entity.TransactionDate = request.TransactionDate.Value;
        if (request.TransactionTime.HasValue) entity.TransactionTime = request.TransactionTime.Value;
        if (request.LocationLabel is not null) entity.LocationLabel = request.LocationLabel;
        if (request.LocationLat.HasValue) entity.LocationLat = request.LocationLat;
        if (request.LocationLng.HasValue) entity.LocationLng = request.LocationLng;
        entity.UpdatedAt = DateTimeOffset.UtcNow;

        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<int?> GetMissedRewardTransactionIdAsync(int missedRewardId, CancellationToken cancellationToken)
    {
        return await db.MissedRewardEvents.AsNoTracking()
            .Where(x => x.Id == missedRewardId)
            .Select(x => (int?)x.TransactionId)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<int?> ResolveMerchantIdByNameAsync(string merchantName, CancellationToken cancellationToken)
    {
        var normalized = merchantName.Trim().ToLowerInvariant();
        if (string.IsNullOrEmpty(normalized)) return null;

        return await db.Merchants.AsNoTracking()
            .Where(m => m.NormalizedName == normalized)
            .Select(m => (int?)m.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task UpsertRewardResultAsync(
        int transactionId,
        TransactionRewardResult result,
        CancellationToken cancellationToken)
    {
        var existing = await db.TransactionRewardResults
            .FirstOrDefaultAsync(x => x.TransactionId == transactionId, cancellationToken);

        if (existing is null)
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
        }
        else
        {
            existing.EarnedRate = result.EarnedRate;
            existing.EarnedAmount = result.EarnedAmount;
            existing.RuleAppliedId = result.RuleAppliedId;
            existing.ComputedAt = DateTimeOffset.UtcNow;
        }

        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task<MissedRewardUpsertResult> UpsertMissedRewardAsync(
        int transactionId,
        int betterCardId,
        decimal actualAmount,
        decimal potentialAmount,
        decimal missedAmount,
        CancellationToken cancellationToken)
    {
        var existing = await db.MissedRewardEvents
            .FirstOrDefaultAsync(x => x.TransactionId == transactionId, cancellationToken);

        bool isNew;
        MissedRewardEventEntity tracked;
        if (existing is null)
        {
            tracked = new MissedRewardEventEntity
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
            db.MissedRewardEvents.Add(tracked);
            isNew = true;
        }
        else
        {
            existing.BetterUserCardId = betterCardId;
            existing.ActualRewardAmount = actualAmount;
            existing.PotentialRewardAmount = potentialAmount;
            existing.MissedAmount = missedAmount;
            existing.IsDismissed = false;
            existing.UpdatedAt = DateTimeOffset.UtcNow;
            tracked = existing;
            isNew = false;
        }

        await db.SaveChangesAsync(cancellationToken);
        return new MissedRewardUpsertResult(tracked.Id, isNew);
    }

    public async Task DeleteMissedRewardAsync(int transactionId, CancellationToken cancellationToken)
    {
        var existing = await db.MissedRewardEvents
            .FirstOrDefaultAsync(x => x.TransactionId == transactionId, cancellationToken);
        if (existing is not null)
        {
            db.MissedRewardEvents.Remove(existing);
            await db.SaveChangesAsync(cancellationToken);
        }
    }

    public async Task DismissMissedRewardAsync(int missedRewardId, CancellationToken cancellationToken)
    {
        var existing = await db.MissedRewardEvents
            .FirstOrDefaultAsync(x => x.Id == missedRewardId, cancellationToken);
        if (existing is not null)
        {
            existing.IsDismissed = true;
            existing.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
        }
    }
}
