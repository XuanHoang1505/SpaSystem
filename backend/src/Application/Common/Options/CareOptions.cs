namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>Care</c> (docs/specs/care.md, BR-CARE-04, Q-34, Q-35).</summary>
public sealed class CareOptions
{
    public const string SectionName = "Care";

    /// <summary>Q-34: days after a completed visit's date during which its skin profile can still be created or edited.</summary>
    public int SkinProfileEditWindowDays { get; set; } = 7;

    /// <summary>Q-35: when true a visit cannot be completed before its skin profile exists.</summary>
    public bool RequireSkinProfileToComplete { get; set; }

    /// <summary>Start-up validation used by the options registration.</summary>
    public static bool IsValid(CareOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);
        return options.SkinProfileEditWindowDays is >= 0 and <= 365;
    }
}
