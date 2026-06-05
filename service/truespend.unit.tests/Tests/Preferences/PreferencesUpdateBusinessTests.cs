using Moq;
using TrueSpend.Domain.Business.Preferences;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Preferences;
using TrueSpend.Domain.ServiceInterfaces.Preferences;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Preferences;

public sealed class PreferencesUpdateBusinessTests
{
    private static readonly PreferencesResponse AnyPreferences =
        new("dark", "en-US", "UTC", false, true);

    [Fact]
    public async Task UpdatePreferences_returns_saved_preferences()
    {
        var service = new Mock<IPreferencesUpdateService>();
        service.Setup(s => s.UpdatePreferencesAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<UpdatePreferencesRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AnyPreferences);

        var business = new PreferencesUpdateBusiness(service.Object, new PreferencesValidator());

        var response = await business.UpdatePreferencesAsync(
            TestUserFactory.AnyUser(),
            new UpdatePreferencesRequest("dark", "en-US", "UTC", false, true),
            CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(AnyPreferences, response.Data);
    }

    [Fact]
    public async Task UpdatePreferences_fails_with_400_when_theme_invalid()
    {
        var service = new Mock<IPreferencesUpdateService>();
        var business = new PreferencesUpdateBusiness(service.Object, new PreferencesValidator());

        var response = await business.UpdatePreferencesAsync(
            TestUserFactory.AnyUser(),
            new UpdatePreferencesRequest("hot-pink", null, null, null, null),
            CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(400, response.StatusCode);
        service.Verify(s => s.UpdatePreferencesAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<UpdatePreferencesRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
