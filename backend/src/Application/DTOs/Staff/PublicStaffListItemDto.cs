namespace NhuNguyetSpa.Application.DTOs.Staff;

/// <summary>What guests, customers and staff see in <c>GET /staff</c> (no contact details).</summary>
/// <remarks><see cref="Certifications"/>: names of verified, public, unexpired certifications (BR-STF-13).</remarks>
public sealed record PublicStaffListItemDto(
    Guid Id, string FullName, string? Specialty, string? AvatarUrl, IReadOnlyList<string> Certifications);
