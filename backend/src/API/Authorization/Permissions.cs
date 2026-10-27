using SecurityRoles = NhuNguyetSpa.Application.Common.Security.Roles;

namespace NhuNguyetSpa.API.Authorization;

/// <summary>
/// Permission → roles, following the RBAC table (sheet 21 of the analysis workbook). Each entry becomes an authorization
/// policy with the permission's name; later use cases add their permissions here and use <c>[Authorize(Policy = ...)]</c>.
/// Read permissions open to everyone (catalog.view) need no policy: those endpoints are <c>[AllowAnonymous]</c>.
/// </summary>
public static class Permissions
{
    public const string CatalogManage = "catalog.manage";

    public static readonly IReadOnlyDictionary<string, string[]> Roles = new Dictionary<string, string[]>
    {
        [CatalogManage] = [SecurityRoles.Owner],
    };
}
