using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.DTOs.Care;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Care;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Care;

/// <summary>
/// UC-SPA-27 (docs/specs/care.md). The owner and the assigned staff member read; only the staff member currently assigned to
/// the appointment writes (BR-CARE-01), inside the window of BR-CARE-04. The unique index backs the one-profile rule under races.
/// </summary>
public sealed class SkinProfileService : ISkinProfileService
{
    private readonly IAppointmentRepository _appointments;
    private readonly ISkinProfileRepository _profiles;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<CareOptions> _options;
    private readonly IValidator<SaveSkinProfileRequest> _validator;

    public SkinProfileService(
        IAppointmentRepository appointments,
        ISkinProfileRepository profiles,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IDateTimeProvider clock,
        IOptions<CareOptions> options,
        IValidator<SaveSkinProfileRequest> validator)
    {
        _appointments = appointments;
        _profiles = profiles;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _clock = clock;
        _options = options;
        _validator = validator;
    }

    public async Task<OperationResult<SkinProfileDto>> GetByAppointmentAsync(Guid appointmentId, CancellationToken cancellationToken)
    {
        var appointment = await _appointments.GetCareInfoAsync(appointmentId, cancellationToken) ?? throw BookingErrors.AppointmentNotFound();
        if (!_currentUser.Roles.Contains(Roles.Owner))
            EnsureAssigned(appointment);
        var profile = await _profiles.GetDtoByAppointmentAsync(appointmentId, cancellationToken) ?? throw CareErrors.SkinProfileNotFound();
        return OperationResult<SkinProfileDto>.Success(profile);
    }

    public async Task<OperationResult<SkinProfileDto>> CreateAsync(
        Guid appointmentId, SaveSkinProfileRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _validator.ValidateAndThrowAsync(request, cancellationToken);
        var appointment = await _appointments.GetCareInfoAsync(appointmentId, cancellationToken) ?? throw BookingErrors.AppointmentNotFound();
        EnsureWritable(appointment);
        if (await _appointments.HasSkinProfileAsync(appointmentId, cancellationToken))
            throw CareErrors.SkinProfileExists();

        var profile = new SkinProfile
        {
            AppointmentId = appointment.Id,
            CustomerId = appointment.CustomerId,
            AssessedByStaffMemberId = _currentUser.UserId!.Value,
            AssessedAtUtc = _clock.UtcNow,
        };
        Apply(profile, request);
        await _profiles.AddAsync(profile, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<SkinProfileDto>.Success(await ReadAsync(profile.Id, cancellationToken));
    }

    public async Task<OperationResult<SkinProfileDto>> UpdateAsync(Guid id, SaveSkinProfileRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _validator.ValidateAndThrowAsync(request, cancellationToken);
        var profile = await _profiles.GetByIdAsync(id, cancellationToken) ?? throw CareErrors.SkinProfileNotFound();
        var appointment = await _appointments.GetCareInfoAsync(profile.AppointmentId, cancellationToken)
                          ?? throw CareErrors.SkinProfileNotFound();
        EnsureWritable(appointment);
        Apply(profile, request);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<SkinProfileDto>.Success(await ReadAsync(id, cancellationToken));
    }

    private void EnsureWritable(AppointmentCareInfo appointment)
    {
        EnsureAssigned(appointment);
        CareRules.EnsureSkinProfileWritable(
            appointment.Status, appointment.Date, SpaTime.Today(_clock.UtcNow), _options.Value.SkinProfileEditWindowDays);
    }

    /// <summary>BR-SEC-01: a staff member works only on appointments assigned to them; the owner never writes here.</summary>
    private void EnsureAssigned(AppointmentCareInfo appointment)
    {
        if (!_currentUser.Roles.Contains(Roles.Staff) || _currentUser.UserId != appointment.StaffMemberId)
            throw BookingErrors.NotAssigned();
    }

    private async Task<SkinProfileDto> ReadAsync(Guid id, CancellationToken cancellationToken) =>
        await _profiles.GetDtoAsync(id, cancellationToken) ?? throw CareErrors.SkinProfileNotFound();

    private static void Apply(SkinProfile profile, SaveSkinProfileRequest request)
    {
        CareEnumText<SkinType>.TryParse(request.SkinType, out var skinType);
        profile.Record(skinType, Clean(request.MainConcerns), Clean(request.CurrentProducts), Clean(request.CareGoals),
            Clean(request.RecommendedTreatment), Clean(request.Note));
    }

    private static string? Clean(string? text) => string.IsNullOrWhiteSpace(text) ? null : text.Trim();
}
