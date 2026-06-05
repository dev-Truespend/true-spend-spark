using TrueSpend.Domain.Models.Auth;
using TrueSpend.Domain.Models.Common;

namespace TrueSpend.Domain.BusinessInterfaces.Auth;

public interface IAuthBootstrapBusiness
{
    Task<BusinessResponse<AuthBootstrapResult>> BootstrapAsync(AuthBootstrapInput input, CancellationToken cancellationToken);
}
