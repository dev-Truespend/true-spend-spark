using System.Text.Json;
using TrueSpend.Domain.BusinessInterfaces.Merchants;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Cards;
using TrueSpend.Domain.Models.Catalog;
using TrueSpend.Domain.Models.Billing;
using TrueSpend.Domain.Models.Plaid;
using TrueSpend.Domain.Models.Devices;
using TrueSpend.Domain.Models.NotificationSettings;
using TrueSpend.Domain.Models.Permissions;
using TrueSpend.Domain.Models.Recommendations;
using TrueSpend.Domain.ServiceInterfaces.Merchants;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.Merchants;

public sealed class MerchantsInsertBusiness(
    IMerchantsInsertService insertService,
    IMerchantsReadService readService,
    IMessagingInsertService messagingInsertService,
    IUnitOfWork unitOfWork,
    MerchantsValidator validator) : IMerchantsInsertBusiness
{
    public async Task<BusinessResponse<MerchantResponse>> ResolveMerchantAsync(
        OnboardingWorkflowUser user,
        ResolveMerchantRequest request,
        CancellationToken cancellationToken)
    {
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

        MerchantVisit visit;
        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            visit = await insertService.RecordVisitAsync(user, request.MerchantId, request.SelectedCategoryCode, request.VisitedAt, cancellationToken);
            var payload = JsonSerializer.Serialize(new
            {
                userId = user.UserId,
                merchantId = request.MerchantId,
                selectedCategoryCode = request.SelectedCategoryCode,
                visitedAt = request.VisitedAt
            });
            await messagingInsertService.EnqueueOutboxEventAsync(
                EventTypes.MerchantVisitCreated,
                "finance.merchant_visit",
                request.MerchantId,
                payload,
                $"{user.UserId}:{request.MerchantId}:{request.VisitedAt.UtcTicks}",
                cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        var visits = await insertService.GetVisitsAsync(user, cancellationToken);
        return BusinessResponse<MerchantVisitsResponse>.Ok(new MerchantVisitsResponse(visits));
    }
}
