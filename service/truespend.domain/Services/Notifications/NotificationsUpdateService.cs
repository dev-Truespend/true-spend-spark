using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using Microsoft.EntityFrameworkCore;

namespace TrueSpend.Domain.Services.Notifications;

public sealed class NotificationsUpdateService(TrueSpendDbContext db) : INotificationsUpdateService
{
    public async Task MarkReadAsync(
        OnboardingWorkflowUser user,
        int notificationId,
        CancellationToken cancellationToken)
    {
        var entity = await db.Notifications
            .FirstOrDefaultAsync(x => x.UserId == user.UserId && x.Id == notificationId, cancellationToken);

        if (entity is null || entity.IsRead) return;

        var now = DateTimeOffset.UtcNow;
        entity.IsRead = true;
        entity.ReadAt = now;
        entity.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);
    }

    public async Task MarkAllReadAsync(
        OnboardingWorkflowUser user,
        CancellationToken cancellationToken)
    {
        var unread = await db.Notifications
            .Where(x => x.UserId == user.UserId && !x.IsRead)
            .ToListAsync(cancellationToken);

        if (unread.Count == 0) return;

        var now = DateTimeOffset.UtcNow;
        foreach (var n in unread)
        {
            n.IsRead = true;
            n.ReadAt = now;
            n.UpdatedAt = now;
        }
        await db.SaveChangesAsync(cancellationToken);
    }
}
