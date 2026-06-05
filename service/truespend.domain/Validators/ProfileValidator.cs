using TrueSpend.Domain.Models.Profile;
using TrueSpend.Domain.ServiceInterfaces.Profile;

namespace TrueSpend.Domain.Validators;

public sealed class ProfileValidator(IProfileLookupService lookupService)
{
    private const int DisplayNameMaxLength = 100;
    private const int PhoneMaxLength = 32;
    private const long AvatarMaxBytes = 5 * 1024 * 1024;

    private static readonly HashSet<string> AllowedAvatarContentTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/heic"
    };

    public async Task<IReadOnlyList<string>> ValidateUpdateProfileAsync(UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var errors = new List<string>();
        if (request.DisplayName is { } displayName)
        {
            if (string.IsNullOrWhiteSpace(displayName)) errors.Add("Display name is required.");
            else if (displayName.Trim().Length > DisplayNameMaxLength) errors.Add($"Display name must be {DisplayNameMaxLength} characters or fewer.");
        }
        if (request.Phone is { } phone && !string.IsNullOrWhiteSpace(phone) && phone.Trim().Length > PhoneMaxLength)
        {
            errors.Add($"Phone must be {PhoneMaxLength} characters or fewer.");
        }
        if (request.CountryCode is { } countryCode && !string.IsNullOrWhiteSpace(countryCode))
        {
            if (countryCode.Trim().Length != 2)
            {
                errors.Add("Country code must be a 2-letter ISO code.");
            }
            else if (!await lookupService.CountryExistsAsync(countryCode, cancellationToken))
            {
                errors.Add($"Country '{countryCode.Trim().ToUpperInvariant()}' is not supported.");
            }
        }
        if (request.CurrencyCode is { } currencyCode && !string.IsNullOrWhiteSpace(currencyCode))
        {
            if (currencyCode.Trim().Length != 3)
            {
                errors.Add("Currency code must be a 3-letter ISO code.");
            }
            else if (!await lookupService.CurrencyExistsAsync(currencyCode, cancellationToken))
            {
                errors.Add($"Currency '{currencyCode.Trim().ToUpperInvariant()}' is not supported.");
            }
        }
        return errors;
    }

    public IReadOnlyList<string> ValidateUploadAvatar(UploadAvatarRequest request)
    {
        var errors = new List<string>();
        if (request.Length <= 0) errors.Add("Avatar file is empty.");
        if (request.Length > AvatarMaxBytes) errors.Add($"Avatar file must be {AvatarMaxBytes / (1024 * 1024)} MB or smaller.");
        if (string.IsNullOrWhiteSpace(request.ContentType) || !AllowedAvatarContentTypes.Contains(request.ContentType))
        {
            errors.Add("Avatar must be a JPEG, PNG, WebP, or HEIC image.");
        }
        return errors;
    }
}
