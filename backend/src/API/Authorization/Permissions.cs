using SecurityRoles = NhuNguyetSpa.Application.Common.Security.Roles;

namespace NhuNguyetSpa.API.Authorization;

/// <summary>
/// Permission → roles, following the RBAC table (sheet 21 of the analysis workbook). Each entry becomes an authorization
/// policy with the permission's name; later use cases add their permissions here and use <c>[Authorize(Policy = ...)]</c>.
/// Read permissions open to everyone (catalog.view) need no policy: those endpoints are <c>[AllowAnonymous]</c>.
/// </summary>
public static class Permissions
{
    public const string AccountSelf = "account.self";
    public const string AccountManage = "account.manage";
    public const string CatalogManage = "catalog.manage";
    public const string StaffManage = "staff.manage";
    public const string ScheduleManage = "schedule.manage";
    public const string PromotionManage = "promotion.manage";
    public const string CartSelf = "cart.self";
    public const string OrderSelf = "order.self";
    public const string OrderManage = "order.manage";
    public const string AppointmentManage = "appointment.manage";
    public const string AppointmentSelf = "appointment.self";
    public const string PurchaseSelf = "purchase.self";
    public const string ScheduleSelf = "schedule.self";
    public const string CareWrite = "care.write";
    /// <summary>A staff member declares their own certifications (docs/specs/staff.md, BR-STF-14).</summary>
    public const string CertificationSelf = "certification.self";
    public const string TreatmentManage = "treatment.manage";
    public const string ReportView = "report.view";
    /// <summary>Saved assistant history; guests chat anonymously without it (Q-01), staff and owners not at all (Q-60).</summary>
    public const string AiChat = "ai.chat";
    /// <summary>A customer reviews what they used (UC-SPA-30).</summary>
    public const string ReviewWrite = "review.write";
    /// <summary>The owner replies to, hides and shows reviews (UC-SPA-31).</summary>
    public const string ReviewManage = "review.manage";

    public static readonly IReadOnlyDictionary<string, string[]> Roles = new Dictionary<string, string[]>
    {
        [AccountSelf] = [SecurityRoles.Customer, SecurityRoles.Staff, SecurityRoles.Owner],
        [AccountManage] = [SecurityRoles.Owner],
        [CatalogManage] = [SecurityRoles.Owner],
        [StaffManage] = [SecurityRoles.Owner],
        [ScheduleManage] = [SecurityRoles.Owner],
        [PromotionManage] = [SecurityRoles.Owner],
        [CartSelf] = [SecurityRoles.Customer],
        [OrderSelf] = [SecurityRoles.Customer],
        [OrderManage] = [SecurityRoles.Owner],
        [AppointmentManage] = [SecurityRoles.Owner],
        [AppointmentSelf] = [SecurityRoles.Customer],
        [PurchaseSelf] = [SecurityRoles.Customer],
        [ScheduleSelf] = [SecurityRoles.Staff],
        [CareWrite] = [SecurityRoles.Staff],
        [CertificationSelf] = [SecurityRoles.Staff],
        [TreatmentManage] = [SecurityRoles.Owner, SecurityRoles.Staff],
        [ReportView] = [SecurityRoles.Owner],
        [AiChat] = [SecurityRoles.Customer],
        [ReviewWrite] = [SecurityRoles.Customer],
        [ReviewManage] = [SecurityRoles.Owner],
    };
}
