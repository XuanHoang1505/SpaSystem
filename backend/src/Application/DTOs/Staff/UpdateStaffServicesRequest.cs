namespace NhuNguyetSpa.Application.DTOs.Staff;

/// <summary>Body of <c>PUT /staff/{id}/services</c>: replaces the whole list (may be empty).</summary>
public sealed record UpdateStaffServicesRequest(IReadOnlyList<Guid>? SpaServiceIds);
