using TrueSpend.Api.ViewModels.Common;
using TrueSpend.Api.ViewModels.Notifications;
using TrueSpend.Api.ViewModels.Transactions;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.Models.Transactions;

namespace TrueSpend.Api.Mappers;

public interface INotificationsMapper
{
    NotificationsResponseVm ToResponse(NotificationsResponse domain);
    NotificationDetailResponseVm ToDetail(NotificationDetailResponse domain);
    NotificationRemindersResponseVm ToReminders(NotificationRemindersResponse domain);
    CreateNotificationReminderRequest ToDomain(CreateNotificationReminderRequestVm vm);
}

public sealed class NotificationsMapper : INotificationsMapper
{
    public NotificationsResponseVm ToResponse(NotificationsResponse domain) =>
        new(domain.Notifications.Select(ToVm).ToArray());

    public NotificationDetailResponseVm ToDetail(NotificationDetailResponse domain) =>
        new(ToVm(domain.Notification), ToRelatedTransactionVm(domain.RelatedTransaction), ToMissedRewardVm(domain.RelatedMissedReward));

    public NotificationRemindersResponseVm ToReminders(NotificationRemindersResponse domain) =>
        new(domain.Reminders.Select(ToReminderVm).ToArray());

    public CreateNotificationReminderRequest ToDomain(CreateNotificationReminderRequestVm vm) =>
        new(vm.SourceNotificationId, vm.RemindAt, vm.Title, vm.Body);

    private static NotificationVm ToVm(Notification n) =>
        new(n.Id, n.TypeCode, n.Title, n.Body, n.IsRead, n.CreatedAt, n.RelatedTransactionId, n.RelatedMissedRewardEventId);

    private static NotificationReminderVm ToReminderVm(NotificationReminder r) =>
        new(r.Id, r.SourceNotificationId, r.RemindAt, r.Title, r.Body, r.IsFired, r.CreatedAt);

    private static RelatedTransactionVm? ToRelatedTransactionVm(TransactionDetail? t)
    {
        if (t is null) return null;
        return new RelatedTransactionVm(
            t.Id,
            t.MerchantName,
            t.TransactionDate.ToString("yyyy-MM-dd"),
            t.Amount,
            t.CurrencyCode);
    }

    private static MissedRewardVm? ToMissedRewardVm(MissedReward? m)
    {
        if (m is null) return null;
        return new MissedRewardVm
        {
            Id = m.Id,
            TransactionId = m.TransactionId,
            MerchantName = m.MerchantName,
            ActualCard = ToCardSummaryVm(m.ActualCard),
            BetterCard = ToCardSummaryVm(m.BetterCard),
            ActualReward = new MoneyVm(m.ActualRewardAmount, "points", $"{m.ActualRewardAmount:F0} pts"),
            PotentialReward = new MoneyVm(m.PotentialRewardAmount, "points", $"{m.PotentialRewardAmount:F0} pts"),
            MissedReward = new MoneyVm(m.MissedAmount, "points", $"{m.MissedAmount:F0} pts"),
            IsDismissed = m.IsDismissed
        };
    }

    private static CardSummaryVm ToCardSummaryVm(CardSummary c) =>
        new(c.Id, c.DisplayName, c.IssuerName, c.LastFour, c.Source, c.IsPrimary, c.SyncStatus, c.CardArtUrl);
}
