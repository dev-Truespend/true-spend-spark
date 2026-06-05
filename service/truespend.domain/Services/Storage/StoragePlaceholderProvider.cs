using TrueSpend.Domain.Models.Storage;
using TrueSpend.Domain.ServiceInterfaces.Storage;

namespace TrueSpend.Domain.Services.Storage;

public sealed class StoragePlaceholderProvider : IStorageProvider
{
    public Task<string> UploadAsync(UploadObjectRequest request, CancellationToken cancellationToken)
    {
        var url = $"https://placeholder.truespend.local/{request.Bucket}/{request.ObjectKey}";
        return Task.FromResult(url);
    }
}
