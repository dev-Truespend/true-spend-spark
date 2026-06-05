using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.App;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Profile;
using TrueSpend.Domain.ServiceInterfaces.Profile;

namespace TrueSpend.Domain.Services.Profile;

public sealed class ProfileUpdateService(TrueSpendDbContext db, IProfileReadService readService) : IProfileUpdateService
{
    public async Task<ProfileResponse> UpdateProfileAsync(OnboardingWorkflowUser user, UpdateProfileRequest request, CancellationToken cancellationToken)
    {
        var entity = await EnsureProfileAsync(user, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        if (request.DisplayName is { } displayName && !string.IsNullOrWhiteSpace(displayName))
        {
            entity.DisplayName = displayName.Trim();
        }
        if (request.Phone is not null)
        {
            entity.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();
        }
        if (request.CountryCode is not null)
        {
            entity.CountryId = await ResolveCountryIdAsync(request.CountryCode, cancellationToken);
        }
        if (request.CurrencyCode is not null)
        {
            entity.CurrencyId = await ResolveCurrencyIdAsync(request.CurrencyCode, cancellationToken);
        }

        entity.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);

        return await readService.GetProfileAsync(user, cancellationToken);
    }

    public async Task<ProfileResponse> UpdateAvatarUrlAsync(OnboardingWorkflowUser user, string avatarUrl, CancellationToken cancellationToken)
    {
        var entity = await EnsureProfileAsync(user, cancellationToken);
        entity.AvatarUrl = avatarUrl;
        entity.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return await readService.GetProfileAsync(user, cancellationToken);
    }

    private async Task<ProfileEntity> EnsureProfileAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var entity = await db.Profiles.FirstOrDefaultAsync(x => x.UserId == user.UserId, cancellationToken);
        if (entity is not null) return entity;

        var now = DateTimeOffset.UtcNow;
        entity = new ProfileEntity
        {
            UserId = user.UserId,
            DisplayName = user.Email ?? "TrueSpend user",
            Email = user.Email ?? string.Empty,
            CreatedAt = now,
            UpdatedAt = now
        };
        db.Profiles.Add(entity);
        return entity;
    }

    private async Task<short?> ResolveCountryIdAsync(string code, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;
        var trimmed = code.Trim().ToUpperInvariant();
        return await db.Countries.AsNoTracking()
            .Where(x => x.Code == trimmed)
            .Select(x => (short?)x.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<short?> ResolveCurrencyIdAsync(string code, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(code)) return null;
        var trimmed = code.Trim().ToUpperInvariant();
        return await db.Currencies.AsNoTracking()
            .Where(x => x.Code == trimmed)
            .Select(x => (short?)x.Id)
            .FirstOrDefaultAsync(cancellationToken);
    }
}
