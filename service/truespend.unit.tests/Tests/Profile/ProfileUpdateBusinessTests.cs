using Moq;
using TrueSpend.Domain.Business.Profile;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Profile;
using TrueSpend.Domain.Models.Storage;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Profile;
using TrueSpend.Domain.ServiceInterfaces.Storage;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Profile;

public sealed class ProfileUpdateBusinessTests
{
    private static readonly ProfileResponse AnyProfile =
        new("Taylor", "taylor@example.com", "+15550100", null, "US", "USD", "basic");

    private static (
        ProfileUpdateBusiness business,
        Mock<IProfileUpdateService> update,
        Mock<IProfileLookupService> lookup,
        Mock<IStorageProvider> storage,
        Mock<IMessagingInsertService> messaging)
        Build()
    {
        var update = new Mock<IProfileUpdateService>();
        update.Setup(s => s.UpdateProfileAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<UpdateProfileRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AnyProfile);
        update.Setup(s => s.UpdateAvatarUrlAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(AnyProfile with { AvatarUrl = "https://cdn/avatar.jpg" });

        var lookup = new Mock<IProfileLookupService>();
        lookup.Setup(l => l.CountryExistsAsync("US", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        lookup.Setup(l => l.CurrencyExistsAsync("USD", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var storage = new Mock<IStorageProvider>();
        storage.Setup(s => s.UploadAsync(It.IsAny<UploadObjectRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync("https://cdn/avatar.jpg");

        var messaging = new Mock<IMessagingInsertService>(); // archived: kept for future async migration

        var business = new ProfileUpdateBusiness(
            update.Object, storage.Object, messaging.Object, new FakeUnitOfWork(), new ProfileValidator(lookup.Object));

        return (business, update, lookup, storage, messaging);
    }

    [Fact]
    public async Task UpdateProfile_returns_profile_and_does_not_enqueue_outbox_event()
    {
        var (business, _, _, _, messaging) = Build();
        var response = await business.UpdateProfileAsync(
            TestUserFactory.AnyUser(),
            new UpdateProfileRequest("Taylor", "+15550100", "US", "USD"),
            CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal(AnyProfile, response.Data);
        // Post-conversion: AppProfileUpdated has no live subscriber, so no enqueue is expected.
        messaging.Verify(m => m.EnqueueOutboxEventAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(),
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UploadAvatar_uploads_then_persists_url_without_outbox_event()
    {
        var (business, update, _, storage, messaging) = Build();
        await using var stream = new MemoryStream(new byte[] { 1, 2, 3 });

        var response = await business.UploadAvatarAsync(
            TestUserFactory.AnyUser(),
            new UploadAvatarRequest(stream, "selfie.jpg", "image/jpeg", stream.Length),
            CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal("https://cdn/avatar.jpg", response.Data!.AvatarUrl);
        storage.Verify(s => s.UploadAsync(It.Is<UploadObjectRequest>(r => r.Bucket == StorageConstants.AvatarsBucket), It.IsAny<CancellationToken>()), Times.Once);
        update.Verify(s => s.UpdateAvatarUrlAsync(It.IsAny<OnboardingWorkflowUser>(), "https://cdn/avatar.jpg", It.IsAny<CancellationToken>()), Times.Once);
        messaging.Verify(m => m.EnqueueOutboxEventAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(),
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UpdateProfile_fails_with_400_when_currency_unknown()
    {
        var (business, update, lookup, _, _) = Build();
        lookup.Setup(l => l.CurrencyExistsAsync("XYZ", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var response = await business.UpdateProfileAsync(
            TestUserFactory.AnyUser(),
            new UpdateProfileRequest(null, null, null, "XYZ"),
            CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(400, response.StatusCode);
        update.Verify(s => s.UpdateProfileAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<UpdateProfileRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task UploadAvatar_fails_with_400_when_content_type_not_image()
    {
        var (business, _, _, storage, _) = Build();
        await using var stream = new MemoryStream(new byte[] { 1 });

        var response = await business.UploadAvatarAsync(
            TestUserFactory.AnyUser(),
            new UploadAvatarRequest(stream, "blob.bin", "application/octet-stream", stream.Length),
            CancellationToken.None);

        Assert.False(response.Success);
        Assert.Equal(400, response.StatusCode);
        storage.Verify(s => s.UploadAsync(It.IsAny<UploadObjectRequest>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    #region archive — async event-publish (disabled in MVP)
    // UpdateProfile_returns_profile_and_enqueues_outbox_event previously asserted:
    //     messaging.Verify(m => m.EnqueueOutboxEventAsync(
    //         EventTypes.AppProfileUpdated, "app.profile", null,
    //         It.IsAny<string>(), It.IsAny<string>(),
    //         It.IsAny<CancellationToken>()), Times.Once);
    //
    // UploadAvatar_uploads_then_persists_url_and_enqueues_event previously asserted:
    //     messaging.Verify(m => m.EnqueueOutboxEventAsync(
    //         EventTypes.AppProfileUpdated, "app.profile", null,
    //         It.IsAny<string>(), It.IsAny<string>(),
    //         It.IsAny<CancellationToken>()), Times.Once);
    //
    // AppProfileUpdated has no live subscriber in the EventDispatcher routes, so the live tests
    // now assert the enqueue does NOT fire.
    #endregion
}
