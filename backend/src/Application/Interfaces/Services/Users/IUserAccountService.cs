using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Users;

namespace NhuNguyetSpa.Application.Interfaces.Services.Users;

/// <summary>UC-SPA-05: the owner finds, views, edits, locks and unlocks accounts (<c>/users</c>).</summary>
public interface IUserAccountService
{
    Task<OperationResult<PagedResult<UserListItemDto>>> SearchAsync(PagedQuery query, UserFilter filter, CancellationToken cancellationToken);

    Task<OperationResult<UserDetailDto>> GetAsync(Guid id, CancellationToken cancellationToken);

    Task<OperationResult<UserDetailDto>> UpdateAsync(Guid id, UpdateProfileRequest request, CancellationToken cancellationToken);

    Task ChangeStatusAsync(Guid id, ChangeUserStatusRequest request, CancellationToken cancellationToken);
}
