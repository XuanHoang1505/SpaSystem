using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>treatment_sessions</c> (thesis: BuoiChamSoc). See docs/domain/data-model.md.</summary>
public sealed class TreatmentSession : BaseEntity
{
    public Guid TreatmentPlanId { get; set; }
    public TreatmentPlan TreatmentPlan { get; set; } = null!;
    public Guid SpaServiceId { get; set; }
    public SpaService SpaService { get; set; } = null!;
    public int SequenceNumber { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public int DurationMinutes { get; set; }
    public TreatmentSessionStatus Status { get; set; }
    public string? Note { get; set; }
    public DateTime? CompletedAtUtc { get; set; }
}
