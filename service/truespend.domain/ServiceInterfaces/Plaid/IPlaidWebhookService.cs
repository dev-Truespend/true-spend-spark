using TrueSpend.Domain.Models.Plaid;

namespace TrueSpend.Domain.ServiceInterfaces.Plaid;

public interface IPlaidWebhookService
{
    Task<bool> WebhookEventExistsAsync(string plaidEventId, CancellationToken cancellationToken);

    Task<int> RecordWebhookEventAsync(PlaidWebhookInput input, int? plaidItemId, Guid? userId, CancellationToken cancellationToken);

    Task MarkWebhookProcessedAsync(int webhookEventId, string? processingError, CancellationToken cancellationToken);

    Task<PlaidItemReference?> ResolveItemAsync(string plaidItemExternalId, CancellationToken cancellationToken);

    Task<short?> GetItemStatusIdAsync(string statusCode, CancellationToken cancellationToken);

    Task UpdateItemStatusAsync(int plaidItemId, short statusId, string? lastError, CancellationToken cancellationToken);
}
