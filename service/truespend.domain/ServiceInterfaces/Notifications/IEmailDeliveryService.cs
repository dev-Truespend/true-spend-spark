using TrueSpend.Domain.Models.Notifications;

namespace TrueSpend.Domain.ServiceInterfaces.Notifications;

public interface IEmailDeliveryService
{
    Task<EmailDeliveryResult> SendAsync(EmailDeliveryRequest request, CancellationToken cancellationToken);
}
