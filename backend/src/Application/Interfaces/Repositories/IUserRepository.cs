using NhuNguyetSpa.Domain.Entities;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

public interface IUserRepository : IRepository<User>
{
    /// <summary>
    /// <paramref name="login"/> is already trimmed. Contains '@' → match <c>Email</c> (case-insensitive citext),
    /// otherwise → match <c>PhoneNumber</c>.
    /// </summary>
    Task<User?> FindByLoginAsync(string login, CancellationToken cancellationToken);

    /// <summary>Case-insensitive (citext).</summary>
    Task<User?> FindByEmailAsync(string email, CancellationToken cancellationToken);

    Task<bool> ExistsByEmailAsync(string email, CancellationToken cancellationToken);

    Task<bool> ExistsByPhoneAsync(string phoneNumber, CancellationToken cancellationToken);

    /// <summary>True when the user is a staff member whose resignation date is on or before <paramref name="today"/> (BR-STF-05).</summary>
    Task<bool> IsResignedStaffAsync(Guid userId, DateOnly today, CancellationToken cancellationToken);
}
