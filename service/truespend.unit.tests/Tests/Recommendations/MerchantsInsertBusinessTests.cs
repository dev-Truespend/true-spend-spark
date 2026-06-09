using Moq;
using TrueSpend.Domain.Business.Merchants;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Merchants;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.Validators;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Recommendations;

public sealed class MerchantsInsertBusinessTests
{
    [Fact]
    public async Task ResolveMerchant_uses_category_resolver_result()
    {
        var insert = new Mock<IMerchantsInsertService>();
        insert.Setup(s => s.SaveMerchantAsync("Whole Foods Market", It.IsAny<string?>(), It.IsAny<string?>(), "groceries", false, It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Merchant(1, "Whole Foods Market", "groceries", false, null));
        var read = new Mock<IMerchantsReadService>();
        read.Setup(r => r.ResolveCategoryAsync("Whole Foods Market", It.IsAny<CancellationToken>())).ReturnsAsync(new MerchantCategoryMatch("groceries", false));
        var messaging = new Mock<IMessagingInsertService>(); // archived: kept for future async migration
        var business = new MerchantsInsertBusiness(insert.Object, read.Object, messaging.Object, new FakeUnitOfWork(), new MerchantsValidator());

        var response = await business.ResolveMerchantAsync(TestUserFactory.AnyUser(),
            new ResolveMerchantRequest("Whole Foods Market", "apple_mapkit", "wfm-1", null, null, null), CancellationToken.None);

        Assert.True(response.Success);
        Assert.Equal("groceries", response.Data!.Merchant.CategoryCode);
    }

    [Fact]
    public async Task ResolveMerchant_passes_is_multi_category_from_resolver()
    {
        var insert = new Mock<IMerchantsInsertService>();
        insert.Setup(s => s.SaveMerchantAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string>(), true, It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string name, string? _, string? _, string category, bool multi, string? address, CancellationToken _) =>
                new Merchant(1, name, category, multi, address));
        var read = new Mock<IMerchantsReadService>();
        read.Setup(r => r.ResolveCategoryAsync("Target Store", It.IsAny<CancellationToken>())).ReturnsAsync(new MerchantCategoryMatch("groceries", true));
        var messaging = new Mock<IMessagingInsertService>();
        var business = new MerchantsInsertBusiness(insert.Object, read.Object, messaging.Object, new FakeUnitOfWork(), new MerchantsValidator());

        var response = await business.ResolveMerchantAsync(TestUserFactory.AnyUser(),
            new ResolveMerchantRequest("Target Store", "apple_mapkit", "target-1", null, null, null), CancellationToken.None);

        Assert.True(response.Data!.Merchant.IsMultiCategory);
    }

    [Fact]
    public async Task ResolveMerchant_rejects_empty_name()
    {
        var insert = new Mock<IMerchantsInsertService>();
        var read = new Mock<IMerchantsReadService>();
        var messaging = new Mock<IMessagingInsertService>();
        var business = new MerchantsInsertBusiness(insert.Object, read.Object, messaging.Object, new FakeUnitOfWork(), new MerchantsValidator());

        var response = await business.ResolveMerchantAsync(TestUserFactory.AnyUser(),
            new ResolveMerchantRequest(" ", "apple_mapkit", null, null, null, null), CancellationToken.None);

        Assert.False(response.Success);
        insert.Verify(s => s.SaveMerchantAsync(It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateVisit_records_visit_and_does_not_emit_outbox_event()
    {
        var insert = new Mock<IMerchantsInsertService>();
        insert.Setup(s => s.RecordVisitAsync(It.IsAny<OnboardingWorkflowUser>(), 42, "groceries", It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MerchantVisit(42, "groceries", TestUserFactory.FixedNow));
        insert.Setup(s => s.GetVisitsAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { new MerchantVisit(42, "groceries", TestUserFactory.FixedNow) });
        var read = new Mock<IMerchantsReadService>();
        var messaging = new Mock<IMessagingInsertService>(); // archived: kept for future async migration
        var business = new MerchantsInsertBusiness(insert.Object, read.Object, messaging.Object, new FakeUnitOfWork(), new MerchantsValidator());

        var response = await business.CreateVisitAsync(TestUserFactory.AnyUser(),
            new CreateMerchantVisitRequest(42, "groceries", TestUserFactory.FixedNow), CancellationToken.None);

        Assert.True(response.Success);
        // Post-conversion: MerchantVisitCreated handler was log-only, so no enqueue is expected.
        messaging.Verify(m => m.EnqueueOutboxEventAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<int?>(),
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task CreateVisit_rejects_invalid_merchant_id()
    {
        var insert = new Mock<IMerchantsInsertService>();
        var read = new Mock<IMerchantsReadService>();
        var messaging = new Mock<IMessagingInsertService>();
        var business = new MerchantsInsertBusiness(insert.Object, read.Object, messaging.Object, new FakeUnitOfWork(), new MerchantsValidator());

        var response = await business.CreateVisitAsync(TestUserFactory.AnyUser(),
            new CreateMerchantVisitRequest(0, "groceries", TestUserFactory.FixedNow), CancellationToken.None);

        Assert.False(response.Success);
        insert.Verify(s => s.RecordVisitAsync(It.IsAny<OnboardingWorkflowUser>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    #region archive — async event-publish (disabled in MVP)
    // CreateVisit_records_visit_and_emits_outbox_event previously asserted:
    //     messaging.Verify(m => m.EnqueueOutboxEventAsync(
    //         "finance.merchant_visit.created", "finance.merchant_visit", 42,
    //         It.IsAny<string>(), It.IsAny<string>(),
    //         It.IsAny<CancellationToken>()), Times.Once);
    // The handler was log-only, so the live test now asserts the enqueue does NOT fire.
    #endregion
}
