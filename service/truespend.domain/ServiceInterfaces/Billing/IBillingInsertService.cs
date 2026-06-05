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

public interface IBillingInsertService
{
    Task<SubscriptionResponse> RecordTrialingSubscriptionAsync(OnboardingWorkflowUser user, string planCode, CancellationToken cancellationToken);
}
