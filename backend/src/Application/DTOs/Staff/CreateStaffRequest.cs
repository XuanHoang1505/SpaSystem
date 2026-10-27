namespace NhuNguyetSpa.Application.DTOs.Staff;

/// <summary>Body of <c>POST /staff</c> (UC-SPA-22). The password is generated and mailed, never sent by the client.</summary>
public sealed record CreateStaffRequest(
    string FullName,
    string Email,
    string PhoneNumber,
    DateOnly? HireDate,
    string? Specialty,
    IReadOnlyList<Guid>? SpaServiceIds);
