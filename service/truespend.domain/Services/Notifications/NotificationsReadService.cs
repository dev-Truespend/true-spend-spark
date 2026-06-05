using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.Models.Transactions;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Constants;

namespace TrueSpend.Domain.Services.Notifications;

public sealed class NotificationsReadService(TrueSpendDbContext db) : INotificationsReadService
{
    private static readonly HashSet<string> ValidFilters =
    [
        NotificationsConstants.FilterAll,
        NotificationsConstants.FilterUnread,
        NotificationsConstants.FilterRewards,
        NotificationsConstants.FilterSecurity
    ];

    public async Task<IReadOnlyList<Notification>> GetNotificationsAsync(
        OnboardingWorkflowUser user,
        string filter,
        CancellationToken cancellationToken)
    {
        var safeFilter = ValidFilters.Contains(filter) ? filter : NotificationsConstants.FilterAll;

        var q = from n in db.Notifications.AsNoTracking()
                    .Where(x => x.UserId == user.UserId)
                join nt in db.NotificationTypes.AsNoTracking() on n.NotificationTypeId equals nt.Id
                select new { n, nt };

        q = safeFilter switch
        {
            NotificationsConstants.FilterUnread => q.Where(x => !x.n.IsRead),
            NotificationsConstants.FilterRewards => q.Where(x =>
                x.nt.Code == NotificationsConstants.MissedRewardsTypeCode
                || x.nt.Code == NotificationsConstants.BestCardAlertTypeCode
                || x.nt.Code == NotificationsConstants.WeeklySummaryTypeCode),
            NotificationsConstants.FilterSecurity => q.Where(x =>
                x.nt.Code == NotificationsConstants.UnusualTransactionTypeCode
                || x.nt.Code == NotificationsConstants.SystemTypeCode),
            _ => q
        };

        var rows = await q.OrderByDescending(x => x.n.CreatedAt).ToListAsync(cancellationToken);

        return rows.Select(x => new Notification
        {
            Id = x.n.Id,
            TypeCode = x.nt.Code,
            Title = x.n.Title,
            Body = x.n.Body,
            IsRead = x.n.IsRead,
            CreatedAt = x.n.CreatedAt,
            RelatedTransactionId = x.n.RelatedTransactionId,
            RelatedMissedRewardEventId = x.n.RelatedMissedRewardEventId
        }).ToList();
    }

    public async Task<NotificationDetail?> GetNotificationDetailAsync(
        OnboardingWorkflowUser user,
        int notificationId,
        CancellationToken cancellationToken)
    {
        var row = await (from n in db.Notifications.AsNoTracking()
                             .Where(x => x.UserId == user.UserId && x.Id == notificationId)
                         join nt in db.NotificationTypes.AsNoTracking() on n.NotificationTypeId equals nt.Id
                         select new { n, nt }).FirstOrDefaultAsync(cancellationToken);

        if (row is null) return null;

        var notification = new Notification
        {
            Id = row.n.Id,
            TypeCode = row.nt.Code,
            Title = row.n.Title,
            Body = row.n.Body,
            IsRead = row.n.IsRead,
            CreatedAt = row.n.CreatedAt,
            RelatedTransactionId = row.n.RelatedTransactionId,
            RelatedMissedRewardEventId = row.n.RelatedMissedRewardEventId
        };

        TransactionDetail? relatedTransaction = null;
        if (row.n.RelatedTransactionId.HasValue)
            relatedTransaction = await GetTransactionDetailAsync(row.n.RelatedTransactionId.Value, cancellationToken);

        MissedReward? relatedMissedReward = null;
        if (row.n.RelatedMissedRewardEventId.HasValue)
            relatedMissedReward = await GetMissedRewardAsync(row.n.RelatedMissedRewardEventId.Value, cancellationToken);

        return new NotificationDetail
        {
            Notification = notification,
            RelatedTransaction = relatedTransaction,
            RelatedMissedReward = relatedMissedReward
        };
    }

