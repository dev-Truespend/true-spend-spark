using Microsoft.Extensions.Options;
using Moq;
using TrueSpend.Domain.Business.Privacy;
using TrueSpend.Domain.Entities.Privacy;
using TrueSpend.Domain.Models.Privacy;
using TrueSpend.Domain.ServiceInterfaces.Privacy;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Privacy;

public sealed class AccountDeletionRequestBusinessTests
{
    private static AccountDeletionRequestBusiness Build(Mock<IAccountDeletionService> service) =>
        new(service.Object, new FakeUnitOfWork(), Options.Create(new PrivacyOptions { DeletionGraceDays = 14 }));

    [Fact]
    public async Task Request_schedules_deletion_and_writes_audit_when_none_pending()
    {
        var service = new Mock<IAccountDeletionService>();
        service.Setup(s => s.GetActiveRequestAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((AccountDeletionRequestEntity?)null);
        service.Setup(s => s.InsertRequestAsync(It.IsAny<Guid>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((Guid u, DateTimeOffset req, DateTimeOffset purge, CancellationToken _) =>
                new AccountDeletionRequestEntity { Id = 7, UserId = u, Status = AccountDeletionStatusCodes.Pending, RequestedAt = req, PurgeAfter = purge });

        var result = await Build(service).RequestAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal(201, result.StatusCode);
        Assert.Equal(AccountDeletionStatus.StatePending, result.Data!.State);
        Assert.True(result.Data.PurgeAfter > result.Data.RequestedAt);
        service.Verify(s => s.WriteAuditEventAsync(It.IsAny<Guid?>(), PrivacyAuditEventTypes.AccountDeletionRequested, It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Request_is_idempotent_when_already_pending()
    {
        var existing = new AccountDeletionRequestEntity { Id = 3, Status = AccountDeletionStatusCodes.Pending, RequestedAt = DateTimeOffset.UtcNow, PurgeAfter = DateTimeOffset.UtcNow.AddDays(14) };
        var service = new Mock<IAccountDeletionService>();
        service.Setup(s => s.GetActiveRequestAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var result = await Build(service).RequestAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal(AccountDeletionStatus.StatePending, result.Data!.State);
        service.Verify(s => s.InsertRequestAsync(It.IsAny<Guid>(), It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task Cancel_marks_request_cancelled_and_returns_none()
    {
        var existing = new AccountDeletionRequestEntity { Id = 9, Status = AccountDeletionStatusCodes.Pending };
        var service = new Mock<IAccountDeletionService>();
        service.Setup(s => s.GetActiveRequestAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var result = await Build(service).CancelAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal(AccountDeletionStatus.StateNone, result.Data!.State);
        service.Verify(s => s.MarkRequestStatusAsync(9, AccountDeletionStatusCodes.Cancelled, null, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Cancel_is_noop_when_nothing_pending()
    {
        var service = new Mock<IAccountDeletionService>();
        service.Setup(s => s.GetActiveRequestAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((AccountDeletionRequestEntity?)null);

        var result = await Build(service).CancelAsync(TestUserFactory.AnyUser(), CancellationToken.None);

        Assert.True(result.Success);
        Assert.Equal(AccountDeletionStatus.StateNone, result.Data!.State);
        service.Verify(s => s.MarkRequestStatusAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
