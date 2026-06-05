using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.Finance;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Plaid;

namespace TrueSpend.Domain.Services.Plaid;

public sealed class PlaidWebhookService(TrueSpendDbContext db) : IPlaidWebhookService
{
    public Task<bool> WebhookEventExistsAsync(string plaidEventId, CancellationToken cancellationToken) =>
        db.PlaidWebhookEvents.AsNoTracking()
            .AnyAsync(e => e.PlaidEventId == plaidEventId, cancellationToken);

    public async Task<int> RecordWebhookEventAsync(PlaidWebhookInput input, int? plaidItemId, Guid? userId, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var entity = new PlaidWebhookEventEntity
        {
            PlaidEventId = input.PlaidEventId,
            WebhookType = input.WebhookType,
            WebhookCode = input.WebhookCode,
            PlaidItemId = plaidItemId,
            UserId = userId,
            Payload = input.RawPayload,
            ReceivedAt = now,
            CreatedAt = now
        };
        db.PlaidWebhookEvents.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }

    public async Task MarkWebhookProcessedAsync(int webhookEventId, string? processingError, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        await db.PlaidWebhookEvents
            .Where(e => e.Id == webhookEventId)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(e => e.ProcessedAt, now)
                    .SetProperty(e => e.ProcessingError, processingError),
                cancellationToken);
    }

    public async Task<PlaidItemReference?> ResolveItemAsync(string plaidItemExternalId, CancellationToken cancellationToken)
    {
        var match = await db.PlaidItems.AsNoTracking()
            .Where(i => i.PlaidItemId == plaidItemExternalId)
            .Select(i => new { i.Id, i.UserId })
            .FirstOrDefaultAsync(cancellationToken);
        return match is null ? null : new PlaidItemReference(match.Id, match.UserId);
    }

    public async Task<short?> GetItemStatusIdAsync(string statusCode, CancellationToken cancellationToken)
    {
        var id = await db.PlaidItemStatuses.AsNoTracking()
            .Where(s => s.Code == statusCode)
            .Select(s => s.Id)
            .FirstOrDefaultAsync(cancellationToken);
        return id == 0 ? null : id;
    }

    public async Task UpdateItemStatusAsync(int plaidItemId, short statusId, string? lastError, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        await db.PlaidItems
            .Where(i => i.Id == plaidItemId)
            .ExecuteUpdateAsync(
                setters => setters
                    .SetProperty(i => i.StatusId, statusId)
                    .SetProperty(i => i.LastError, lastError)
                    .SetProperty(i => i.UpdatedAt, now),
                cancellationToken);
    }
}
