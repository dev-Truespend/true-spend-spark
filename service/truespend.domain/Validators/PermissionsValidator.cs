using TrueSpend.Domain.Constants;
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

public sealed class PermissionsValidator
{
    public IReadOnlyList<string> ValidateUpdatePermissions(UpdatePermissionsRequest request)
    {
        var errors = new List<string>();
        if (string.IsNullOrWhiteSpace(request.PlatformCode)) errors.Add("Platform is required.");
        ValidatePermission("Location", request.Location, errors);
        ValidatePermission("Camera", request.Camera, errors);
        ValidatePermission("Notifications", request.Notifications, errors);
        return errors;
    }

    private static void ValidatePermission(string label, PermissionInput? permission, List<string> errors)
    {
        if (permission is null) return;
        if (string.IsNullOrWhiteSpace(permission.State) || !PermissionsConstants.ValidStates.Contains(permission.State))
        {
            errors.Add($"{label} permission state is invalid.");
        }
    }
}
