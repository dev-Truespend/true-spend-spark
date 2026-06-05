namespace TrueSpend.Domain.Exceptions;

public sealed class ExternalProviderAppException : AppException
{
    public string Provider { get; }
    public ExternalProviderAppException(string provider, string message) : base(message)
    {
        Provider = provider;
    }
    public ExternalProviderAppException(string provider, string message, Exception inner) : base(message, inner)
    {
        Provider = provider;
    }
}
