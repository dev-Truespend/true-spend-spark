using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.ServiceInterfaces.Plaid;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using Microsoft.EntityFrameworkCore;

namespace TrueSpend.Domain.Services.Plaid;

public sealed class PlaidReadService(TrueSpendDbContext db) : IPlaidReadService
{
    public async Task<PlaidConnectionsResponse> GetConnectionsAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var connections = await (from item in db.PlaidItems.AsNoTracking().Where(x => x.UserId == user.UserId)
                                 join status in db.PlaidItemStatuses.AsNoTracking() on item.StatusId equals status.Id
                                 join account in db.PlaidAccounts.AsNoTracking() on item.Id equals account.PlaidItemId into accounts
                                 from acct in accounts.DefaultIfEmpty()
                                 join uc in db.UserCards.AsNoTracking().Where(c => c.IsActive) on acct.Id equals uc.PlaidAccountId into cards
                                 from card in cards.DefaultIfEmpty()
                                 group card by new
                                 {
                                     item.Id,
                                     item.InstitutionName,
                                     item.InstitutionLogoUrl,
                                     StatusCode = status.Code,
                                     item.LastSyncAt
                                 } into g
                                 select new PlaidConnection(
                                     g.Key.Id,
                                     g.Key.InstitutionName,
                                     g.Key.InstitutionLogoUrl,
                                     g.Key.StatusCode,
                                     g.Key.LastSyncAt,
                                     g.Count(c => c != null)))
                                .ToListAsync(cancellationToken);

        return new PlaidConnectionsResponse(connections);
    }

    public async Task<PlaidConnectionCredentials?> GetConnectionCredentialsAsync(OnboardingWorkflowUser user, int connectionId, CancellationToken cancellationToken)
    {
        var item = await db.PlaidItems.AsNoTracking()
            .Where(x => x.UserId == user.UserId && x.Id == connectionId)
            .Select(x => new { x.AccessTokenEncrypted, x.TransactionSyncCursor })
            .FirstOrDefaultAsync(cancellationToken);

        return item is null ? null : new PlaidConnectionCredentials(item.AccessTokenEncrypted, item.TransactionSyncCursor);
    }

    public async Task<IReadOnlyList<PlaidActiveConnection>> GetActiveConnectionsAsync(CancellationToken cancellationToken)
    {
        return await (from item in db.PlaidItems.AsNoTracking()
                      join status in db.PlaidItemStatuses.AsNoTracking() on item.StatusId equals status.Id
                      where status.Code == "active"
                      join profile in db.Profiles.AsNoTracking() on item.UserId equals profile.UserId into profiles
                      from profile in profiles.DefaultIfEmpty()
                      select new PlaidActiveConnection(item.Id, item.UserId, profile != null ? profile.Email : null))
                     .ToListAsync(cancellationToken);
    }

    public async Task<PlaidConnection?> FindConnectionAsync(OnboardingWorkflowUser user, int connectionId, CancellationToken cancellationToken)
    {
        return await (from item in db.PlaidItems.AsNoTracking().Where(x => x.UserId == user.UserId && x.Id == connectionId)
                      join status in db.PlaidItemStatuses.AsNoTracking() on item.StatusId equals status.Id
                      join account in db.PlaidAccounts.AsNoTracking() on item.Id equals account.PlaidItemId into accounts
                      from acct in accounts.DefaultIfEmpty()
                      join uc in db.UserCards.AsNoTracking().Where(c => c.IsActive) on acct.Id equals uc.PlaidAccountId into cards
                      from card in cards.DefaultIfEmpty()
                      group card by new
                      {
                          item.Id,
                          item.InstitutionName,
                          item.InstitutionLogoUrl,
                          StatusCode = status.Code,
                          item.LastSyncAt
                      } into g
                      select new PlaidConnection(
                          g.Key.Id,
                          g.Key.InstitutionName,
                          g.Key.InstitutionLogoUrl,
                          g.Key.StatusCode,
                          g.Key.LastSyncAt,
                          g.Count(c => c != null)))
                     .FirstOrDefaultAsync(cancellationToken);
    }
}
