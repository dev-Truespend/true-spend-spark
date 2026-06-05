using System.Text.Json;
using Microsoft.Extensions.Logging;
using TrueSpend.Domain.BusinessInterfaces.Privacy;
using TrueSpend.Domain.Exceptions;
using TrueSpend.Domain.Models.Privacy;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.ServiceInterfaces.Privacy;

namespace TrueSpend.Domain.Business.Privacy;

public sealed class AccountDeletionPurgeBusiness(
    IAccountDeletionService deletionService,
    ISupabaseAdminProvider supabaseAdmin,
    IUnitOfWork unitOfWork,
    ILogger<AccountDeletionPurgeBusiness> logger) : IAccountDeletionPurgeBusiness
{
    public async Task<AccountDeletionPurgeResult> PurgeDueAccountsAsync(
        DateTimeOffset now,
        int batchSize = 50,
        CancellationToken cancellationToken = default)
    {
        var candidates = await deletionService.GetDuePurgesAsync(now, batchSize, cancellationToken);
        if (candidates.Count == 0) return AccountDeletionPurgeResult.Empty;

        var processed = 0;
        var skipped = 0;
        var failed = 0;

        foreach (var candidate in candidates)
        {
            if (cancellationToken.IsCancellationRequested) break;

            var stillPending = await deletionService.ReloadIsStillPendingAsync(candidate.RequestId, cancellationToken);
            if (!stillPending) { skipped++; continue; }

            await using var tx = await unitOfWork.BeginTransactionAsync(cancellationToken);
            try
            {
                await deletionService.PurgeUserDataAsync(candidate.UserId, cancellationToken);
                await supabaseAdmin.DeleteAuthUserAsync(candidate.UserId, cancellationToken);

                await deletionService.MarkRequestStatusAsync(candidate.RequestId, AccountDeletionStatusCodes.Completed, null, now, cancellationToken);
                await deletionService.WriteAuditEventAsync(
                    candidate.UserId,
                    PrivacyAuditEventTypes.AccountDeletionCompleted,
                    JsonSerializer.Serialize(new { requestId = candidate.RequestId }),
                    now,
                    cancellationToken);

                await tx.CommitAsync(cancellationToken);
                processed++;
            }
            catch (ExternalProviderAppException ex)
            {
                await tx.RollbackAsync(cancellationToken);
                logger.LogError(ex, "Supabase admin failed during account deletion purge for request {RequestId}", candidate.RequestId);
                await deletionService.MarkRequestStatusAsync(candidate.RequestId, AccountDeletionStatusCodes.Failed, ex.Message, now, cancellationToken);
                await deletionService.WriteAuditEventAsync(
                    candidate.UserId,
                    PrivacyAuditEventTypes.AccountDeletionFailed,
                    JsonSerializer.Serialize(new { requestId = candidate.RequestId, error = ex.Message }),
                    now,
                    cancellationToken);
                failed++;
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                await tx.RollbackAsync(cancellationToken);
                logger.LogError(ex, "Account deletion purge threw for request {RequestId}", candidate.RequestId);
                failed++;
            }
        }

        return new AccountDeletionPurgeResult(processed, skipped, failed);
    }
}
