using Microsoft.EntityFrameworkCore.Storage;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.ServiceInterfaces.Persistence;

namespace TrueSpend.Domain.Services.Persistence;

public sealed class UnitOfWork(TrueSpendDbContext db) : IUnitOfWork
{
    public async Task<IUnitOfWorkTransaction> BeginTransactionAsync(CancellationToken cancellationToken)
    {
        var tx = await db.Database.BeginTransactionAsync(cancellationToken);
        return new UnitOfWorkTransaction(tx);
    }
}

internal sealed class UnitOfWorkTransaction(IDbContextTransaction tx) : IUnitOfWorkTransaction
{
    public Task CommitAsync(CancellationToken cancellationToken) => tx.CommitAsync(cancellationToken);

    public Task RollbackAsync(CancellationToken cancellationToken) => tx.RollbackAsync(cancellationToken);

    public ValueTask DisposeAsync() => tx.DisposeAsync();
}
