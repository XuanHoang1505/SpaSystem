using Microsoft.EntityFrameworkCore;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Purchases;
using NhuNguyetSpa.Application.DTOs.Treatments;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Treatments;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Infrastructure.Persistence;

namespace NhuNguyetSpa.Infrastructure.Repositories;

public sealed class TreatmentRepository : ITreatmentRepository
{
    private readonly AppDbContext _context;

    public TreatmentRepository(AppDbContext context) => _context = context;

    public async Task<IReadOnlyList<TreatmentPlanRow>> ListForCustomerAsync(
        Guid customerId, TreatmentPlanStatus? status, int max, CancellationToken cancellationToken)
    {
        var plans = _context.TreatmentPlans.Where(plan => plan.CustomerPackage.CustomerId == customerId);
        if (status is { } wanted)
            plans = plans.Where(plan => plan.Status == wanted);
        return await PlanRows(plans.OrderByDescending(plan => plan.CustomerPackage.PurchasedAtUtc).ThenBy(plan => plan.Id).Take(max))
            .ToListAsync(cancellationToken);
    }

    public Task<TreatmentPlanRow?> GetPlanAsync(Guid planId, CancellationToken cancellationToken) =>
        PlanRows(_context.TreatmentPlans.Where(plan => plan.Id == planId)).FirstOrDefaultAsync(cancellationToken);

    public async Task<IReadOnlyList<TreatmentSessionRow>> GetSessionsAsync(IReadOnlyCollection<Guid> planIds, CancellationToken cancellationToken) =>
        await _context.TreatmentSessions.AsNoTracking()
            .Where(session => planIds.Contains(session.TreatmentPlanId))
            .OrderBy(session => session.TreatmentPlanId).ThenBy(session => session.SequenceNumber)
            .Select(session => new TreatmentSessionRow(session.Id, session.TreatmentPlanId, session.SpaServiceId, session.SequenceNumber,
                session.ServiceName, session.DurationMinutes, session.Status, session.Note, session.CompletedAtUtc))
            .ToListAsync(cancellationToken);

    public async Task<IReadOnlyList<SessionVisitRow>> GetVisitsAsync(IReadOnlyCollection<Guid> planIds, CancellationToken cancellationToken) =>
        await _context.Appointments.AsNoTracking()
            .Where(appointment => appointment.TreatmentSessionId != null && planIds.Contains(appointment.TreatmentSession!.TreatmentPlanId) &&
                                  appointment.Status != AppointmentStatus.Cancelled && appointment.Status != AppointmentStatus.HoldExpired)
            .OrderBy(appointment => appointment.Date).ThenBy(appointment => appointment.StartTime).ThenBy(appointment => appointment.Id)
            .Select(appointment => new SessionVisitRow(
                appointment.Id,
                appointment.TreatmentSessionId!.Value,
                appointment.Date,
                appointment.StartTime,
                appointment.EndTime,
                appointment.Status,
                new StaffRefDto(appointment.StaffMemberId, appointment.StaffMember.User.FullName),
                _context.SkinProfiles.Where(profile => profile.AppointmentId == appointment.Id).Select(profile => (Guid?)profile.Id).FirstOrDefault()))
            .ToListAsync(cancellationToken);

    public Task<SkinProfileSummaryDto?> GetSkinProfileSummaryAsync(Guid appointmentId, CancellationToken cancellationToken) =>
        _context.SkinProfiles.AsNoTracking()
            .Where(profile => profile.AppointmentId == appointmentId)
            .Select(profile => new SkinProfileSummaryDto(profile.SkinType, profile.CareGoals, profile.RecommendedTreatment))
            .FirstOrDefaultAsync(cancellationToken);

    public async Task<PagedResult<TreatmentPlanRow>> SearchAsync(TreatmentSearchCriteria criteria, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(criteria);
        var plans = _context.TreatmentPlans.AsQueryable();
        if (criteria.ScopeStaffMemberId is { } staffId)
        {
            // One EXISTS per condition, so a plan matched twice (lead and assigned) is listed once.
            var statuses = TreatmentScope.AssignedStatuses;
            plans = criteria.IncludeAssigned
                ? plans.Where(plan => plan.PrimaryStaffMemberId == staffId ||
                                      _context.Appointments.Any(appointment => appointment.StaffMemberId == staffId &&
                                                                               appointment.TreatmentSession!.TreatmentPlanId == plan.Id &&
                                                                               statuses.Contains(appointment.Status)))
                : plans.Where(plan => plan.PrimaryStaffMemberId == staffId);
        }
        if (criteria.CustomerId is { } customerId)
            plans = plans.Where(plan => plan.CustomerPackage.CustomerId == customerId);
        if (criteria.Status is { } status)
            plans = plans.Where(plan => plan.Status == status);
        if (criteria.PrimaryStaffMemberId is { } primaryId)
            plans = plans.Where(plan => plan.PrimaryStaffMemberId == primaryId);
        if (criteria.Search is { } search)
        {
            var pattern = CatalogSearchText.Contains(search);
            plans = plans.Where(plan =>
                EF.Functions.Like(AppDbContext.Unaccent(plan.CustomerPackage.Customer.User.FullName.ToLower()), AppDbContext.Unaccent(pattern.ToLower()),
                    CatalogSearchText.EscapeCharacter) ||
                EF.Functions.Like(plan.CustomerPackage.Customer.User.PhoneNumber, pattern, CatalogSearchText.EscapeCharacter));
        }

        var total = await plans.CountAsync(cancellationToken);
        var items = await PlanRows(plans
                .OrderByDescending(plan => plan.CustomerPackage.PurchasedAtUtc).ThenBy(plan => plan.Id)
                .Skip((criteria.PageNumber - 1) * criteria.PageSize)
                .Take(criteria.PageSize))
            .ToListAsync(cancellationToken);
        return new PagedResult<TreatmentPlanRow>(items, criteria.PageNumber, criteria.PageSize, total);
    }

