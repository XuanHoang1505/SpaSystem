namespace NhuNguyetSpa.Application.DTOs.Staff;

/// <summary>
/// Query-string filters for <c>GET /staff</c>. <see cref="Status"/> (working | resigned) applies to the owner only.
/// <see cref="View"/> = <c>public</c> asks for the public list whoever calls, so a page built for guests (home team,
/// service staff) gets the same shape when an owner is signed in.
/// </summary>
public sealed class StaffFilter
{
    public const string PublicView = "public";

    public string? Status { get; set; }
    public Guid? SpaServiceId { get; set; }
    public string? View { get; set; }

    public bool WantsPublicView => string.Equals(View, PublicView, StringComparison.OrdinalIgnoreCase);
}
