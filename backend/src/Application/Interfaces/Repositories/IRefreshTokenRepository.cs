using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

public interface IRefreshTokenRepository : IRepository<RefreshToken>
{
    /// <summary>Finds a token by its SHA-256 hash, including its <see cref="RefreshToken.User"/>.</summary>
    Task<RefreshToken?> FindByHashAsync(string tokenHash, CancellationToken cancellationToken);

    /// <summary>
    /// Atomically sets <c>RevokedAtUtc</c> only if the token is still active, immediately in the database.
    /// Returns false when another request revoked it first, so two concurrent refreshes cannot both succeed.
    /// </summary>
    Task<bool> TryRevokeAsync(Guid tokenId, DateTime nowUtc, CancellationToken cancellationToken);

    /// <summary>Marks every unrevoked, unexpired token of the user as revoked; saved with the unit of work.</summary>
    Task RevokeAllActiveAsync(Guid userId, DateTime nowUtc, CancellationToken cancellationToken);
}
