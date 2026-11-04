namespace NhuNguyetSpa.Application.Common.Options;

/// <summary>Section <c>Treatments</c> (docs/specs/purchases-treatments.md, BR-TRT-06, BR-TRT-10, Q-37, Q-39).</summary>
public sealed class TreatmentsOptions
{
    public const string SectionName = "Treatments";

    /// <summary>Q-37: staff also see (read only) plans with a session appointment assigned to them, not only plans they lead.</summary>
    public bool AssignedStaffCanView { get; set; } = true;

    /// <summary>Q-39: when true the customer's session detail carries a short summary of the visit's skin profile.</summary>
    public bool ShowSkinProfilesToCustomer { get; set; }
}
