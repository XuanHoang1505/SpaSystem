using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.DTOs.Treatments;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Treatments;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Application.UseCases.Purchases;
using NhuNguyetSpa.Application.UseCases.Staff;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Treatments;

/// <summary>
/// UC-SPA-21 (docs/specs/purchases-treatments.md BR-TRT-06…09): the owner sees every plan, staff the plans they lead or (Q-37) work on.
/// A plan outside the caller's scope reads as missing.
/// </summary>
public sealed class TreatmentManagementService : ITreatmentManagementService
{
    private readonly ITreatmentRepository _treatments;
    private readonly IPurchaseRepository _purchases;
    private readonly IAppointmentRepository _appointments;
    private readonly IStaffMemberRepository _staffMembers;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<TreatmentsOptions> _options;
    private readonly IValidator<PagedQuery> _pagingValidator;
    private readonly IValidator<TreatmentListQuery> _listValidator;
    private readonly IValidator<UpdateTreatmentPlanRequest> _updateValidator;
    private readonly IValidator<UpdateTreatmentSessionRequest> _sessionValidator;
    private readonly IValidator<TreatmentReasonRequest> _reasonValidator;

    public TreatmentManagementService(ITreatmentRepository treatments, IPurchaseRepository purchases, IAppointmentRepository appointments,
        IStaffMemberRepository staffMembers, IUnitOfWork unitOfWork, ICurrentUserService currentUser, IDateTimeProvider clock,
        IOptions<TreatmentsOptions> options, IValidator<PagedQuery> pagingValidator, IValidator<TreatmentListQuery> listValidator,
        IValidator<UpdateTreatmentPlanRequest> updateValidator, IValidator<UpdateTreatmentSessionRequest> sessionValidator,
        IValidator<TreatmentReasonRequest> reasonValidator)
    {
        _treatments = treatments;
        _purchases = purchases;
        _appointments = appointments;
        _staffMembers = staffMembers;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _clock = clock;
        _options = options;
        _pagingValidator = pagingValidator;
        _listValidator = listValidator;
        _updateValidator = updateValidator;
        _sessionValidator = sessionValidator;
        _reasonValidator = reasonValidator;
    }

    private bool IsOwner => _currentUser.Roles.Contains(Roles.Owner);

    public async Task<OperationResult<PagedResult<TreatmentPlanListItemDto>>> ListAsync(
        PagedQuery paging, TreatmentListQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(paging);
        ArgumentNullException.ThrowIfNull(query);
        await _pagingValidator.ValidateAndThrowAsync(paging, cancellationToken);
        await _listValidator.ValidateAndThrowAsync(query, cancellationToken);
        TreatmentStatusText.TryParse(query.Status, out var status);
        var search = string.IsNullOrWhiteSpace(paging.Search) ? null : paging.Search.Trim();
        var criteria = new TreatmentSearchCriteria(search, query.CustomerId, status, query.PrimaryStaffMemberId,
            IsOwner ? null : _currentUser.UserId, _options.Value.AssignedStaffCanView, paging.PageNumber, paging.PageSize);
        var page = await _treatments.SearchAsync(criteria, cancellationToken);

        var planIds = page.Items.Select(plan => plan.Id).ToList();
        var sessions = planIds.Count == 0 ? [] : await _treatments.GetSessionsAsync(planIds, cancellationToken);
        var visits = planIds.Count == 0 ? [] : await _treatments.GetVisitsAsync(planIds, cancellationToken);
        var nowUtc = _clock.UtcNow;
        var items = page.Items.Select(plan => new TreatmentPlanListItemDto(
            plan.Id, plan.Customer, plan.PackageName, plan.Status, PurchaseStatus.Effective(plan.PackageStatus, plan.ExpiresAtUtc, nowUtc),
            plan.ExpiresAtUtc, plan.TotalSessions, plan.UsedSessions, plan.BookedSessions, plan.PrimaryStaff,
            NextSession(sessions.Where(session => session.TreatmentPlanId == plan.Id), visits), plan.PurchasedAtUtc));
        return OperationResult<PagedResult<TreatmentPlanListItemDto>>.Success(
            new PagedResult<TreatmentPlanListItemDto>(items, page.PageNumber, page.PageSize, page.TotalCount));
    }

