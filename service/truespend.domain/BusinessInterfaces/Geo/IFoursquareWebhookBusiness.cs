using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Geo;

namespace TrueSpend.Domain.BusinessInterfaces.Geo;

public interface IFoursquareWebhookBusiness
{
    Task<BusinessResponse<FoursquareWebhookResult>> HandleEventAsync(
        FoursquareWebhookInput input,
        CancellationToken cancellationToken);
}
