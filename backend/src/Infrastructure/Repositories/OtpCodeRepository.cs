using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

public sealed class OtpCodeRepository : Repository<OtpCode>, IOtpCodeRepository
{
    public OtpCodeRepository(AppDbContext context) : base(context)
    {
    }

    public Task LockAsync(string email, OtpPurpose purpose, CancellationToken cancellationToken)
    {
        // Lower-cased to match citext equality; the advisory lock is held until the surrounding transaction ends.
        var key = email.ToLowerInvariant() + ":" + purpose;
        return Context.Database.ExecuteSqlAsync($"SELECT pg_advisory_xact_lock(hashtext({key}))", cancellationToken);
    }

    // otp_codes.email is citext, so the equalities below are case-insensitive in PostgreSQL.
    public Task<OtpCode?> FindLatestAsync(string email, OtpPurpose purpose, CancellationToken cancellationToken) =>
        Set.Where(otp => otp.Email == email && otp.Purpose == purpose)
            .OrderByDescending(otp => otp.CreatedAtUtc)
            .FirstOrDefaultAsync(cancellationToken);

    public Task<DateTime?> GetLastSentAtAsync(string email, OtpPurpose purpose, CancellationToken cancellationToken) =>
        Set.Where(otp => otp.Email == email && otp.Purpose == purpose)
            .MaxAsync(otp => (DateTime?)otp.CreatedAtUtc, cancellationToken);

    public Task ExpireActiveAsync(string email, OtpPurpose purpose, DateTime nowUtc, CancellationToken cancellationToken) =>
        Set.Where(otp => otp.Email == email && otp.Purpose == purpose && otp.UsedAtUtc == null && otp.ExpiresAtUtc > nowUtc)
            .ExecuteUpdateAsync(setters => setters.SetProperty(otp => otp.ExpiresAtUtc, nowUtc), cancellationToken);

    public async Task<bool> TryConsumeAsync(Guid id, DateTime nowUtc, int maxFailedAttempts, CancellationToken cancellationToken)
    {
        // A conditional UPDATE is atomic in PostgreSQL: of two concurrent verifications only one sees an affected row.
        var affected = await Set
            .Where(otp => otp.Id == id && otp.UsedAtUtc == null && otp.ExpiresAtUtc > nowUtc && otp.FailedAttempts < maxFailedAttempts)
            .ExecuteUpdateAsync(setters => setters.SetProperty(otp => otp.UsedAtUtc, nowUtc), cancellationToken);
        return affected == 1;
    }

    public async Task<int?> TryRecordFailureAsync(Guid id, int maxFailedAttempts, CancellationToken cancellationToken)
    {
        // Increment and read back in one statement so parallel wrong guesses cannot exceed the limit.
        var counts = await Context.Database.SqlQuery<int>($"""
            UPDATE otp_codes SET failed_attempts = failed_attempts + 1
            WHERE id = {id} AND failed_attempts < {maxFailedAttempts}
            RETURNING failed_attempts AS "Value"
            """).ToListAsync(cancellationToken);
        return counts.Count == 0 ? null : counts[0];
    }

    public Task DeleteAsync(Guid id, CancellationToken cancellationToken) =>
        Set.Where(otp => otp.Id == id).ExecuteDeleteAsync(cancellationToken);
}
