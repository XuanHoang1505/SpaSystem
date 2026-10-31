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
    public const string StaffManage = "staff.manage";
    public const string ScheduleManage = "schedule.manage";
    public const string PromotionManage = "promotion.manage";
    public const string CartSelf = "cart.self";
    public const string OrderSelf = "order.self";
    public const string AppointmentManage = "appointment.manage";
    public const string AppointmentSelf = "appointment.self";
    public const string PurchaseSelf = "purchase.self";

    public static readonly IReadOnlyDictionary<string, string[]> Roles = new Dictionary<string, string[]>
    {
        [CatalogManage] = [SecurityRoles.Owner],
        [StaffManage] = [SecurityRoles.Owner],
        [ScheduleManage] = [SecurityRoles.Owner],
        [PromotionManage] = [SecurityRoles.Owner],
        [CartSelf] = [SecurityRoles.Customer],
        [OrderSelf] = [SecurityRoles.Customer],
        [AppointmentManage] = [SecurityRoles.Owner],
        [AppointmentSelf] = [SecurityRoles.Customer],
        [PurchaseSelf] = [SecurityRoles.Customer],
    };
}
