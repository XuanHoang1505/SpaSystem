using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Domain.Entities;

/// <summary>Table <c>skin_profiles</c> (thesis: HoSoDa). See docs/domain/data-model.md.</summary>
public sealed class SkinProfile : BaseAuditableEntity
{
    public Guid CustomerId { get; set; }
    public Customer Customer { get; set; } = null!;
    public Guid AssessedByStaffMemberId { get; set; }
    public StaffMember AssessedByStaffMember { get; set; } = null!;
    public Guid AppointmentId { get; set; }
    public Appointment Appointment { get; set; } = null!;
    public DateTime AssessedAtUtc { get; set; }
    public SkinType SkinType { get; set; }
    public string? MainConcerns { get; set; }
    public string? CurrentProducts { get; set; }
    public string? CareGoals { get; set; }
    public string? RecommendedTreatment { get; set; }
    public string? Note { get; set; }
}
