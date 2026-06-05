using System.Security.Claims;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;

namespace TrueSpend.Api.Mappers;

public interface IWorkflowUserMapper
{
    OnboardingWorkflowUser FromClaims(ClaimsPrincipal user);
}

public sealed class WorkflowUserMapper : IWorkflowUserMapper
{
    public OnboardingWorkflowUser FromClaims(ClaimsPrincipal user)
    {
        var userIdClaim = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("sub");
        var email = user.FindFirstValue(ClaimTypes.Email) ?? user.FindFirstValue("email");
        return new OnboardingWorkflowUser(Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty, email);
    }
}
