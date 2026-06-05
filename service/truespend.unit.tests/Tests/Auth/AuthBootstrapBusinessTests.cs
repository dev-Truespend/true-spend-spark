using Moq;
using TrueSpend.Domain.Business.Auth;
using TrueSpend.Domain.Models.Auth;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.ServiceInterfaces.Auth;
using TrueSpend.Domain.ServiceInterfaces.Billing;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Auth;

public sealed class AuthBootstrapBusinessTests
{
    private static AuthBootstrapInput ValidInput(DeviceInput? device = null) => new(
        TestUserFactory.FixedUserId,
        "taylor@example.com",
        "Taylor",
        "en-US",
        "America/New_York",
        "US",
        device);

    [Fact]
    public async Task Bootstrap_returns_ok_for_valid_input()
    {
        var input = ValidInput();
        var (auth, billing) = MockServices();

        var business = new AuthBootstrapBusiness(auth.Object, billing.Object, new AuthBootstrapValidator());
        var response = await business.BootstrapAsync(input, CancellationToken.None);

        Assert.True(response.Success);
        Assert.NotNull(response.Data);
        Assert.Equal("Taylor", response.Data!.Profile.DisplayName);
        Assert.Equal("US", response.Data.Profile.CountryCode);
        Assert.Equal("basic", response.Data.Entitlements.PlanCode);
        Assert.Equal("card_connection", response.Data.Onboarding.CurrentStepCode);
    }

    [Fact]
    public async Task Bootstrap_provisions_default_profile_when_missing()
    {
        var input = ValidInput();
        var (auth, billing) = MockServices(existingProfile: false);

        var business = new AuthBootstrapBusiness(auth.Object, billing.Object, new AuthBootstrapValidator());
        var response = await business.BootstrapAsync(input, CancellationToken.None);

        Assert.True(response.Success);
        auth.Verify(s => s.InsertProfileAsync(input.UserId, "Taylor", "taylor@example.com", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Bootstrap_returns_validation_error_for_missing_user_id()
    {
        var input = ValidInput() with { UserId = Guid.Empty };
        var (auth, billing) = MockServices();

        var business = new AuthBootstrapBusiness(auth.Object, billing.Object, new AuthBootstrapValidator());
        var response = await business.BootstrapAsync(input, CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(400, response.StatusCode);
        auth.Verify(s => s.InsertProfileAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Bootstrap_rejects_unsupported_device_platform()
    {
        var input = ValidInput(new DeviceInput("windows", null, null, null, null));
        var (auth, billing) = MockServices();

        var business = new AuthBootstrapBusiness(auth.Object, billing.Object, new AuthBootstrapValidator());
        var response = await business.BootstrapAsync(input, CancellationToken.None);

        Assert.False(response.Success);
        Assert.Contains("Device platform must be ios or android.", response.Errors);
        auth.Verify(s => s.UpsertDeviceAsync(It.IsAny<Guid>(), It.IsAny<DeviceInput>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    private static (Mock<IAuthBootstrapService> Auth, Mock<IBillingReadService> Billing) MockServices(bool existingProfile = true)
    {
        var auth = new Mock<IAuthBootstrapService>();
        auth.Setup(s => s.FindProfileAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(existingProfile
                ? new ProfileResult("Taylor", "taylor@example.com", null, null, null, null, string.Empty)
                : null);
        auth.Setup(s => s.InsertProfileAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ProfileResult("Taylor", "taylor@example.com", null, null, null, null, string.Empty));
        auth.Setup(s => s.FindPreferencesAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PreferencesResult("system", "en-US", "UTC", false, false));
        auth.Setup(s => s.FindPermissionsAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PermissionsResult("unknown", "unknown", "unknown", null, TestUserFactory.FixedNow));
        auth.Setup(s => s.FindOnboardingAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OnboardingStateSnapshot(1, false, false, false, false));
        auth.Setup(s => s.GetOnboardingStepCodeAsync(It.IsAny<short>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("card_connection");
        auth.Setup(s => s.GetRoleCodesAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { "user" });

        var billing = new Mock<IBillingReadService>();
        billing.Setup(b => b.GetEntitlementsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EntitlementsResponse(
                "basic",
                Trialing: false,
                TrialEndsAt: null,
                CardLinkLimit: null,
                UnlimitedCards: false,
                AiInsightsEnabled: false,
                PlaidLinkingEnabled: false,
                PlaidTransactionsViewEnabled: false,
                GeofencingEnabled: false,
                Features: new Dictionary<string, string>()));

        return (auth, billing);
    }
}
