using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using TrueSpend.Domain.Business.Privacy;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.Privacy;
using TrueSpend.Domain.ServiceInterfaces.Privacy;
using TrueSpend.UnitTests.Helpers;
using Xunit;

namespace TrueSpend.UnitTests.Tests.Privacy;

public sealed class AccountDeletionPurgeBusinessTests
{
    [Fact]
    public async Task PurgeDueAccounts_returns_empty_when_no_candidates()
    {
        var deletion = new Mock<IAccountDeletionService>();
        deletion.Setup(d => d.GetDuePurgesAsync(It.IsAny<DateTimeOffset>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<AccountPurgeCandidate>());
        var business = new AccountDeletionPurgeBusiness(deletion.Object, Mock.Of<ISupabaseAdminProvider>(), new FakeUnitOfWork(), NullLogger<AccountDeletionPurgeBusiness>.Instance);

        var result = await business.PurgeDueAccountsAsync(DateTimeOffset.UtcNow, cancellationToken: CancellationToken.None);

        Assert.Equal(AccountDeletionPurgeResult.Empty, result);
    }

    [Fact]
    public async Task PurgeDueAccounts_skips_when_request_is_no_longer_pending()
    {
        var candidate = new AccountPurgeCandidate(1, Guid.NewGuid());
        var deletion = new Mock<IAccountDeletionService>();
        deletion.Setup(d => d.GetDuePurgesAsync(It.IsAny<DateTimeOffset>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { candidate });
        deletion.Setup(d => d.ReloadIsStillPendingAsync(candidate.RequestId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        var business = new AccountDeletionPurgeBusiness(deletion.Object, Mock.Of<ISupabaseAdminProvider>(), new FakeUnitOfWork(), NullLogger<AccountDeletionPurgeBusiness>.Instance);

        var result = await business.PurgeDueAccountsAsync(DateTimeOffset.UtcNow, cancellationToken: CancellationToken.None);

        Assert.Equal(1, result.PurgesSkippedCancelled);
        Assert.Equal(0, result.PurgesProcessed);
        deletion.Verify(d => d.PurgeUserDataAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task PurgeDueAccounts_succeeds_when_admin_and_purge_complete()
    {
        var candidate = new AccountPurgeCandidate(2, Guid.NewGuid());
        var deletion = new Mock<IAccountDeletionService>();
        deletion.Setup(d => d.GetDuePurgesAsync(It.IsAny<DateTimeOffset>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { candidate });
        deletion.Setup(d => d.ReloadIsStillPendingAsync(candidate.RequestId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        var admin = new Mock<ISupabaseAdminProvider>();
        var business = new AccountDeletionPurgeBusiness(deletion.Object, admin.Object, new FakeUnitOfWork(), NullLogger<AccountDeletionPurgeBusiness>.Instance);

        var result = await business.PurgeDueAccountsAsync(DateTimeOffset.UtcNow, cancellationToken: CancellationToken.None);

        Assert.Equal(1, result.PurgesProcessed);
        deletion.Verify(d => d.PurgeUserDataAsync(candidate.UserId, It.IsAny<CancellationToken>()), Times.Once);
        admin.Verify(a => a.DeleteAuthUserAsync(candidate.UserId, It.IsAny<CancellationToken>()), Times.Once);
        deletion.Verify(d => d.MarkRequestStatusAsync(candidate.RequestId, AccountDeletionStatusCodes.Completed, null, It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task PurgeDueAccounts_records_failure_when_admin_provider_throws()
    {
        var candidate = new AccountPurgeCandidate(3, Guid.NewGuid());
        var deletion = new Mock<IAccountDeletionService>();
        deletion.Setup(d => d.GetDuePurgesAsync(It.IsAny<DateTimeOffset>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { candidate });
        deletion.Setup(d => d.ReloadIsStillPendingAsync(candidate.RequestId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        var admin = new Mock<ISupabaseAdminProvider>();
        admin.Setup(a => a.DeleteAuthUserAsync(candidate.UserId, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new ExternalProviderAppException("supabaseAdmin", "boom"));
        var business = new AccountDeletionPurgeBusiness(deletion.Object, admin.Object, new FakeUnitOfWork(), NullLogger<AccountDeletionPurgeBusiness>.Instance);

        var result = await business.PurgeDueAccountsAsync(DateTimeOffset.UtcNow, cancellationToken: CancellationToken.None);

        Assert.Equal(1, result.Failed);
        deletion.Verify(d => d.MarkRequestStatusAsync(candidate.RequestId, AccountDeletionStatusCodes.Failed, It.IsAny<string?>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
