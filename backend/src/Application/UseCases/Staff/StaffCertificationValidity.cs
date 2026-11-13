using NhuNguyetSpa.Application.DTOs.Staff;

namespace NhuNguyetSpa.Application.UseCases.Staff;

/// <summary>BR-STF-13: validity of a certification on a Vietnam date; pure, computed on every read.</summary>
public static class StaffCertificationValidity
{
    public static StaffCertificationStatus Of(DateOnly? expiresOn, DateOnly today, int expiringSoonDays)
    {
        if (expiresOn is not { } expires) return StaffCertificationStatus.Valid;
        if (expires < today) return StaffCertificationStatus.Expired;
        return expires <= today.AddDays(expiringSoonDays) ? StaffCertificationStatus.ExpiringSoon : StaffCertificationStatus.Valid;
    }
}
