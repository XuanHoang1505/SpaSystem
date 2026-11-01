using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Treatments;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Treatments;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Application.UseCases.Purchases;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Treatments;

/// <summary>
/// UC-SPA-19 (docs/specs/purchases-treatments.md BR-TRT-10): every session's <c>canBook</c>, reason and earliest date come from
/// <see cref="EntitlementEligibility.ForSession"/> over the same facts booking reads, so what the customer sees is what booking accepts.
/// </summary>
public sealed class MyTreatmentService : IMyTreatmentService
{
    private readonly ITreatmentRepository _treatments;
    private readonly IPurchaseRepository _purchases;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<PurchasesOptions> _purchasesOptions;
    private readonly IOptions<TreatmentsOptions> _options;
    private readonly IValidator<MyTreatmentListQuery> _validator;

    public MyTreatmentService(ITreatmentRepository treatments, IPurchaseRepository purchases, ICurrentUserService currentUser,
        IDateTimeProvider clock, IOptions<PurchasesOptions> purchasesOptions, IOptions<TreatmentsOptions> options,
        IValidator<MyTreatmentListQuery> validator)
    {
        _treatments = treatments;
        _purchases = purchases;
        _currentUser = currentUser;
        _clock = clock;
        _purchasesOptions = purchasesOptions;
        _options = options;
        _validator = validator;
    }

    private Guid CustomerId => _currentUser.UserId ?? throw new UnauthorizedException("Vui lòng đăng nhập.", "unauthorized");

    public async Task<OperationResult<IReadOnlyList<MyTreatmentListItemDto>>> ListAsync(MyTreatmentListQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        await _validator.ValidateAndThrowAsync(query, cancellationToken);
        TreatmentStatusText.TryParse(query.Status, out var status);
        var customerId = CustomerId;
        var plans = await _treatments.ListForCustomerAsync(customerId, status, _purchasesOptions.Value.MaxListItems, cancellationToken);
        if (plans.Count == 0)
            return OperationResult<IReadOnlyList<MyTreatmentListItemDto>>.Success([]);

        var sessions = await _treatments.GetSessionsAsync(plans.Select(plan => plan.Id).ToList(), cancellationToken);
        var next = sessions.Where(session => session.Status == TreatmentSessionStatus.NotBooked)
            .GroupBy(session => session.TreatmentPlanId)
            .ToDictionary(group => group.Key, group => group.OrderBy(session => session.SequenceNumber).First());
        var facts = await _purchases.GetSessionFactsAsync(next.Values.Select(session => session.Id).ToList(), customerId, cancellationToken);
        var nowUtc = _clock.UtcNow;

        IReadOnlyList<MyTreatmentListItemDto> items = plans.Select(plan =>
        {
            var nextSession = next.TryGetValue(plan.Id, out var session) ? ToNext(session, facts, nowUtc) : null;
            return new MyTreatmentListItemDto(plan.Id, plan.CustomerPackageId, plan.PackageName, plan.ImageUrl, plan.Status,
                PackageStatus(plan, nowUtc), plan.ExpiresAtUtc, plan.TotalSessions, plan.UsedSessions, plan.BookedSessions, plan.PrimaryStaff,
                nextSession);
        }).ToList();
        return OperationResult<IReadOnlyList<MyTreatmentListItemDto>>.Success(items);
    }

