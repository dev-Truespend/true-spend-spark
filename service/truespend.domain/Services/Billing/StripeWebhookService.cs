using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.Billing;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.ServiceInterfaces.Billing;

namespace TrueSpend.Domain.Services.Billing;

public sealed class StripeWebhookService(TrueSpendDbContext db) : IStripeWebhookService
{
    public Task<bool> WebhookEventExistsAsync(string stripeEventId, CancellationToken cancellationToken) =>
        db.StripeWebhookEvents.AsNoTracking().AnyAsync(x => x.StripeEventId == stripeEventId, cancellationToken);

    public async Task RecordWebhookEventAsync(StripeWebhookInput input, CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        db.StripeWebhookEvents.Add(new StripeWebhookEventEntity
        {
            StripeEventId = input.StripeEventId,
            EventType = input.EventType,
            Payload = input.RawPayload,
            ReceivedAt = now
        });
        await db.SaveChangesAsync(cancellationToken);
    }
}
