using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;

namespace TrueSpend.Domain.ServiceInterfaces.Billing;

public interface IBillingReadService
{
    Task<IReadOnlyList<Country>> GetCountriesAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<Plan>> GetPlansAsync(CancellationToken cancellationToken);
    Task<IReadOnlyList<PlanPrice>> GetPricesAsync(string? countryCode, string? periodCode, CancellationToken cancellationToken);
    Task<IReadOnlyList<PlanFeature>> GetFeaturesAsync(CancellationToken cancellationToken);
    Task<SubscriptionResponse> GetSubscriptionAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
    Task<EntitlementsResponse> GetEntitlementsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
    Task<IReadOnlyList<PaymentMethod>> GetPaymentMethodsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);

    Task<string?> GetStripeCustomerIdAsync(Guid userId, CancellationToken cancellationToken);
    Task<Guid?> GetUserIdByStripeCustomerIdAsync(string stripeCustomerId, CancellationToken cancellationToken);
    Task<PlanPriceLookup?> LookupPlanPriceAsync(string planCode, string periodCode, string countryCode, CancellationToken cancellationToken);
    Task<PlanPriceLookup?> LookupPlanPriceByStripePriceIdAsync(string stripePriceId, CancellationToken cancellationToken);
    Task<string?> GetProfileEmailAsync(Guid userId, CancellationToken cancellationToken);
    Task<string?> GetProfileCountryCodeAsync(Guid userId, CancellationToken cancellationToken);
    Task<int?> GetStripeCustomerRowIdAsync(string stripeCustomerId, CancellationToken cancellationToken);
}
