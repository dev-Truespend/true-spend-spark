namespace TrueSpend.Domain.ServiceInterfaces.Persistence;

public interface IDistributedLockService
{
    Task<IDistributedLockHandle?> TryAcquireAsync(string lockKey, CancellationToken cancellationToken);
}

public interface IDistributedLockHandle : IAsyncDisposable
{
    string LockKey { get; }
}
