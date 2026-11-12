using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

public interface IRefreshTokenRepository : IRepository<RefreshToken>
{
    /// <summary>Finds a token by its SHA-256 hash, including its <see cref="RefreshToken.User"/>.</summary>
    Task<RefreshToken?> FindByHashAsync(string tokenHash, CancellationToken cancellationToken);

    /// <summary>
    /// Rotation only: atomically sets <c>RevokedAtUtc</c> if the token is still active, immediately in the database.
    /// Returns false when another request revoked it first, so two concurrent refreshes cannot both succeed. A marked
    /// token that comes back later is the theft signal of BR-AUTH-04.
    /// </summary>
    Task<bool> TryRevokeAsync(Guid tokenId, DateTime nowUtc, CancellationToken cancellationToken);

    /// <summary>
    /// Explicit revocation of one token (logout, account no longer active), immediately in the database. The row is
    /// deleted, not marked, so sending it again is just an unknown token (BR-AUTH-23).
    /// </summary>
    Task DeleteAsync(Guid tokenId, CancellationToken cancellationToken);

    /// <summary>
    /// Explicit revocation of every unrevoked, unexpired token of the user (password change or reset, lock, resignation,
    /// detected reuse); the rows are deleted with the unit of work (BR-AUTH-23).
    /// </summary>
    Task DeleteAllActiveAsync(Guid userId, DateTime nowUtc, CancellationToken cancellationToken);
}
