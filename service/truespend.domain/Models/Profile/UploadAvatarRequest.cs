namespace TrueSpend.Domain.Models.Profile;

public sealed record UploadAvatarRequest(
    Stream Content,
    string FileName,
    string ContentType,
    long Length);