    public async Task<OperationResult<TreatmentPlanDto>> GetAsync(Guid id, CancellationToken cancellationToken) =>
        OperationResult<TreatmentPlanDto>.Success(await BuildAsync(await GetViewableAsync(id, cancellationToken), cancellationToken));

    public async Task<OperationResult<TreatmentPlanDto>> UpdateAsync(Guid id, UpdateTreatmentPlanRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _updateValidator.ValidateAndThrowAsync(request, cancellationToken);
        return await ChangeAsync(id, ownerOnly: false, lockCustomer: false, (_, plan, _) =>
        {
            EnsureInCharge(plan);
            if (request.ExpectedEndDate is { } end && plan.StartDate is { } start && end < start)
                throw new ValidationException([
                    new ValidationFailure("expectedEndDate", "Ngày dự kiến kết thúc phải từ ngày bắt đầu trở đi.") { ErrorCode = "validation_error" }]);
            plan.UpdateDetails(Clean(request.Goal), request.ExpectedEndDate, Clean(request.Note));
            return Task.CompletedTask;
        }, cancellationToken);
    }

    public async Task<OperationResult<TreatmentSessionDto>> UpdateSessionAsync(
        Guid id, Guid sessionId, UpdateTreatmentSessionRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _sessionValidator.ValidateAndThrowAsync(request, cancellationToken);
        var result = await ChangeAsync(id, ownerOnly: false, lockCustomer: false, async (_, plan, token) =>
        {
            var session = await _purchases.GetSessionForUpdateAsync(sessionId, token);
            if (session is null || session.TreatmentPlanId != id)
                throw BookingErrors.TreatmentSessionNotFound();
            if (plan.Status == TreatmentPlanStatus.Cancelled)
                throw TreatmentErrors.StatusInvalid(plan.Status);
            // BR-TRT-09: the owner may correct a recorded result; the primary staff member only writes ahead of a visit.
            if (!IsOwner)
            {
                if (_currentUser.UserId != plan.PrimaryStaffMemberId)
                    throw TreatmentErrors.TreatmentNotInCharge();
                if (session.Status is TreatmentSessionStatus.Completed or TreatmentSessionStatus.Skipped)
                    throw TreatmentErrors.SessionCompleted();
            }
            session.ChangeNote(Clean(request.Note));
        }, cancellationToken);
        return OperationResult<TreatmentSessionDto>.Success(result.Data!.Sessions.Single(session => session.Id == sessionId));
    }

    public async Task<OperationResult<TreatmentPlanDto>> AssignStaffAsync(Guid id, AssignTreatmentStaffRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        return await ChangeAsync(id, ownerOnly: true, lockCustomer: false, async (_, plan, token) =>
        {
            if (request.StaffMemberId is { } staffId)
            {
                var staff = await _staffMembers.GetForUpdateAsync(staffId, token) ?? throw StaffErrors.StaffNotFound();
                if (!staff.IsWorkingOn(SpaTime.Today(_clock.UtcNow)))
                    throw TreatmentErrors.StaffResigned();
            }
            plan.AssignPrimaryStaff(request.StaffMemberId);
        }, cancellationToken);
    }

    public async Task<OperationResult<TreatmentPlanDto>> PauseAsync(Guid id, TreatmentReasonRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        EnsureOwner();
        await _reasonValidator.ValidateAndThrowAsync(request, cancellationToken);
        return await ChangeAsync(id, ownerOnly: true, lockCustomer: true, (_, plan, _) =>
        {
            plan.Pause(request.Reason!.Trim());
            return Task.CompletedTask;
        }, cancellationToken);
    }

    public Task<OperationResult<TreatmentPlanDto>> ResumeAsync(Guid id, CancellationToken cancellationToken) =>
        ChangeAsync(id, ownerOnly: true, lockCustomer: false, (package, plan, _) =>
        {
            plan.Resume(package.UsedSessions);
            return Task.CompletedTask;
        }, cancellationToken);