    public async Task<IReadOnlyList<NotificationReminder>> GetRemindersAsync(
        OnboardingWorkflowUser user,
        CancellationToken cancellationToken)
    {
        var rows = await db.NotificationReminders.AsNoTracking()
            .Where(x => x.UserId == user.UserId && !x.IsFired)
            .OrderBy(x => x.RemindAt)
            .ToListAsync(cancellationToken);

        return rows.Select(x => new NotificationReminder
        {
            Id = x.Id,
            UserId = x.UserId,
            SourceNotificationId = x.SourceNotificationId,
            RemindAt = x.RemindAt,
            Title = x.Title,
            Body = x.Body,
            IsFired = x.IsFired,
            CreatedAt = x.CreatedAt
        }).ToList();
    }

    private async Task<TransactionDetail?> GetTransactionDetailAsync(int transactionId, CancellationToken cancellationToken)
    {
        var row = await (from tx in db.Transactions.AsNoTracking().Where(x => x.Id == transactionId)
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
                         }).FirstOrDefaultAsync(cancellationToken);

        if (row is null) return null;

        return new TransactionDetail(
            row.Id, row.MerchantName, row.Amount, "USD", row.CardId, row.CardDisplayName,
            row.CategoryCode, row.CategoryName, row.TransactionDate, row.TransactionTime,
            row.LocationLabel, row.LocationLat, row.LocationLng, row.Source, row.IsPending);
    }

    private async Task<MissedReward?> GetMissedRewardAsync(int missedRewardEventId, CancellationToken cancellationToken)
    {
        var row = await (from mre in db.MissedRewardEvents.AsNoTracking().Where(x => x.Id == missedRewardEventId)
                         join tx in db.Transactions.AsNoTracking() on mre.TransactionId equals tx.Id
                         join ac in db.UserCards.AsNoTracking() on tx.UserCardId equals ac.Id into acJoin
                         from actualCard in acJoin.DefaultIfEmpty()
                         join ap in db.CardProducts.AsNoTracking() on actualCard.CardProductId equals ap.Id into apJoin
                         from actualProduct in apJoin.DefaultIfEmpty()
                         join bc in db.UserCards.AsNoTracking() on mre.BetterUserCardId equals bc.Id into bcJoin
                         from betterCard in bcJoin.DefaultIfEmpty()
                         join bp in db.CardProducts.AsNoTracking() on betterCard.CardProductId equals bp.Id into bpJoin
                         from betterProduct in bpJoin.DefaultIfEmpty()
                         join merchant in db.Merchants.AsNoTracking() on tx.MerchantId equals merchant.Id into merchantJoin
                         from merchant in merchantJoin.DefaultIfEmpty()
                         select new
                         {
                             mre.Id,
                             mre.TransactionId,
                             MerchantName = merchant.CanonicalName ?? tx.Description ?? "Unknown",
                             ActualCardId = actualCard.Id,
                             ActualCardName = actualCard.Nickname ?? actualProduct.DisplayName ?? actualCard.CustomCardName ?? "Card",
                             ActualCardLastFour = actualCard.LastFour,
                             BetterCardId = betterCard.Id,
                             BetterCardName = betterCard.Nickname ?? betterProduct.DisplayName ?? betterCard.CustomCardName ?? "Card",
                             BetterCardLastFour = betterCard.LastFour,
                             mre.ActualRewardAmount,
                             mre.PotentialRewardAmount,
                             mre.MissedAmount,
                             mre.IsDismissed
                         }).FirstOrDefaultAsync(cancellationToken);

        if (row is null) return null;

        var actualCardSummary = new CardSummary(row.ActualCardId, row.ActualCardName, string.Empty, row.ActualCardLastFour, "manual", false, "active", null);
        var betterCardSummary = new CardSummary(row.BetterCardId, row.BetterCardName, string.Empty, row.BetterCardLastFour, "manual", false, "active", null);

        return new MissedReward(
            row.Id, row.TransactionId, row.MerchantName, actualCardSummary, betterCardSummary,
            row.ActualRewardAmount, row.PotentialRewardAmount, row.MissedAmount, row.IsDismissed);
    }
}
