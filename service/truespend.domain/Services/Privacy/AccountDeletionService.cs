using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.Privacy;
using TrueSpend.Domain.Models.Privacy;
using TrueSpend.Domain.ServiceInterfaces.Privacy;

namespace TrueSpend.Domain.Services.Privacy;

public sealed class AccountDeletionService(TrueSpendDbContext db) : IAccountDeletionService
{
    public async Task<IReadOnlyList<AccountPurgeCandidate>> GetDuePurgesAsync(DateTimeOffset now, int batchSize, CancellationToken cancellationToken)
    {
        return await db.AccountDeletionRequests
            .AsNoTracking()
            .Where(r => r.Status == AccountDeletionStatusCodes.Pending && r.PurgeAfter <= now)
            .OrderBy(r => r.PurgeAfter)
            .Take(batchSize)
            .Select(r => new AccountPurgeCandidate(r.Id, r.UserId))
            .ToListAsync(cancellationToken);
    }

    public async Task<bool> ReloadIsStillPendingAsync(int requestId, CancellationToken cancellationToken)
    {
        var status = await db.AccountDeletionRequests
            .AsNoTracking()
            .Where(r => r.Id == requestId)
            .Select(r => r.Status)
            .FirstOrDefaultAsync(cancellationToken);
        return string.Equals(status, AccountDeletionStatusCodes.Pending, StringComparison.Ordinal);
    }

    public async Task PurgeUserDataAsync(Guid userId, CancellationToken cancellationToken)
    {
        // Hard delete user-owned rows across schemas. Order matters where FKs exist; most are
        // ON DELETE CASCADE off auth.users so the Supabase admin delete will sweep them too,
        // but we run our own pass first for app-owned rows that are not cascaded by Supabase.
        await db.MerchantVisits.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Recommendations.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.LocationEvents.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Transactions.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.UserCards.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.PlaidItems.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Notifications.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.NotificationReminders.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.NotificationPreferences.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.NotificationTypePreferences.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Devices.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.AIInsights.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.InsightGenerationRuns.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.AnalyticsSnapshots.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Subscriptions.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.PaymentMethods.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.StripeCustomers.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.PrivacySettings.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.OnboardingStates.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.UserPermissions.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.UserDevicePermissions.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.UserPreferences.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.UserRoles.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
        await db.Profiles.Where(x => x.UserId == userId).ExecuteDeleteAsync(cancellationToken);
    }

    public async Task MarkRequestStatusAsync(int requestId, string status, string? error, DateTimeOffset now, CancellationToken cancellationToken)
    {
        var entity = await db.AccountDeletionRequests.FirstOrDefaultAsync(r => r.Id == requestId, cancellationToken);
        if (entity is null) return;
        entity.Status = status;
        entity.LastError = error;
        if (status == AccountDeletionStatusCodes.Completed) entity.CompletedAt = now;
        if (status == AccountDeletionStatusCodes.Cancelled) entity.CancelledAt = now;
        entity.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task WriteAuditEventAsync(Guid? userId, string eventType, string? payloadJson, DateTimeOffset now, CancellationToken cancellationToken)
    {
        db.PrivacyAuditEvents.Add(new PrivacyAuditEventEntity
        {
            UserId = userId,
            EventType = eventType,
            Payload = payloadJson,
            OccurredAt = now,
            CreatedAt = now,
        });
        await db.SaveChangesAsync(cancellationToken);
    }
}