    public async Task<OperationResult<TreatmentPlanDto>> CancelAsync(Guid id, TreatmentReasonRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        EnsureOwner();
        await _reasonValidator.ValidateAndThrowAsync(request, cancellationToken);
        return await ChangeAsync(id, ownerOnly: true, lockCustomer: true, async (package, plan, token) =>
        {
            if (plan.Status is TreatmentPlanStatus.Completed or TreatmentPlanStatus.Cancelled)
                throw TreatmentErrors.StatusInvalid(plan.Status);
            if (await _treatments.HasBookedSessionsAsync(id, token))
                throw TreatmentErrors.HasBookedSessions();
            plan.Cancel(request.Reason!.Trim());
            package.Cancel();
        }, cancellationToken);
    }

    public Task<OperationResult<TreatmentPlanDto>> CompleteAsync(Guid id, CancellationToken cancellationToken) =>
        ChangeAsync(id, ownerOnly: true, lockCustomer: true, async (package, plan, token) =>
        {
            if (plan.Status is not (TreatmentPlanStatus.InProgress or TreatmentPlanStatus.Paused))
                throw TreatmentErrors.StatusInvalid(plan.Status);
            if (await _treatments.HasOpenSessionsAsync(id, token))
                throw TreatmentErrors.SessionsRemaining();
            var endDate = await _treatments.LatestCompletedVisitDateAsync(id, token) ?? SpaTime.Today(_clock.UtcNow);
            plan.Close(endDate);
            package.Close();
        }, cancellationToken);

