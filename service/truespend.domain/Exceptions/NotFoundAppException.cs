namespace TrueSpend.Domain.Exceptions;

public sealed class NotFoundAppException : AppException
{
    public NotFoundAppException(string message) : base(message) { }
}
