using System.Security.Claims;
using NhuNguyetSpa.Application.Common.Interfaces;

namespace NhuNguyetSpa.API.Services;

public sealed class HttpCurrentUserService(IHttpContextAccessor accessor) : ICurrentUserService
{
    private ClaimsPrincipal? User => accessor.HttpContext?.User;
    public bool IsAuthenticated => User?.Identity?.IsAuthenticated == true;
    public Guid? UserId => IsAuthenticated && Guid.TryParse(User?.FindFirstValue(ClaimTypes.NameIdentifier), out var id) ? id : null;
    public IReadOnlyCollection<string> Roles => IsAuthenticated
        ? User?.FindAll(ClaimTypes.Role).Select(claim => claim.Value).Distinct().ToArray() ?? []
        : [];
}
