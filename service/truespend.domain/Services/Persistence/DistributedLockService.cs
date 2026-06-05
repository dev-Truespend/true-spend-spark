using System.Data;
using Microsoft.EntityFrameworkCore;
using TrueSpend.Domain.DbContext;
using TrueSpend.Domain.ServiceInterfaces.Persistence;

namespace TrueSpend.Domain.Services.Persistence;

public sealed class DistributedLockService(TrueSpendDbContext db) : IDistributedLockService
{
    public async Task<IDistributedLockHandle?> TryAcquireAsync(string lockKey, CancellationToken cancellationToken)
    {
        var key = ComputeKey(lockKey);

        // Reference-count the connection open so the session (and the advisory lock) survives across EF commands.
        await db.Database.OpenConnectionAsync(cancellationToken);
        try
        {
            var connection = db.Database.GetDbConnection();
            await using var cmd = connection.CreateCommand();
            cmd.CommandText = "SELECT pg_try_advisory_lock(@key);";
            var p = cmd.CreateParameter();
            p.ParameterName = "@key";
            p.DbType = DbType.Int64;
            p.Value = key;
            cmd.Parameters.Add(p);

            var result = await cmd.ExecuteScalarAsync(cancellationToken);
            if (result is not true)
            {
                await db.Database.CloseConnectionAsync();
                return null;
            }

            return new DistributedLockHandle(db, key, lockKey);
        }
        catch
        {
            await db.Database.CloseConnectionAsync();
            throw;
        }
    }

    private static long ComputeKey(string lockKey)
    {
        unchecked
        {
            long hash = 1125899906842597L;
            foreach (var c in lockKey)
                hash = hash * 31 + c;
            return hash;
        }
    }
}

internal sealed class DistributedLockHandle(TrueSpendDbContext db, long key, string lockKey) : IDistributedLockHandle
{
    public string LockKey => lockKey;

    public async ValueTask DisposeAsync()
    {
        try
        {
            var connection = db.Database.GetDbConnection();
            await using var cmd = connection.CreateCommand();
            cmd.CommandText = "SELECT pg_advisory_unlock(@key);";
            var p = cmd.CreateParameter();
            p.ParameterName = "@key";
            p.DbType = DbType.Int64;
            p.Value = key;
            cmd.Parameters.Add(p);
            await cmd.ExecuteScalarAsync();
        }
        catch
        {
            // Best-effort: closing the connection below releases the session-scoped lock anyway.
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }
}
