namespace TrueSpend.Domain.Exceptions;

public sealed class ConflictAppException : AppException
{
    public ConflictAppException(string message) : base(message) { }
}
