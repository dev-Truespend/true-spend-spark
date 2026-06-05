using Microsoft.Extensions.DependencyInjection;
using TrueSpend.Domain.BusinessInterfaces.Messaging;
using TrueSpend.EventConsumer.Dispatchers;

namespace TrueSpend.EventConsumer.Consumers;

public sealed class OutboxPollingConsumer(
    IServiceScopeFactory scopeFactory,
    IEventDispatcher dispatcher,
    ILogger<OutboxPollingConsumer> logger) : BackgroundService
{
    private static readonly TimeSpan IdleDelay = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan ErrorDelay = TimeSpan.FromSeconds(15);
    private const int FanOutBatchSize = 50;
    private const int DeliveryBatchSize = 50;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Outbox polling consumer started.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                int fannedOut;
                int processed;
                using (var scope = scopeFactory.CreateScope())
                {
                    var business = scope.ServiceProvider.GetRequiredService<IOutboxDispatchBusiness>();
                    fannedOut = await business.FanOutQueuedEventsAsync(FanOutBatchSize, stoppingToken);
                }

                using (var scope = scopeFactory.CreateScope())
                {
                    var business = scope.ServiceProvider.GetRequiredService<IOutboxDispatchBusiness>();
                    processed = await business.ProcessPendingDeliveriesAsync(
                        DeliveryBatchSize,
                        (delivery, ct) => dispatcher.DispatchAsync(delivery.EventType, delivery.ConsumerName, delivery.Payload, ct),
                        stoppingToken);
                }

                if (fannedOut == 0 && processed == 0)
                {
                    await Task.Delay(IdleDelay, stoppingToken);
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Outbox polling iteration failed.");
                await Task.Delay(ErrorDelay, stoppingToken);
            }
        }

        logger.LogInformation("Outbox polling consumer stopped.");
    }
}
