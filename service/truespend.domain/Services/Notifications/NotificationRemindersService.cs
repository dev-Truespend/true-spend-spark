using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.ServiceInterfaces.Notifications;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Exceptions;
using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Entities.Messaging;

namespace TrueSpend.Domain.Services.Notifications;

public sealed class NotificationRemindersService(TrueSpendDbContext db) : INotificationRemindersService
{
    public async Task<NotificationReminder> CreateReminderAsync(
        OnboardingWorkflowUser user,
        CreateNotificationReminderRequest request,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var entity = new NotificationReminderEntity
        {
            UserId = user.UserId,
            SourceNotificationId = request.SourceNotificationId,
            RemindAt = request.RemindAt,
            Title = request.Title,
            Body = request.Body,
            IsFired = false,
            CreatedAt = now,
            UpdatedAt = now
        };

        db.NotificationReminders.Add(entity);
        await db.SaveChangesAsync(cancellationToken);

        return new NotificationReminder
        {
            Id = entity.Id,
            UserId = entity.UserId,
            SourceNotificationId = entity.SourceNotificationId,
            RemindAt = entity.RemindAt,
            Title = entity.Title,
            Body = entity.Body,
            IsFired = entity.IsFired,
            CreatedAt = entity.CreatedAt
        };
    }

    public async Task DeleteReminderAsync(
        OnboardingWorkflowUser user,
        int reminderId,
        CancellationToken cancellationToken)
    {
        var entity = await db.NotificationReminders
            .FirstOrDefaultAsync(x => x.UserId == user.UserId && x.Id == reminderId, cancellationToken)
            ?? throw new NotFoundAppException(ExceptionMessages.NotFound);

        db.NotificationReminders.Remove(entity);
        await db.SaveChangesAsync(cancellationToken);
    }
}
