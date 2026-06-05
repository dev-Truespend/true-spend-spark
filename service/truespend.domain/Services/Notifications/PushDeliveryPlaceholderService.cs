using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Notifications;

namespace TrueSpend.Domain.Services.Notifications;

public sealed class PushDeliveryPlaceholderService : IPushDeliveryService
{
    public Task<PushDeliveryResult> SendAsync(PushDeliveryRequest request, CancellationToken cancellationToken) =>
        Task.FromResult(new PushDeliveryResult(true, $"placeholder-{Guid.NewGuid():N}", null, null));
}
