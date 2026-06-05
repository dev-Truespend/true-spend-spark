namespace TrueSpend.Domain.Exceptions;

public sealed class ValidationAppException : AppException
{
    public IReadOnlyList<string> Errors { get; }
    public ValidationAppException(IReadOnlyList<string> errors) : base(ExceptionMessages.ValidationFailed)
    {
        Errors = errors;
    }
}
