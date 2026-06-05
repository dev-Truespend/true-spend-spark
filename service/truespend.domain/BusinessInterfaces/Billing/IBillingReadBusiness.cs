using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;

namespace TrueSpend.Domain.BusinessInterfaces.Billing;

public interface IBillingReadBusiness
{
    Task<BusinessResponse<CountriesResponse>> GetCountriesAsync(CancellationToken cancellationToken);
    Task<BusinessResponse<PlansResponse>> GetPlansAsync(CancellationToken cancellationToken);
    Task<BusinessResponse<PlanPricesResponse>> GetPricesAsync(OnboardingWorkflowUser user, string? countryCode, string? periodCode, CancellationToken cancellationToken);
    Task<BusinessResponse<PlanFeaturesResponse>> GetFeaturesAsync(CancellationToken cancellationToken);
    Task<BusinessResponse<SubscriptionResponse>> GetSubscriptionAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
    Task<BusinessResponse<EntitlementsResponse>> GetEntitlementsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
    Task<BusinessResponse<PaymentMethodsResponse>> GetPaymentMethodsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken);
}
