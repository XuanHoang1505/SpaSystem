using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

public sealed class UserRepository : Repository<User>, IUserRepository
{
    public UserRepository(AppDbContext context) : base(context)
    {
    }

    // users.email is citext, so the equality below is case-insensitive in PostgreSQL.
    public Task<User?> FindByLoginAsync(string login, CancellationToken cancellationToken) => login.Contains('@')
        ? Set.FirstOrDefaultAsync(user => user.Email == login, cancellationToken)
        : Set.FirstOrDefaultAsync(user => user.PhoneNumber == login, cancellationToken);

    public Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken) =>
        Set.FirstOrDefaultAsync(user => user.Email == email, cancellationToken);

    public Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken) =>
        Set.AnyAsync(user => user.Email == email, cancellationToken);

    public Task<bool> ExistsByPhoneAsync(string phoneNumber, CancellationToken cancellationToken) =>
        Set.AnyAsync(user => user.PhoneNumber == phoneNumber, cancellationToken);
}
