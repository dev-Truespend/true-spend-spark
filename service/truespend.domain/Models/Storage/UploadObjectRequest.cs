namespace TrueSpend.Domain.Models.Storage;

public sealed record UploadObjectRequest(
    string Bucket,
    string ObjectKey,
    Stream Content,
    string ContentType,
    long Length);
