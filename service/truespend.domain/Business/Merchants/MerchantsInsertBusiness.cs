using TrueSpend.Domain.BusinessInterfaces.Merchants;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Merchants;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.Merchants;

public sealed class MerchantsInsertBusiness(
    IMerchantsInsertService insertService,
    IMerchantsReadService readService,
    IMessagingInsertService messagingInsertService, // archived: kept for future async migration
    IUnitOfWork unitOfWork,
    MerchantsValidator validator) : IMerchantsInsertBusiness
{
    public async Task<BusinessResponse<MerchantResponse>> ResolveMerchantAsync(
        OnboardingWorkflowUser user,
        ResolveMerchantRequest request,
        CancellationToken cancellationToken)
    {
        _ = messagingInsertService;

        var errors = validator.ValidateResolveMerchant(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<MerchantResponse>.Fail(errors, 400);
        }

        var match = await readService.ResolveCategoryAsync(request.Name, cancellationToken);
        var merchant = await insertService.SaveMerchantAsync(
            request.Name,
            request.Provider,
            request.ProviderPlaceId,
            match.CategoryCode,
            match.IsMultiCategory,
            request.Address,
            cancellationToken);
        return BusinessResponse<MerchantResponse>.Ok(new MerchantResponse(merchant));
    }

    public async Task<BusinessResponse<MerchantVisitsResponse>> CreateVisitAsync(
        OnboardingWorkflowUser user,
        CreateMerchantVisitRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateCreateVisit(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<MerchantVisitsResponse>.Fail(errors, 400);
        }

        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            await insertService.RecordVisitAsync(user, request.MerchantId, request.SelectedCategoryCode, request.VisitedAt, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        var visits = await insertService.GetVisitsAsync(user, cancellationToken);
        return BusinessResponse<MerchantVisitsResponse>.Ok(new MerchantVisitsResponse(visits));
    }

    #region archive — async event-publish (disabled in MVP)
    // CreateVisitAsync previously published MerchantVisitCreated to the messaging outbox.
    // The MerchantVisitCreatedHandler in truespend.eventconsumer was log-only, so no inline
    // replacement is needed.
    //
    // using System.Text.Json;
    // using TrueSpend.Domain.Constants;
    //
    // // Inside the committing tx, after RecordVisitAsync:
    // var payload = JsonSerializer.Serialize(new
    // {
    //     userId = user.UserId,
    //     merchantId = request.MerchantId,
    //     selectedCategoryCode = request.SelectedCategoryCode,
    //     visitedAt = request.VisitedAt
    // });
    // await messagingInsertService.EnqueueOutboxEventAsync(
    //     EventTypes.MerchantVisitCreated,
    //     "finance.merchant_visit",
    //     request.MerchantId,
    //     payload,
    //     $"{user.UserId}:{request.MerchantId}:{request.VisitedAt.UtcTicks}",
    //     cancellationToken);
    #endregion
}
