using TrueSpend.Domain.Models.Notifications;

namespace TrueSpend.Domain.ServiceInterfaces.Notifications;

public interface IPushDeliveryService
{
    Task<PushDeliveryResult> SendAsync(PushDeliveryRequest request, CancellationToken cancellationToken);
}
