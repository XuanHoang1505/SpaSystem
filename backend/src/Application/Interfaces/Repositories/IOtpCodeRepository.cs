using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

/// <summary>
/// OTP rows (docs/specs/auth.md, BR-AUTH-07/08). Email comparisons are case-insensitive (citext).
/// Methods named Try*/Expire*/Delete* write to the database immediately, outside the unit of work.
/// </summary>
public interface IOtpCodeRepository : IRepository<OtpCode>
{
    /// <summary>
    /// Takes a transaction-scoped lock on (email, purpose) so concurrent "send code" requests run one after another;
    /// call inside <c>IUnitOfWork.ExecuteInTransactionAsync</c>. The lock is released at commit or rollback.
    /// </summary>
    Task LockAsync(string email, OtpPurpose purpose, CancellationToken cancellationToken);

    /// <summary>The newest code for this email and purpose, including used, expired or locked ones.</summary>
    Task<OtpCode?> FindLatestAsync(string email, OtpPurpose purpose, CancellationToken cancellationToken);

    /// <summary>Creation time of the newest code for this email and purpose (used for the resend cooldown).</summary>
    Task<DateTime?> GetLastSentAtAsync(string email, OtpPurpose purpose, CancellationToken cancellationToken);

    /// <summary>Sets <c>ExpiresAtUtc</c> to <paramref name="nowUtc"/> on every unused, unexpired code of this email and purpose.</summary>
    Task ExpireActiveAsync(string email, OtpPurpose purpose, DateTime nowUtc, CancellationToken cancellationToken);

    /// <summary>Atomically marks the code used if it is unused, unexpired and below <paramref name="maxFailedAttempts"/>.</summary>
    Task<bool> TryConsumeAsync(Guid id, DateTime nowUtc, int maxFailedAttempts, CancellationToken cancellationToken);

    /// <summary>Atomically adds one failed attempt while below the limit; returns the new count, or null when already at the limit.</summary>
    Task<int?> TryRecordFailureAsync(Guid id, int maxFailedAttempts, CancellationToken cancellationToken);

    Task DeleteAsync(Guid id, CancellationToken cancellationToken);
}
