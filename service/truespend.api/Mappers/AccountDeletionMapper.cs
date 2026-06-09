using TrueSpend.Api.ViewModels.Privacy;
using TrueSpend.Domain.Models.Privacy;

namespace TrueSpend.Api.Mappers;

public interface IAccountDeletionMapper
{
    AccountDeletionStatusResponseVm ToStatusResponse(AccountDeletionStatus domain);
}

public sealed class AccountDeletionMapper : IAccountDeletionMapper
{
    public AccountDeletionStatusResponseVm ToStatusResponse(AccountDeletionStatus domain) =>
        new(domain.State, domain.RequestedAt, domain.PurgeAfter);
}
