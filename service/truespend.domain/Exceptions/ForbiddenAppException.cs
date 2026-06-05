namespace TrueSpend.Domain.Exceptions;

public sealed class ForbiddenAppException : AppException
{
    public ForbiddenAppException(string message) : base(message) { }
}
