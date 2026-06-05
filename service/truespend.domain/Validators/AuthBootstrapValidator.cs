using TrueSpend.Domain.Models.Auth;

namespace TrueSpend.Domain.Validators;

public sealed class AuthBootstrapValidator
{
    public IReadOnlyList<string> Validate(AuthBootstrapInput input)
    {
        var errors = new List<string>();

        if (input.UserId == Guid.Empty)
        {
            errors.Add("Authenticated user id is required.");
        }

        if (input.Device is not null && input.Device.PlatformCode is not "ios" and not "android")
        {
            errors.Add("Device platform must be ios or android.");
        }

        return errors;
    }
}
