using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Care;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Care;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Care;

/// <summary>
/// UC-SPA-28 (docs/specs/care.md). One transaction: lock the appointment (as UC-SPA-17 does), check BR-CARE-03 on the locked
/// row, then use the entitlement or complete the session and lock the package to advance its progress (BR-TRT-02, 03).
/// </summary>
public sealed class AppointmentCompletionService : IAppointmentCompletionService
{
    private readonly IAppointmentRepository _appointments;
    private readonly IPurchaseRepository _purchases;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<CareOptions> _options;
    private readonly IValidator<CompleteAppointmentRequest> _validator;

    public AppointmentCompletionService(
        IAppointmentRepository appointments,
        IPurchaseRepository purchases,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IDateTimeProvider clock,
        IOptions<CareOptions> options,
        IValidator<CompleteAppointmentRequest> validator)
    {
        _appointments = appointments;
        _purchases = purchases;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _clock = clock;
        _options = options;
        _validator = validator;
    }

    public async Task<OperationResult<CompleteAppointmentResult>> CompleteAsync(
        Guid id, CompleteAppointmentRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _validator.ValidateAndThrowAsync(request, cancellationToken);
        var result = string.IsNullOrWhiteSpace(request.Result) ? null : request.Result.Trim();
        PackageProgressDto? progress = null;

        await _unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var (appointment, _) = await _appointments.GetForUpdateAsync(id, token) ?? throw BookingErrors.AppointmentNotFound();
            // Checked on the locked row: a reassignment committed meanwhile is seen here (BR-SEC-01).
            if (_currentUser.UserId != appointment.StaffMemberId)
                throw BookingErrors.NotAssigned();
            var nowUtc = _clock.UtcNow;
            CareRules.EnsureCompletable(appointment.Status, appointment.Date, appointment.StartTime, nowUtc);
            if (_options.Value.RequireSkinProfileToComplete && !await _appointments.HasSkinProfileAsync(appointment.Id, token))
                throw CareErrors.SkinProfileRequired();

            if (appointment.TreatmentSession is { } session)
                progress = await CompleteSessionAsync(appointment, session, result, nowUtc, token);
            else if (appointment.ServiceEntitlement is { } entitlement)
                CompleteEntitlement(appointment, entitlement, result);
            else
                throw CareErrors.EntitlementStateInvalid("Lịch hẹn chưa gắn dịch vụ đã mua.");

            await _unitOfWork.SaveChangesAsync(token);
        }, cancellationToken);

        var detail = await _appointments.GetDetailAsync(id, cancellationToken) ?? throw BookingErrors.AppointmentNotFound();
        return OperationResult<CompleteAppointmentResult>.Success(new CompleteAppointmentResult(detail, progress));
    }

    /// <summary>BR-TRT-02; the result goes to the appointment note for a single service (ĐX).</summary>
    private static void CompleteEntitlement(Appointment appointment, ServiceEntitlement entitlement, string? result)
    {
        if (entitlement.Status != EntitlementStatus.Booked)
            throw CareErrors.EntitlementStateInvalid("Dịch vụ đã mua không ở trạng thái đã đặt lịch.");
        entitlement.MarkUsed();
        appointment.Complete(result);
    }

    /// <summary>BR-TRT-03, WF-05..07; the result goes to the session note and plan dates use the visit's date.</summary>
    private async Task<PackageProgressDto> CompleteSessionAsync(
        Appointment appointment, TreatmentSession session, string? result, DateTime nowUtc, CancellationToken cancellationToken)
    {
        if (session.Status != TreatmentSessionStatus.Booked)
            throw CareErrors.EntitlementStateInvalid("Buổi chăm sóc không ở trạng thái đã đặt lịch.");
        var (package, plan) = await _purchases.GetPackageForUpdateAsync(session.TreatmentPlanId, cancellationToken);
        if (package.Status == CustomerPackageStatus.Cancelled || plan.Status == TreatmentPlanStatus.Cancelled)
            throw CareErrors.EntitlementStateInvalid("Gói hoặc liệu trình đã bị hủy.");
        if (package.Status == CustomerPackageStatus.Completed || package.UsedSessions >= package.TotalSessions)
            throw CareErrors.EntitlementStateInvalid("Gói đã dùng hết số buổi.");

        session.Complete(result, nowUtc);
        var packageCompleted = package.RecordCompletedSession();
        plan.RecordCompletedSession(appointment.Date, packageCompleted);
        appointment.Complete(null);
        return new PackageProgressDto(package.Id, package.PackageName, package.UsedSessions, package.TotalSessions, package.Status);
    }
}
