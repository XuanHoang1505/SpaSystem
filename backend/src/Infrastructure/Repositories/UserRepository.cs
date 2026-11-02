using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Users;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

// Name search uses f_unaccent(lower(x)) on both sides like the catalog; "%", "_" and "\" in the search text are literal.
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

    public Task<bool> IsResignedStaffAsync(Guid userId, DateOnly today, CancellationToken cancellationToken) =>
        Context.StaffMembers.AnyAsync(staff => staff.Id == userId && staff.ResignationDate <= today, cancellationToken);

    public async Task<PagedResult<UserListItemDto>> SearchAsync(UserSearchCriteria criteria, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(criteria);
        var query = Set.AsNoTracking();
        if (criteria.Search is { } search)
        {
            var pattern = CatalogSearchText.Contains(search);
            query = query.Where(user =>
                EF.Functions.Like(AppDbContext.Unaccent(user.FullName.ToLower()), AppDbContext.Unaccent(pattern.ToLower()), CatalogSearchText.EscapeCharacter) ||
                EF.Functions.ILike(user.Email, pattern, CatalogSearchText.EscapeCharacter) ||
                EF.Functions.Like(user.PhoneNumber, pattern, CatalogSearchText.EscapeCharacter));
        }
        if (criteria.Role is { } role)
            query = query.Where(user => user.Role == role);
        if (criteria.Status is { } status)
            query = query.Where(user => user.Status == status);

        var total = await query.CountAsync(cancellationToken);
        var items = await query
            .OrderByDescending(user => user.CreatedAtUtc)
            .ThenBy(user => user.Id)
            .Skip((criteria.PageNumber - 1) * criteria.PageSize)
            .Take(criteria.PageSize)
            .Select(user => new UserListItemDto(
                user.Id, user.FullName, user.Email, user.PhoneNumber, user.Role, user.Status, user.AvatarUrl, user.CreatedAtUtc))
            .ToListAsync(cancellationToken);
        return new PagedResult<UserListItemDto>(items, criteria.PageNumber, criteria.PageSize, total);
    }

    public Task<UserDetailDto?> GetDetailAsync(Guid id, CancellationToken cancellationToken) =>
        (from user in Set.AsNoTracking()
         where user.Id == id
         join staff in Context.StaffMembers on user.Id equals staff.Id into staffMembers
         from staff in staffMembers.DefaultIfEmpty()
         select new UserDetailDto(
             user.Id, user.FullName, user.Email, user.PhoneNumber, user.Role, user.Status, user.AvatarUrl, user.DateOfBirth, user.Gender,
             user.CreatedAtUtc, user.UpdatedAtUtc,
             staff == null ? null : new UserStaffInfoDto(staff.HireDate, staff.ResignationDate)))
        .FirstOrDefaultAsync(cancellationToken);
}
