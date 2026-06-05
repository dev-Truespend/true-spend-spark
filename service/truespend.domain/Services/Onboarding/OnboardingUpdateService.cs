using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.Entities.App;
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

public sealed class OnboardingUpdateService(TrueSpendDbContext db) : IOnboardingUpdateService
{
    public async Task<OnboardingResponse> SaveOnboardingAsync(
        OnboardingWorkflowUser user,
        OnboardingResponse onboarding,
        CancellationToken cancellationToken)
    {
        var stepId = await db.OnboardingSteps
            .Where(x => x.Code == onboarding.CurrentStepCode)
            .Select(x => x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        var state = await db.OnboardingStates.FirstOrDefaultAsync(x => x.UserId == user.UserId, cancellationToken);
        var now = DateTimeOffset.UtcNow;

        if (state is null)
        {
            state = new OnboardingStateEntity
            {
                UserId = user.UserId,
                CurrentStepId = stepId,
                CardConnectionPlaid = onboarding.CardConnectionPlaid,
                CardConnectionManual = onboarding.CardConnectionManual,
                CardConnectionSkipped = onboarding.CardConnectionSkipped,
                CompletedAt = onboarding.Completed ? now : null,
                CreatedAt = now,
                UpdatedAt = now
            };
            db.OnboardingStates.Add(state);
        }
        else
        {
            state.CurrentStepId = stepId;
            state.CardConnectionPlaid = onboarding.CardConnectionPlaid;
            state.CardConnectionManual = onboarding.CardConnectionManual;
            state.CardConnectionSkipped = onboarding.CardConnectionSkipped;
            state.CompletedAt = onboarding.Completed ? state.CompletedAt ?? now : null;
            state.UpdatedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken);

        return new OnboardingResponse(
            onboarding.CurrentStepCode,
            state.CardConnectionPlaid,
            state.CardConnectionManual,
            state.CardConnectionSkipped,
            state.CompletedAt is not null);
    }
}
