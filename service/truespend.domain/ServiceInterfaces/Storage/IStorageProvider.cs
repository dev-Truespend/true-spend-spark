using TrueSpend.Domain.Models.Storage;

namespace TrueSpend.Domain.ServiceInterfaces.Storage;

public interface IStorageProvider
{
    Task<string> UploadAsync(UploadObjectRequest request, CancellationToken cancellationToken);
}