    public async Task<OperationResult<MyTreatmentPlanDto>> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var view = await LoadAsync(id, cancellationToken);
        var nowUtc = _clock.UtcNow;
        var sessions = view.Sessions.Select(session => ToSession(session, view, nowUtc, result: null, skinProfile: null)).ToList();
        var nextRow = view.Sessions.Where(session => session.Status == TreatmentSessionStatus.NotBooked).MinBy(session => session.SequenceNumber);
        var plan = view.Plan;
        return OperationResult<MyTreatmentPlanDto>.Success(new MyTreatmentPlanDto(
            plan.Id, plan.CustomerPackageId, plan.PackageName, plan.ImageUrl, plan.Status, PackageStatus(plan, nowUtc), plan.ExpiresAtUtc,
            plan.TotalSessions, plan.UsedSessions, plan.BookedSessions, plan.PrimaryStaff,
            nextRow is null ? null : ToNext(nextRow, view.Facts, nowUtc),
            plan.Goal, plan.StatusReason, plan.StartDate, plan.ExpectedEndDate, plan.ActualEndDate, plan.PurchasedAtUtc, plan.Order, sessions));
    }

    public async Task<OperationResult<MyTreatmentSessionDto>> GetSessionAsync(Guid id, Guid sessionId, CancellationToken cancellationToken)
    {
        var view = await LoadAsync(id, cancellationToken);
        var session = view.Sessions.FirstOrDefault(item => item.Id == sessionId) ?? throw BookingErrors.TreatmentSessionNotFound();
        var appointment = CurrentVisit(view.Visits, session.Id);
        SkinProfileSummaryDto? skinProfile = null;
        if (_options.Value.ShowSkinProfilesToCustomer && appointment is not null)
            skinProfile = await _treatments.GetSkinProfileSummaryAsync(appointment.AppointmentId, cancellationToken);
        var result = session.Status == TreatmentSessionStatus.Completed ? session.Note : null;
        return OperationResult<MyTreatmentSessionDto>.Success(ToSession(session, view, _clock.UtcNow, result, skinProfile));
    }

    private async Task<PlanView> LoadAsync(Guid id, CancellationToken cancellationToken)
    {
        var customerId = CustomerId;
        var plan = await _treatments.GetPlanAsync(id, cancellationToken);
        if (plan is null || plan.Customer.Id != customerId)
            throw TreatmentErrors.TreatmentPlanNotFound();
        var sessions = await _treatments.GetSessionsAsync([plan.Id], cancellationToken);
        var visits = await _treatments.GetVisitsAsync([plan.Id], cancellationToken);
        var facts = await _purchases.GetSessionFactsAsync(sessions.Select(session => session.Id).ToList(), customerId, cancellationToken);
        return new PlanView(plan, sessions.OrderBy(session => session.SequenceNumber).ToList(), visits, facts);
    }

    private static CustomerPackageStatus PackageStatus(TreatmentPlanRow plan, DateTime nowUtc) =>
        PurchaseStatus.Effective(plan.PackageStatus, plan.ExpiresAtUtc, nowUtc);

    private static MyNextSessionDto ToNext(TreatmentSessionRow session, IReadOnlyDictionary<Guid, SessionBookingFacts> facts, DateTime nowUtc)
    {
        var (canBook, _, earliest) = Eligibility(session, facts, nowUtc);
        return new MyNextSessionDto(session.Id, session.SequenceNumber, session.ServiceName, canBook, earliest);
    }

    private static MyTreatmentSessionDto ToSession(TreatmentSessionRow session, PlanView view, DateTime nowUtc, string? result,
        SkinProfileSummaryDto? skinProfile)
    {
        var (canBook, reason, earliest) = Eligibility(session, view.Facts, nowUtc);
        var visit = CurrentVisit(view.Visits, session.Id);
        var appointment = visit is null
            ? null
            : new SessionAppointmentDto(visit.AppointmentId, visit.Date, visit.StartTime, visit.EndTime, visit.Status, visit.Staff);
        return new MyTreatmentSessionDto(session.Id, session.SequenceNumber, session.SpaServiceId, session.ServiceName, session.DurationMinutes,
            session.Status, session.CompletedAtUtc, canBook, reason, earliest, appointment, result, skinProfile);
    }

    /// <summary>A session that is not "not booked" never has an earliest date; its reason is the shared "already booked or done" text.</summary>
    private static (bool CanBook, string? Reason, DateOnly? EarliestDate) Eligibility(
        TreatmentSessionRow session, IReadOnlyDictionary<Guid, SessionBookingFacts> facts, DateTime nowUtc)
    {
        if (!facts.TryGetValue(session.Id, out var found))
            return (false, null, null);
        var eligibility = EntitlementEligibility.ForSession(found, nowUtc);
        DateOnly? earliest = session.Status == TreatmentSessionStatus.NotBooked ? eligibility.EarliestDate : null;
        return (eligibility.CanBook, eligibility.Reason, earliest);
    }

    private static SessionVisitRow? CurrentVisit(IReadOnlyList<SessionVisitRow> visits, Guid sessionId) =>
        visits.Where(visit => visit.TreatmentSessionId == sessionId)
            .OrderByDescending(visit => visit.Date).ThenByDescending(visit => visit.StartTime)
            .FirstOrDefault();

    private sealed record PlanView(
        TreatmentPlanRow Plan,
        IReadOnlyList<TreatmentSessionRow> Sessions,
        IReadOnlyList<SessionVisitRow> Visits,
        IReadOnlyDictionary<Guid, SessionBookingFacts> Facts);
}
