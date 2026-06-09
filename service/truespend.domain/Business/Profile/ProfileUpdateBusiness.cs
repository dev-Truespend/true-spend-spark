using TrueSpend.Domain.BusinessInterfaces.Profile;
using TrueSpend.Domain.Constants;
using TrueSpend.Domain.Models.Common;
using TrueSpend.Domain.Models.Onboarding;
using TrueSpend.Domain.Models.Profile;
using TrueSpend.Domain.Models.Storage;
using TrueSpend.Domain.ServiceInterfaces.Messaging;
using TrueSpend.Domain.ServiceInterfaces.Persistence;
using TrueSpend.Domain.ServiceInterfaces.Profile;
using TrueSpend.Domain.ServiceInterfaces.Storage;
using TrueSpend.Domain.Validators;

namespace TrueSpend.Domain.Business.Profile;

public sealed class ProfileUpdateBusiness(
    IProfileUpdateService updateService,
    IStorageProvider storageProvider,
    IMessagingInsertService messagingInsertService, // archived: kept for future async migration
    IUnitOfWork unitOfWork,
    ProfileValidator validator) : IProfileUpdateBusiness
{
    public async Task<BusinessResponse<ProfileResponse>> UpdateProfileAsync(
        OnboardingWorkflowUser user,
        UpdateProfileRequest request,
        CancellationToken cancellationToken)
    {
        _ = messagingInsertService;

        var errors = await validator.ValidateUpdateProfileAsync(request, cancellationToken);
        if (errors.Count > 0)
        {
            return BusinessResponse<ProfileResponse>.Fail(errors, 400);
        }

        ProfileResponse profile;
        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            profile = await updateService.UpdateProfileAsync(user, request, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        return BusinessResponse<ProfileResponse>.Ok(profile);
    }

    public async Task<BusinessResponse<ProfileResponse>> UploadAvatarAsync(
        OnboardingWorkflowUser user,
        UploadAvatarRequest request,
        CancellationToken cancellationToken)
    {
        var errors = validator.ValidateUploadAvatar(request);
        if (errors.Count > 0)
        {
            return BusinessResponse<ProfileResponse>.Fail(errors, 400);
        }

        var extension = ResolveExtension(request.ContentType, request.FileName);
        var objectKey = $"{user.UserId:N}/{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}{extension}";

        var uploadedUrl = await storageProvider.UploadAsync(
            new UploadObjectRequest(StorageConstants.AvatarsBucket, objectKey, request.Content, request.ContentType, request.Length),
            cancellationToken);

        ProfileResponse profile;
        await using (var tx = await unitOfWork.BeginTransactionAsync(cancellationToken))
        {
            profile = await updateService.UpdateAvatarUrlAsync(user, uploadedUrl, cancellationToken);
            await tx.CommitAsync(cancellationToken);
        }

        return BusinessResponse<ProfileResponse>.Ok(profile);
    }

    private static string ResolveExtension(string contentType, string fileName)
    {
        var fromName = Path.GetExtension(fileName);
        if (!string.IsNullOrWhiteSpace(fromName)) return fromName.ToLowerInvariant();
        return contentType.ToLowerInvariant() switch
        {
            "image/png" => ".png",
            "image/webp" => ".webp",
            "image/heic" => ".heic",
            _ => ".jpg"
        };
    }

    #region archive — async event-publish (disabled in MVP)
    // UpdateProfileAsync and UploadAvatarAsync previously published AppProfileUpdated to the
    // messaging outbox via EnqueueProfileUpdatedAsync. AppProfileUpdated has no subscriber in
    // the EventDispatcher routes today, so no inline replacement is needed.
    //
    // using System.Text.Json;
    // using TrueSpend.Domain.Events.Profile;
    //
    // private Task EnqueueProfileUpdatedAsync(OnboardingWorkflowUser user, ProfileResponse profile, string changeKey, CancellationToken cancellationToken)
    // {
    //     var payload = JsonSerializer.Serialize(new ProfileUpdatedEvent(
    //         1, user.UserId, profile.DisplayName, profile.Phone,
    //         profile.CountryCode, profile.CurrencyCode, profile.AvatarUrl));
    //     // Guid suffix instead of yyyyMMddHHmmss so two profile saves in the same second
    //     // do not collide on the outbox idempotency_key unique constraint.
    //     return messagingInsertService.EnqueueOutboxEventAsync(
    //         EventTypes.AppProfileUpdated, "app.profile", null,
    //         payload, $"app.profile.{changeKey}.{user.UserId}.{Guid.NewGuid():N}",
    //         cancellationToken);
    // }
    //
    // // UpdateProfileAsync — inside the committing tx, after UpdateProfileAsync:
    // await EnqueueProfileUpdatedAsync(user, profile, "updated", cancellationToken);
    //
    // // UploadAvatarAsync — inside the committing tx, after UpdateAvatarUrlAsync:
    // await EnqueueProfileUpdatedAsync(user, profile, "avatar", cancellationToken);
    #endregion
}