    /// <summary>
    /// Scope check, then one transaction: customer row lock (status commands, so a concurrent booking of a session either commits first or
    /// sees the new status), package row lock, the change on the tracked package and plan, save. A transition the domain refuses is
    /// <c>treatment_status_invalid</c>.
    /// </summary>
    private async Task<OperationResult<TreatmentPlanDto>> ChangeAsync(Guid id, bool ownerOnly, bool lockCustomer,
        Func<CustomerPackage, TreatmentPlan, CancellationToken, Task> change, CancellationToken cancellationToken)
    {
        if (ownerOnly)
            EnsureOwner();
        var row = await GetViewableAsync(id, cancellationToken);
        await _unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            if (lockCustomer)
                await _appointments.LockCustomerForBookingAsync(row.Customer.Id, token);
            var (package, plan) = await _purchases.GetPackageForUpdateAsync(id, token);
            try
            {
                await change(package, plan, token);
            }
            catch (InvalidOperationException)
            {
                throw TreatmentErrors.StatusInvalid(plan.Status);
            }
            await _unitOfWork.SaveChangesAsync(token);
        }, cancellationToken);
        var updated = await _treatments.GetPlanAsync(id, cancellationToken) ?? throw TreatmentErrors.TreatmentPlanNotFound();
        return OperationResult<TreatmentPlanDto>.Success(await BuildAsync(updated, cancellationToken));
    }

    private void EnsureOwner()
    {
        if (!IsOwner)
            throw TreatmentErrors.OwnerOnly();
    }

    /// <summary>BR-TRT-06 on the locked plan: the owner or the primary staff member, and the plan still open.</summary>
    private void EnsureInCharge(TreatmentPlan plan)
    {
        if (!IsOwner && _currentUser.UserId != plan.PrimaryStaffMemberId)
            throw TreatmentErrors.TreatmentNotInCharge();
        if (plan.Status is TreatmentPlanStatus.Completed or TreatmentPlanStatus.Cancelled)
            throw TreatmentErrors.StatusInvalid(plan.Status);
    }

    private static string? Clean(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();

    /// <summary>The plan when the caller may see it (BR-TRT-06), else <c>treatment_plan_not_found</c>.</summary>
    private async Task<TreatmentPlanRow> GetViewableAsync(Guid id, CancellationToken cancellationToken)
    {
        var plan = await _treatments.GetPlanAsync(id, cancellationToken) ?? throw TreatmentErrors.TreatmentPlanNotFound();
        if (IsOwner || _currentUser.UserId == plan.PrimaryStaff?.Id)
            return plan;
        var assigned = _options.Value.AssignedStaffCanView && _currentUser.UserId is { } userId &&
                       await _treatments.IsAssignedToPlanAsync(plan.Id, userId, cancellationToken);
        if (!TreatmentScope.CanView(false, _currentUser.UserId, plan.PrimaryStaff?.Id, assigned, _options.Value.AssignedStaffCanView))
            throw TreatmentErrors.TreatmentPlanNotFound();
        return plan;
    }

    private async Task<TreatmentPlanDto> BuildAsync(TreatmentPlanRow plan, CancellationToken cancellationToken)
    {
        var sessions = (await _treatments.GetSessionsAsync([plan.Id], cancellationToken)).OrderBy(session => session.SequenceNumber).ToList();
        var visits = await _treatments.GetVisitsAsync([plan.Id], cancellationToken);
        var skinProfiles = await _treatments.GetSkinProfilesAsync(plan.Id, cancellationToken);
        var hasAllergies = await _treatments.HasAllergiesAsync(plan.Customer.Id, cancellationToken);
        var bySession = sessions.ToDictionary(session => session.Id);

        var sessionDtos = sessions.Select(session => new TreatmentSessionDto(
            session.Id, session.SequenceNumber, session.SpaServiceId, session.ServiceName, session.DurationMinutes, session.Status, session.Note,
            session.CompletedAtUtc, ToAppointment(CurrentVisit(visits, session.Id)))).ToList();
        var careHistory = visits
            .Where(visit => visit.Status is AppointmentStatus.Completed or AppointmentStatus.NoShow && bySession.ContainsKey(visit.TreatmentSessionId))
            .Select(visit =>
            {
                var session = bySession[visit.TreatmentSessionId];
                return new CareHistoryEntryDto(visit.AppointmentId, session.SequenceNumber, visit.Date, visit.StartTime, visit.EndTime, visit.Status,
                    visit.Staff, visit.Status == AppointmentStatus.Completed ? session.Note : null, visit.SkinProfileId);
            })
            .ToList();

        var canEdit = TreatmentScope.CanEdit(IsOwner, _currentUser.UserId, plan.PrimaryStaff?.Id, plan.Status);
        return new TreatmentPlanDto(
            plan.Id, plan.Customer, plan.PackageName, plan.Status, PurchaseStatus.Effective(plan.PackageStatus, plan.ExpiresAtUtc, _clock.UtcNow),
            plan.ExpiresAtUtc, plan.TotalSessions, plan.UsedSessions, plan.BookedSessions, plan.PrimaryStaff, NextSession(sessions, visits),
            plan.PurchasedAtUtc, plan.CustomerPackageId, plan.Goal, plan.Note, plan.StatusReason, plan.StartDate, plan.ExpectedEndDate,
            plan.ActualEndDate, canEdit, IsOwner, hasAllergies, sessionDtos, skinProfiles, careHistory);
    }

    private static TreatmentNextSessionDto? NextSession(IEnumerable<TreatmentSessionRow> sessions, IReadOnlyList<SessionVisitRow> visits)
    {
        var next = sessions.Where(session => session.Status is TreatmentSessionStatus.NotBooked or TreatmentSessionStatus.Booked)
            .MinBy(session => session.SequenceNumber);
        return next is null
            ? null
            : new TreatmentNextSessionDto(next.Id, next.SequenceNumber, next.ServiceName, next.Status,
                next.Status == TreatmentSessionStatus.Booked ? ToAppointment(CurrentVisit(visits, next.Id)) : null);
    }

    private static SessionVisitRow? CurrentVisit(IReadOnlyList<SessionVisitRow> visits, Guid sessionId) =>
        visits.Where(visit => visit.TreatmentSessionId == sessionId)
            .OrderByDescending(visit => visit.Date).ThenByDescending(visit => visit.StartTime)
            .FirstOrDefault();

    private static SessionAppointmentDto? ToAppointment(SessionVisitRow? visit) => visit is null
        ? null
        : new SessionAppointmentDto(visit.AppointmentId, visit.Date, visit.StartTime, visit.EndTime, visit.Status, visit.Staff);
}
