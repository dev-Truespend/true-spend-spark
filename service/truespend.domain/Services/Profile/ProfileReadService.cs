using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Profile;
using TrueSpend.Domain.ServiceInterfaces.Profile;

namespace TrueSpend.Domain.Services.Profile;

public sealed class ProfileReadService(TrueSpendDbContext db) : IProfileReadService
{
    public async Task<ProfileResponse> GetProfileAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var row = await (from p in db.Profiles.AsNoTracking().Where(x => x.UserId == user.UserId)
                         join country in db.Countries.AsNoTracking() on p.CountryId equals country.Id into countryJoin
                         from country in countryJoin.DefaultIfEmpty()
                         join profileCurrency in db.Currencies.AsNoTracking() on p.CurrencyId equals profileCurrency.Id into profileCurrencyJoin
                         from profileCurrency in profileCurrencyJoin.DefaultIfEmpty()
                         join countryCurrency in db.Currencies.AsNoTracking() on country.CurrencyId equals countryCurrency.Id into countryCurrencyJoin
                         from countryCurrency in countryCurrencyJoin.DefaultIfEmpty()
                         select new
                         {
                             p.DisplayName,
                             p.Email,
                             p.Phone,
                             p.AvatarUrl,
                             CountryCode = country == null ? null : country.Code,
                             CurrencyCode = profileCurrency != null
                                 ? profileCurrency.Code
                                 : (countryCurrency != null ? countryCurrency.Code : null)
                         })
            .FirstOrDefaultAsync(cancellationToken);

        var planCode = await (from s in db.Subscriptions.AsNoTracking().Where(x => x.UserId == user.UserId)
                              join plan in db.Plans.AsNoTracking() on s.PlanId equals plan.Id
                              orderby s.UpdatedAt descending
                              select plan.Code)
            .FirstOrDefaultAsync(cancellationToken) ?? BillingConstants.FreePlanCode;

        return new ProfileResponse(
            row?.DisplayName ?? user.Email ?? "TrueSpend user",
            row?.Email ?? user.Email ?? "",
            row?.Phone,
            row?.AvatarUrl,
            row?.CountryCode,
            row?.CurrencyCode,
            planCode);
    }
}
