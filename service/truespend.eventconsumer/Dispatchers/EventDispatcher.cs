using TrueSpend.Domain.Constants;
using TrueSpend.EventConsumer.Handlers;

namespace TrueSpend.EventConsumer.Dispatchers;

public interface IEventDispatcher
{
    Task DispatchAsync(string eventType, string consumerName, string payloadJson, CancellationToken cancellationToken);
}

public sealed class EventDispatcher(IServiceProvider serviceProvider, ILogger<EventDispatcher> logger) : IEventDispatcher
{
    private static readonly IReadOnlyDictionary<(string EventType, string ConsumerName), Type> Routes =
        new Dictionary<(string, string), Type>
        {
            [(EventTypes.BillingSubscriptionUpdated, MessagingConstants.EntitlementCacheInvalidatorConsumer)] = typeof(SubscriptionUpdatedHandler),
            [(EventTypes.BillingPaymentMethodUpdated, MessagingConstants.BillingPaymentMethodCacheInvalidatorConsumer)] = typeof(PaymentMethodUpdatedHandler),
            [(EventTypes.UserCardCreated, MessagingConstants.UserCardCreatedConsumer)] = typeof(UserCardCreatedHandler),
            [(EventTypes.CardProductRequestCreated, MessagingConstants.CardProductRequestCreatedConsumer)] = typeof(CardProductRequestCreatedHandler),
            [(EventTypes.MerchantVisitCreated, MessagingConstants.MerchantVisitCreatedConsumer)] = typeof(MerchantVisitCreatedHandler),
            [(EventTypes.RewardOverrideUpserted, MessagingConstants.RewardOverrideUpsertedConsumer)] = typeof(RewardOverrideUpsertedHandler),
            [(EventTypes.RewardOverrideDeleted, MessagingConstants.RewardOverrideDeletedConsumer)] = typeof(RewardOverrideDeletedHandler),
            [(EventTypes.PlaidConnectionDisconnected, MessagingConstants.PlaidConnectionDisconnectedConsumer)] = typeof(PlaidConnectionDisconnectedHandler),
            [(EventTypes.MissedRewardEventCreated, MessagingConstants.MissedRewardNotificationProducerConsumer)] = typeof(MissedRewardEventCreatedHandler),
            [(EventTypes.TransactionCreated, MessagingConstants.AnalyticsRecomputeConsumer)] = typeof(AnalyticsRecomputeHandler),
            [(EventTypes.TransactionImported, MessagingConstants.AnalyticsRecomputeConsumer)] = typeof(AnalyticsRecomputeHandler),
            [(EventTypes.TransactionUpdated, MessagingConstants.AnalyticsRecomputeConsumer)] = typeof(AnalyticsRecomputeHandler),
            [(EventTypes.TransactionDeleted, MessagingConstants.AnalyticsRecomputeConsumer)] = typeof(AnalyticsRecomputeHandler),
            [(EventTypes.MissedRewardNotAMiss, MessagingConstants.AnalyticsRecomputeConsumer)] = typeof(AnalyticsRecomputeHandler),
            [(EventTypes.NotificationCreated, MessagingConstants.PushFanOutConsumer)] = typeof(NotificationCreatedHandler),
            [(EventTypes.NotificationCreated, MessagingConstants.InboxCacheInvalidatorConsumer)] = typeof(InboxCacheInvalidatorHandler),
            [(EventTypes.NotificationRead, MessagingConstants.NotificationReadConsumer)] = typeof(NotificationReadHandler),
            [(EventTypes.NotificationsReadAll, MessagingConstants.NotificationsReadAllConsumer)] = typeof(NotificationsReadAllHandler),
            [(EventTypes.AIGenerationCompleted, MessagingConstants.AIInsightsCacheInvalidatorConsumer)] = typeof(AIGenerationCompletedHandler),
            [(EventTypes.PlaidItemStatusChanged, MessagingConstants.PlaidReauthNotificationProducerConsumer)] = typeof(PlaidReauthNotificationHandler),
            [(EventTypes.PlaidItemStatusChanged, MessagingConstants.CardsCacheInvalidatorConsumer)] = typeof(PlaidCardsCacheInvalidatorHandler),
            [(EventTypes.PlaidItemNewAccountsAvailable, MessagingConstants.PlaidNewAccountsNotificationProducerConsumer)] = typeof(PlaidNewAccountsNotificationHandler)
        };

    public async Task DispatchAsync(string eventType, string consumerName, string payloadJson, CancellationToken cancellationToken)
    {
        if (!Routes.TryGetValue((eventType, consumerName), out var handlerType))
        {
            logger.LogWarning("No handler registered for event type {EventType} consumer {ConsumerName}", eventType, consumerName);
            throw new InvalidOperationException($"No handler registered for ({eventType}, {consumerName}).");
        }

        using var scope = serviceProvider.CreateScope();
        var handler = (IEventHandler)scope.ServiceProvider.GetRequiredService(handlerType);
        await handler.HandleAsync(payloadJson, cancellationToken);
    }
}
