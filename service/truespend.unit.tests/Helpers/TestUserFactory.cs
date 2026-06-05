using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;

namespace TrueSpend.UnitTests.Helpers;

public static class TestUserFactory
{
    public static readonly Guid FixedUserId = new("11111111-1111-1111-1111-111111111111");

    public static readonly DateTimeOffset FixedNow = new(2026, 1, 1, 0, 0, 0, TimeSpan.Zero);

    public static OnboardingWorkflowUser AnyUser() => new(FixedUserId, "taylor@example.com");
}
