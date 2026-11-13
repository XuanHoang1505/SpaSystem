using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.DTOs.Staff;

/// <summary>Validity computed on read from the Vietnam date (BR-STF-13); never stored.</summary>
public enum StaffCertificationStatus
{
    Valid,
    ExpiringSoon,
    Expired,
}

/// <summary>One certification of a staff member (owner and the staff member themselves).</summary>
public sealed record StaffCertificationDto(
    Guid Id,
    string Name,
    string? Issuer,
    string? CredentialNumber,
    DateOnly? IssuedOn,
    DateOnly? ExpiresOn,
    bool IsPublic,
    string? Note,
    string? ImageUrl,
    StaffCertificationStatus Status,
    CertificationVerificationStatus VerificationStatus,
    string? RejectionReason,
    DateTime? ReviewedAtUtc,
    DateTime CreatedAtUtc,
    DateTime? UpdatedAtUtc);

/// <summary>Body of POST/PUT <c>/staff/{id}/certifications</c> and <c>/me/certifications</c> (every field replaced).</summary>
public sealed record SaveStaffCertificationRequest(
    string? Name,
    string? Issuer,
    string? CredentialNumber,
    DateOnly? IssuedOn,
    DateOnly? ExpiresOn,
    bool? IsPublic,
    string? Note);

/// <summary>Body of <c>POST /staff/{id}/certifications/{certificationId}/reject</c>.</summary>
public sealed record RejectStaffCertificationRequest(string? Reason);
