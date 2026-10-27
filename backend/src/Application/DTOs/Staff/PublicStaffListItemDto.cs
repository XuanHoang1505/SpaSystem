namespace NhuNguyetSpa.Application.DTOs.Staff;

/// <summary>What guests, customers and staff see in <c>GET /staff</c> (no contact details).</summary>
public sealed record PublicStaffListItemDto(Guid Id, string FullName, string? Specialty, string? AvatarUrl);
