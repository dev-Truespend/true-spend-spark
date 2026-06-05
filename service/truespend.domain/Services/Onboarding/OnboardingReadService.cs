using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.ServiceInterfaces.Onboarding;

namespace TrueSpend.Domain.Services.Onboarding;

public sealed class OnboardingReadService(TrueSpendDbContext db) : IOnboardingReadService
{
    public async Task<OnboardingResponse> GetOnboardingAsync(OnboardingWorkflowUser user, CancellationToken cancellationToken)
    {
        var state = await db.OnboardingStates.AsNoTracking().FirstOrDefaultAsync(x => x.UserId == user.UserId, cancellationToken);
        if (state is null)
        {
            return new OnboardingResponse("welcome", false, false, false, false);
        }

        var stepCode = await db.OnboardingSteps.AsNoTracking()
            .Where(x => x.Id == state.CurrentStepId)
            .Select(x => x.Code)
            .FirstOrDefaultAsync(cancellationToken) ?? "welcome";

        return new OnboardingResponse(
            stepCode,
            state.CardConnectionPlaid,
            state.CardConnectionManual,
            state.CardConnectionSkipped,
            state.CompletedAt is not null);
    }
}
