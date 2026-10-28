using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

public sealed class RefreshTokenRepository : Repository<RefreshToken>, IRefreshTokenRepository
{
    public RefreshTokenRepository(AppDbContext context) : base(context)
    {
    }

    public Task<RefreshToken?> FindByHashAsync(string tokenHash, CancellationToken cancellationToken) =>
        Set.Include(token => token.User).FirstOrDefaultAsync(token => token.TokenHash == tokenHash, cancellationToken);

    public async Task<bool> TryRevokeAsync(Guid tokenId, DateTime nowUtc, CancellationToken cancellationToken)
    {
        // A conditional UPDATE is atomic in PostgreSQL: of two concurrent refreshes only one sees an affected row.
        var affected = await Set
            .Where(token => token.Id == tokenId && token.RevokedAtUtc == null)
            .ExecuteUpdateAsync(setters => setters.SetProperty(token => token.RevokedAtUtc, nowUtc), cancellationToken);
        return affected == 1;
    }

    public async Task RevokeAllActiveAsync(Guid userId, DateTime nowUtc, CancellationToken cancellationToken)
    {
        var active = await Set
            .Where(token => token.UserId == userId && token.RevokedAtUtc == null && token.ExpiresAtUtc > nowUtc)
            .ToListAsync(cancellationToken);
        foreach (var token in active)
            token.RevokedAtUtc = nowUtc;
    }
}
