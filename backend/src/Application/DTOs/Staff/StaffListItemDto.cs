using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Staff;

/// <summary>Owner view of one staff member in <c>GET /staff</c>.</summary>
public sealed record StaffListItemDto(
    Guid Id,
    string FullName,
    string Email,
    string PhoneNumber,
    string? AvatarUrl,
    string? Specialty,
    DateOnly HireDate,
    DateOnly? ResignationDate,
    UserStatus AccountStatus,
    IReadOnlyList<StaffServiceDto> Services);
