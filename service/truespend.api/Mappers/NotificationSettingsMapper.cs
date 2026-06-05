using TrueSpend.Api.ViewModels.NotificationSettings;
using TrueSpend.Domain.Models.Notifications;
using DomainSettings = TrueSpend.Domain.Models.NotificationSettings.NotificationSettingsResponse;
using DomainUpdate = TrueSpend.Domain.Models.NotificationSettings.UpdateNotificationSettingsRequest;
using DomainTypes = TrueSpend.Domain.Models.NotificationSettings.NotificationTypesResponse;
using DomainType = TrueSpend.Domain.Models.NotificationSettings.NotificationType;

namespace TrueSpend.Api.Mappers;

public interface INotificationSettingsMapper
{
    DomainUpdate ToDomain(UpdateNotificationSettingsRequestVm request);
    UpdateNotificationTypePreferenceRequest ToDomain(UpdateNotificationTypePreferenceRequestVm request);
    NotificationSettingsResponseVm ToResponse(DomainSettings domain);
    NotificationTypesResponseVm ToTypes(DomainTypes domain);
}

public sealed class NotificationSettingsMapper : INotificationSettingsMapper
{
    public DomainUpdate ToDomain(UpdateNotificationSettingsRequestVm request) =>
        new(request.MasterEnabled, request.PushEnabled, request.EmailEnabled, request.QuietHoursEnabled, request.QuietHoursStart, request.QuietHoursEnd);

    public NotificationSettingsResponseVm ToResponse(DomainSettings domain) =>
        new(
            domain.MasterEnabled,
            domain.PushEnabled,
            domain.EmailEnabled,
            domain.QuietHoursEnabled,
            domain.QuietHoursStart,
            domain.QuietHoursEnd,
            domain.Types.Select(ToType).ToArray());

    public UpdateNotificationTypePreferenceRequest ToDomain(UpdateNotificationTypePreferenceRequestVm request) =>
        new(request.TypeCode, request.Enabled);

    public NotificationTypesResponseVm ToTypes(DomainTypes domain) =>
        new(domain.Types.Select(ToType).ToArray());

    private static NotificationTypeVm ToType(DomainType domain) => new(domain.Code, domain.DisplayName, domain.Enabled);
}
