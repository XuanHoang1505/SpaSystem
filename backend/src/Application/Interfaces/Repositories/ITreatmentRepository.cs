using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Treatments;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.Interfaces.Repositories;

/// <summary>
/// Reads of treatment plans for the customer (UC-SPA-19) and for the owner and staff (UC-SPA-21). Scope checks (BR-TRT-06) are made
/// by the services from the returned rows; the customer list filters by customer here.
/// </summary>
public interface ITreatmentRepository
{
    /// <summary>The customer's plans, newest purchase first, at most <paramref name="max"/>.</summary>
    Task<IReadOnlyList<TreatmentPlanRow>> ListForCustomerAsync(Guid customerId, TreatmentPlanStatus? status, int max, CancellationToken cancellationToken);

    Task<TreatmentPlanRow?> GetPlanAsync(Guid planId, CancellationToken cancellationToken);

    /// <summary>Ordered by plan, then sequence number.</summary>
    Task<IReadOnlyList<TreatmentSessionRow>> GetSessionsAsync(IReadOnlyCollection<Guid> planIds, CancellationToken cancellationToken);

    /// <summary>Appointments of the plans' sessions except cancelled and expired holds, ordered by date and start time.</summary>
    Task<IReadOnlyList<SessionVisitRow>> GetVisitsAsync(IReadOnlyCollection<Guid> planIds, CancellationToken cancellationToken);

    Task<SkinProfileSummaryDto?> GetSkinProfileSummaryAsync(Guid appointmentId, CancellationToken cancellationToken);

    /// <summary>
    /// UC-SPA-21 list, newest purchase first. A staff scope keeps plans the staff member leads, or (with <c>IncludeAssigned</c>)
    /// plans with one of their session appointments in <see cref="UseCases.Treatments.TreatmentScope.AssignedStatuses"/>; each plan once.
    /// </summary>
    Task<PagedResult<TreatmentPlanRow>> SearchAsync(TreatmentSearchCriteria criteria, CancellationToken cancellationToken);

    /// <summary>The staff member has a session appointment of the plan in <see cref="UseCases.Treatments.TreatmentScope.AssignedStatuses"/>.</summary>
    Task<bool> IsAssignedToPlanAsync(Guid planId, Guid staffMemberId, CancellationToken cancellationToken);

    /// <summary>Skin profiles of the plan's session appointments, ordered by appointment date.</summary>
    Task<IReadOnlyList<TreatmentSkinProfileDto>> GetSkinProfilesAsync(Guid planId, CancellationToken cancellationToken);

    Task<bool> HasAllergiesAsync(Guid customerId, CancellationToken cancellationToken);

    /// <summary>A session of the plan is <c>booked</c> (fresh read; call after the customer lock).</summary>
    Task<bool> HasBookedSessionsAsync(Guid planId, CancellationToken cancellationToken);

    /// <summary>A session of the plan is <c>not_booked</c> or <c>booked</c>.</summary>
    Task<bool> HasOpenSessionsAsync(Guid planId, CancellationToken cancellationToken);

    /// <summary>Date of the latest completed appointment of the plan's sessions; null when none.</summary>
    Task<DateOnly?> LatestCompletedVisitDateAsync(Guid planId, CancellationToken cancellationToken);
}