    public Task<bool> IsAssignedToPlanAsync(Guid planId, Guid staffMemberId, CancellationToken cancellationToken)
    {
        var statuses = TreatmentScope.AssignedStatuses;
        return _context.Appointments.AnyAsync(appointment => appointment.StaffMemberId == staffMemberId &&
                                                             appointment.TreatmentSession!.TreatmentPlanId == planId &&
                                                             statuses.Contains(appointment.Status), cancellationToken);
    }

    public async Task<IReadOnlyList<TreatmentSkinProfileDto>> GetSkinProfilesAsync(Guid planId, CancellationToken cancellationToken) =>
        await _context.SkinProfiles.AsNoTracking()
            .Where(profile => profile.Appointment.TreatmentSessionId != null && profile.Appointment.TreatmentSession!.TreatmentPlanId == planId)
            .OrderBy(profile => profile.Appointment.Date).ThenBy(profile => profile.Appointment.StartTime)
            .Select(profile => new TreatmentSkinProfileDto(
                profile.Id, profile.AppointmentId, profile.Appointment.TreatmentSession!.SequenceNumber, profile.AssessedAtUtc, profile.SkinType,
                profile.MainConcerns, profile.CareGoals, profile.RecommendedTreatment,
                new StaffRefDto(profile.AssessedByStaffMemberId, profile.AssessedByStaffMember.User.FullName)))
            .ToListAsync(cancellationToken);

    public Task<bool> HasAllergiesAsync(Guid customerId, CancellationToken cancellationToken) =>
        _context.CustomerAllergies.AnyAsync(allergy => allergy.CustomerId == customerId, cancellationToken);

    public Task<bool> HasBookedSessionsAsync(Guid planId, CancellationToken cancellationToken) =>
        _context.TreatmentSessions.AnyAsync(session => session.TreatmentPlanId == planId && session.Status == TreatmentSessionStatus.Booked,
            cancellationToken);

    public Task<bool> HasOpenSessionsAsync(Guid planId, CancellationToken cancellationToken) =>
        _context.TreatmentSessions.AnyAsync(session => session.TreatmentPlanId == planId &&
                                                       (session.Status == TreatmentSessionStatus.NotBooked ||
                                                        session.Status == TreatmentSessionStatus.Booked), cancellationToken);

    public Task<DateOnly?> LatestCompletedVisitDateAsync(Guid planId, CancellationToken cancellationToken) =>
        _context.Appointments
            .Where(appointment => appointment.TreatmentSession!.TreatmentPlanId == planId && appointment.Status == AppointmentStatus.Completed)
            .MaxAsync(appointment => (DateOnly?)appointment.Date, cancellationToken);

    private static IQueryable<TreatmentPlanRow> PlanRows(IQueryable<TreatmentPlan> plans) =>
        plans.AsNoTracking().Select(plan => new TreatmentPlanRow(
            plan.Id,
            plan.CustomerPackageId,
            plan.CustomerPackage.PackageName,
            plan.CustomerPackage.OrderItem.ServicePackage!.ImageUrl,
            plan.Status,
            plan.StatusReason,
            plan.Goal,
            plan.Note,
            plan.StartDate,
            plan.ExpectedEndDate,
            plan.ActualEndDate,
            plan.PrimaryStaffMemberId == null ? null : new StaffRefDto(plan.PrimaryStaffMemberId.Value, plan.PrimaryStaffMember!.User.FullName),
            plan.CustomerPackage.Status,
            plan.CustomerPackage.ExpiresAtUtc,
            plan.CustomerPackage.PurchasedAtUtc,
            plan.CustomerPackage.TotalSessions,
            plan.CustomerPackage.UsedSessions,
            plan.Sessions.Count(session => session.Status == TreatmentSessionStatus.Booked),
            new TreatmentCustomerDto(plan.CustomerPackage.CustomerId, plan.CustomerPackage.Customer.User.FullName,
                plan.CustomerPackage.Customer.User.PhoneNumber),
            new PurchaseOrderRefDto(plan.CustomerPackage.OrderItem.OrderId, plan.CustomerPackage.OrderItem.Order.Code)));
}
