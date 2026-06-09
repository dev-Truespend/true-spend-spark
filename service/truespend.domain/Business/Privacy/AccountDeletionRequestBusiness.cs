using System.Text.Json;
using Microsoft.Extensions.Options;
using TrueSpend.Domain.BusinessInterfaces.Privacy;
using TrueSpend.Domain.Entities.Privacy;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Privacy;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.ServiceInterfaces.Privacy;

namespace TrueSpend.Domain.Business.Privacy;

public sealed class AccountDeletionRequestBusiness(
    IAccountDeletionService deletionService,
    IUnitOfWork unitOfWork,
    IOptions<PrivacyOptions> options) : IAccountDeletionRequestBusiness
{
    public async Task<BusinessResponse<AccountDeletionStatus>> GetStatusAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var active = await deletionService.GetActiveRequestAsync(user.UserId, cancellationToken);
        return BusinessResponse<AccountDeletionStatus>.Ok(ToStatus(active));
    }

    public async Task<BusinessResponse<AccountDeletionStatus>> RequestAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        // Idempotent: if a deletion is already scheduled, return it instead of stacking requests.
        var existing = await deletionService.GetActiveRequestAsync(user.UserId, cancellationToken);
        if (existing is not null)
            return BusinessResponse<AccountDeletionStatus>.Ok(ToStatus(existing));

        var now = DateTimeOffset.UtcNow;
        var purgeAfter = now.AddDays(options.Value.DeletionGraceDays);

        await using var tx = await unitOfWork.BeginTransactionAsync(cancellationToken);
        var created = await deletionService.InsertRequestAsync(user.UserId, now, purgeAfter, cancellationToken);
        await deletionService.WriteAuditEventAsync(
            user.UserId,
            PrivacyAuditEventTypes.AccountDeletionRequested,
            JsonSerializer.Serialize(new { requestId = created.Id, purgeAfter }),
            now,
            cancellationToken);
        await tx.CommitAsync(cancellationToken);

        return BusinessResponse<AccountDeletionStatus>.Ok(ToStatus(created), 201);
    }

    public async Task<BusinessResponse<AccountDeletionStatus>> CancelAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var active = await deletionService.GetActiveRequestAsync(user.UserId, cancellationToken);
        if (active is null)
            return BusinessResponse<AccountDeletionStatus>.Ok(AccountDeletionStatus.None);

        var now = DateTimeOffset.UtcNow;
        await using var tx = await unitOfWork.BeginTransactionAsync(cancellationToken);
        await deletionService.MarkRequestStatusAsync(active.Id, AccountDeletionStatusCodes.Cancelled, null, now, cancellationToken);
        await deletionService.WriteAuditEventAsync(
            user.UserId,
            PrivacyAuditEventTypes.AccountDeletionCancelled,
            JsonSerializer.Serialize(new { requestId = active.Id }),
            now,
            cancellationToken);
        await tx.CommitAsync(cancellationToken);

        return BusinessResponse<AccountDeletionStatus>.Ok(AccountDeletionStatus.None);
    }

    private static AccountDeletionStatus ToStatus(AccountDeletionRequestEntity? request) =>
        request is null
            ? AccountDeletionStatus.None
            : new AccountDeletionStatus(AccountDeletionStatus.StatePending, request.RequestedAt, request.PurgeAfter);
}
