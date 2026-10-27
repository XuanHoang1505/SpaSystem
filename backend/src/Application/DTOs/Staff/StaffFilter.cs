namespace NhuNguyetSpa.Application.DTOs.Staff;

/// <summary>Query-string filters for <c>GET /staff</c>. <see cref="Status"/> (working | resigned) applies to the owner only.</summary>
public sealed class StaffFilter
{
    public string? Status { get; set; }
    public Guid? SpaServiceId { get; set; }
}
