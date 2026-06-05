using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Notifications;

namespace TrueSpend.Domain.Services.Notifications;

public sealed class EmailDeliveryPlaceholderService : IEmailDeliveryService
{
    public Task<EmailDeliveryResult> SendAsync(EmailDeliveryRequest request, CancellationToken cancellationToken) =>
        Task.FromResult(new EmailDeliveryResult(true, $"placeholder.{Guid.NewGuid():N}", null, null));
}
