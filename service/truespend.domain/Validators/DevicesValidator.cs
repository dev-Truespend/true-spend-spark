using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;

namespace TrueSpend.Domain.Validators;

public sealed class DevicesValidator
{
    public IReadOnlyList<string> ValidateRegisterDevice(RegisterDeviceRequest request) =>
        string.IsNullOrWhiteSpace(request.PlatformCode) ? ["Platform is required."] : [];
}
