namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>Reports</c> (docs/specs/reports.md, BR-RPT-03, 04, Q-49).</summary>
public sealed class ReportsOptions
{
    public const string SectionName = "Reports";

    /// <summary>Longest range of one report, in years (1–20).</summary>
    public int MaxRangeYears { get; set; } = 5;

    /// <summary>Largest <c>top</c> of the by-product report (1–500).</summary>
    public int MaxTopProducts { get; set; } = 50;
}
