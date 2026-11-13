namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>StaffCertification</c> (docs/specs/staff.md, BR-STF-12, 13; Q-74).</summary>
public sealed class StaffCertificationOptions
{
    public const string SectionName = "StaffCertification";

    /// <summary>Most certifications one staff member may have.</summary>
    public int MaxPerStaff { get; set; } = 20;

    /// <summary>A certification expiring within this many days is shown as "sắp hết hạn".</summary>
    public int ExpiringSoonDays { get; set; } = 30;
}
