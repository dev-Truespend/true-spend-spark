using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.Finance;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Merchants;

namespace TrueSpend.Domain.Services.Merchants;

public sealed class MerchantsInsertService(TrueSpendDbContext db) : IMerchantsInsertService
{
    public async Task<Merchant> SaveMerchantAsync(
        string name,
        string? provider,
        string? providerPlaceId,
        string categoryCode,
        bool isMultiCategory,
        string? address,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var normalized = name.Trim().ToLowerInvariant();
        var categoryId = await db.Categories.AsNoTracking()
            .Where(x => x.Code == categoryCode)
            .Select(x => (short?)x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var existing = await db.Merchants.FirstOrDefaultAsync(x => x.NormalizedName == normalized, cancellationToken);
        if (existing is null)
        {
            existing = new MerchantEntity
            {
                CanonicalName = name,
                NormalizedName = normalized,
                CategoryId = categoryId,
                MapkitPlaceId = provider == "mapkit" ? providerPlaceId : null,
                GooglePlaceId = provider == "google" ? providerPlaceId : null,
                Address = address,
                IsMultiCategory = isMultiCategory,
                CreatedAt = now,
                UpdatedAt = now
            };
            db.Merchants.Add(existing);
        }
        else
        {
            existing.Address ??= address;
            existing.CategoryId ??= categoryId;
            existing.IsMultiCategory = existing.IsMultiCategory || isMultiCategory;
            existing.UpdatedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken);
        return new Merchant(existing.Id, existing.CanonicalName, categoryCode, existing.IsMultiCategory, existing.Address);
    }

    public async Task<MerchantVisit> RecordVisitAsync(
        OnboardingWorkflowUser user,
        int merchantId,
        string selectedCategoryCode,
        DateTimeOffset visitedAt,
        CancellationToken cancellationToken)
    {
        var now = DateTimeOffset.UtcNow;
        var categoryId = await db.Categories.AsNoTracking()
            .Where(c => c.Code == selectedCategoryCode)
            .Select(c => (short?)c.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var visit = new MerchantVisitEntity
        {
            UserId = user.UserId,
            MerchantId = merchantId,
            SelectedCategoryId = categoryId,
            VisitedAt = visitedAt,
            CreatedAt = now
        };
        db.MerchantVisits.Add(visit);
        await db.SaveChangesAsync(cancellationToken);

        return new MerchantVisit(merchantId, selectedCategoryCode, visitedAt);
    }

    public async Task<IReadOnlyList<MerchantVisit>> GetVisitsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken) =>
        await (from visit in db.MerchantVisits.AsNoTracking().Where(x => x.UserId == user.UserId)
               join category in db.Categories.AsNoTracking() on visit.SelectedCategoryId equals category.Id into categoryJoin
               from category in categoryJoin.DefaultIfEmpty()
               orderby visit.VisitedAt descending
               select new MerchantVisit(visit.MerchantId, category.Code ?? "general", visit.VisitedAt))
            .ToListAsync(cancellationToken);
}
