using TrueSpend.Domain.ServiceInterfaces.Persistence;

namespace TrueSpend.UnitTests.Helpers;

public sealed class FakeUnitOfWork : IUnitOfWork
{
    public Task<IUnitOfWorkTransaction> BeginTransactionAsync(CancellationToken cancellationToken) =>
        Task.FromResult<IUnitOfWorkTransaction>(new FakeUnitOfWorkTransaction());
}

internal sealed class FakeUnitOfWorkTransaction : IUnitOfWorkTransaction
{
    public Task CommitAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    public Task RollbackAsync(CancellationToken cancellationToken) => Task.CompletedTask;
    public ValueTask DisposeAsync() => ValueTask.CompletedTask;
}
