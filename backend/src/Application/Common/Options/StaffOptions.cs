namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>Staff</c> (docs/specs/staff.md, BR-STF-02).</summary>
public sealed class StaffOptions
{
    public const string SectionName = "Staff";

    public int TemporaryPasswordLength { get; set; } = 12;
}
