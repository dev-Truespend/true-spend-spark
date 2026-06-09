using TrueSpend.Domain.BusinessInterfaces.NotificationSettings;
using TrueSpend.Domain.Models.Notifications;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.ServiceInterfaces.NotificationSettings;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.NotificationSettings;

public sealed class NotificationSettingsUpdateBusiness(
    INotificationSettingsReadService readService,
    INotificationSettingsUpdateService updateService,
    IMessagingInsertService messagingInsert, // archived: kept for future async migration
    IUnitOfWork unitOfWork,
    NotificationsValidator validator) : INotificationSettingsUpdateBusiness
{
    public async Task<BusinessResponse<NotificationSettingsResponse>> UpdateNotificationSettingsAsync(
        OnboardingWorkflowUser user,
        UpdateNotificationSettingsRequest request,
        CancellationToken cancellationToken)
    {
        _ = messagingInsert;

        var errors = validator.ValidateNotificationSettings(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<NotificationSettingsResponse>.Fail(errors, 400);
        }

        var current = await readService.GetSettingsAsync(user, cancellationToken);
        var next = current with
        {
            MasterEnabled = request.MasterEnabled,
            PushEnabled = request.PushEnabled,
            EmailEnabled = request.EmailEnabled,
            QuietHoursEnabled = request.QuietHoursEnabled,
            QuietHoursStart = request.QuietHoursStart,
            QuietHoursEnd = request.QuietHoursEnd
        };

        NotificationSettingsResponse saved;
        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            saved = await updateService.SaveSettingsAsync(user, next, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        return BusinessResponse<NotificationSettingsResponse>.Ok(saved);
    }

    public async Task<BusinessResponse<NotificationSettingsResponse>> UpdateNotificationTypePreferenceAsync(
        OnboardingWorkflowUser user,
        UpdateNotificationTypePreferenceRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateTypePreference(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<NotificationSettingsResponse>.Fail(errors, 400);
        }

        NotificationSettingsResponse saved;
        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            saved = await updateService.SaveTypePreferenceAsync(user, request, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        return BusinessResponse<NotificationSettingsResponse>.Ok(saved);
    }

    #region archive — async event-publish (disabled in MVP)
    // UpdateNotificationSettingsAsync previously published NotificationPreferencesUpdated.
    // UpdateNotificationTypePreferenceAsync previously published NotificationTypePreferenceUpdated.
    // Neither event has a subscriber in the EventDispatcher routes today, so no inline
    // replacement is needed.
    //
    // using System.Text.Json;
    // using TrueSpend.Domain.Constants;
    // using TrueSpend.Domain.Events.Notifications;
    //
    // // UpdateNotificationSettingsAsync — inside the committing tx, after SaveSettingsAsync:
    // var payload = JsonSerializer.Serialize(new NotificationPreferencesUpdatedEvent(1, user.UserId));
    // await messagingInsert.EnqueueOutboxEventAsync(
    //     EventTypes.NotificationPreferencesUpdated, "notification_preferences", null,
    //     payload, $"notification_prefs.updated.{user.UserId}.{DateTimeOffset.UtcNow:yyyyMMddHHmm}",
    //     cancellationToken);
    //
    // // UpdateNotificationTypePreferenceAsync — inside the committing tx, after SaveTypePreferenceAsync:
    // var payload = JsonSerializer.Serialize(new NotificationTypePreferenceUpdatedEvent(1, request.TypeCode, request.Enabled, user.UserId));
    // await messagingInsert.EnqueueOutboxEventAsync(
    //     EventTypes.NotificationTypePreferenceUpdated, "notification_type_preference", null,
    //     payload, $"notification_type_pref.{request.TypeCode}.{user.UserId}",
    //     cancellationToken);
    #endregion
}
