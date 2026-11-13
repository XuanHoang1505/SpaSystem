using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>
/// Table <c>staff_certifications</c> (thesis: BangCapNhanVien, ĐX Q-74). A staff member declares a certificate, the owner
/// verifies or rejects it (BR-STF-14); only verified ones can reach customers.
/// </summary>
public sealed class StaffCertification : BaseAuditableEntity
{
    public Guid StaffMemberId { get; set; }
    public StaffMember StaffMember { get; set; } = null!;
    public string Name { get; private set; } = string.Empty;
    public string? Issuer { get; private set; }
    public string? CredentialNumber { get; private set; }
    public DateOnly? IssuedOn { get; private set; }
    public DateOnly? ExpiresOn { get; private set; }
    public bool IsPublic { get; private set; } = true;
    public string? Note { get; private set; }
    public string? ImageUrl { get; private set; }
    public CertificationVerificationStatus VerificationStatus { get; private set; } = CertificationVerificationStatus.Pending;
    public string? RejectionReason { get; private set; }
    public DateTime? ReviewedAtUtc { get; private set; }
    public Guid? ReviewedByUserId { get; private set; }
    public User? ReviewedBy { get; set; }

    /// <summary>Replaces every descriptive field (POST/PUT body); the review fields are set by the caller's role.</summary>
    public void Describe(
        string name, string? issuer, string? credentialNumber, DateOnly? issuedOn, DateOnly? expiresOn, bool isPublic, string? note)
    {
        if (issuedOn is { } issued && expiresOn is { } expires && expires < issued)
            throw new InvalidOperationException("The expiry date cannot be before the issue date.");
        Name = name;
        Issuer = issuer;
        CredentialNumber = credentialNumber;
        IssuedOn = issuedOn;
        ExpiresOn = expiresOn;
        IsPublic = isPublic;
        Note = note;
    }

    /// <summary>Stores the URL of the uploaded photo of the certificate (one image per certification).</summary>
    public void SetImage(string imageUrl)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(imageUrl);
        ImageUrl = imageUrl;
    }

    public void RemoveImage() => ImageUrl = null;

    /// <summary>The owner verifies (or writes) the certificate.</summary>
    public void Verify(Guid reviewerId, DateTime nowUtc)
    {
        VerificationStatus = CertificationVerificationStatus.Verified;
        RejectionReason = null;
        ReviewedAtUtc = nowUtc;
        ReviewedByUserId = reviewerId;
    }

    public void Reject(string reason, Guid reviewerId, DateTime nowUtc)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(reason);
        VerificationStatus = CertificationVerificationStatus.Rejected;
        RejectionReason = reason;
        ReviewedAtUtc = nowUtc;
        ReviewedByUserId = reviewerId;
    }

    /// <summary>A staff member added or changed it: it waits for the owner again and the old review is dropped.</summary>
    public void SubmitForReview()
    {
        VerificationStatus = CertificationVerificationStatus.Pending;
        RejectionReason = null;
        ReviewedAtUtc = null;
        ReviewedByUserId = null;
    }
}
