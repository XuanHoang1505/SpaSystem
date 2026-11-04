using FluentValidation;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.DTOs.Care;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Care;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Care;

/// <summary>
/// UC-SPA-27 A2 (docs/specs/care.md). The owner reads every customer; a staff member reads and writes only customers they have
/// cared for or are about to (BR-CARE-06, Q-36). One record per allergen, ignoring case and accents (BR-CARE-02).
/// </summary>
public sealed class CustomerAllergyService : ICustomerAllergyService
{
    private readonly IAppointmentRepository _appointments;
    private readonly ICustomerAllergyRepository _allergies;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly IValidator<SaveAllergyRequest> _validator;

    public CustomerAllergyService(
        IAppointmentRepository appointments,
        ICustomerAllergyRepository allergies,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IDateTimeProvider clock,
        IValidator<SaveAllergyRequest> validator)
    {
        _appointments = appointments;
        _allergies = allergies;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _clock = clock;
        _validator = validator;
    }

    public async Task<OperationResult<IReadOnlyList<CustomerAllergyDto>>> ListAsync(Guid customerId, CancellationToken cancellationToken)
    {
        await EnsureAccessAsync(customerId, write: false, cancellationToken);
        return OperationResult<IReadOnlyList<CustomerAllergyDto>>.Success(await _allergies.ListAsync(customerId, cancellationToken));
    }

    public async Task<OperationResult<CustomerAllergyDto>> CreateAsync(
        Guid customerId, SaveAllergyRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _validator.ValidateAndThrowAsync(request, cancellationToken);
        await EnsureAccessAsync(customerId, write: true, cancellationToken);
        var (allergen, severity, note) = Read(request);
        if (await _allergies.AllergenExistsAsync(customerId, allergen, null, cancellationToken))
            throw CareErrors.AllergyExists();

        var allergy = new CustomerAllergy { CustomerId = customerId };
        allergy.Change(allergen, severity, note, _clock.UtcNow);
        await _allergies.AddAsync(allergy, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<CustomerAllergyDto>.Success(ToDto(allergy));
    }

    public async Task<OperationResult<CustomerAllergyDto>> UpdateAsync(
        Guid customerId, Guid id, SaveAllergyRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _validator.ValidateAndThrowAsync(request, cancellationToken);
        await EnsureAccessAsync(customerId, write: true, cancellationToken);
        var allergy = await _allergies.GetAsync(customerId, id, cancellationToken) ?? throw CareErrors.AllergyNotFound();
        var (allergen, severity, note) = Read(request);
        if (await _allergies.AllergenExistsAsync(customerId, allergen, allergy.Id, cancellationToken))
            throw CareErrors.AllergyExists();

        allergy.Change(allergen, severity, note, _clock.UtcNow);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return OperationResult<CustomerAllergyDto>.Success(ToDto(allergy));
    }

    public async Task DeleteAsync(Guid customerId, Guid id, CancellationToken cancellationToken)
    {
        await EnsureAccessAsync(customerId, write: true, cancellationToken);
        var allergy = await _allergies.GetAsync(customerId, id, cancellationToken) ?? throw CareErrors.AllergyNotFound();
        _allergies.Remove(allergy);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    /// <summary>BR-SEC-01 / BR-CARE-06: owner reads only; staff need a care relation with the customer.</summary>
    private async Task EnsureAccessAsync(Guid customerId, bool write, CancellationToken cancellationToken)
    {
        if (!await _allergies.CustomerExistsAsync(customerId, cancellationToken))
            throw CareErrors.CustomerNotFound();
        if (!write && _currentUser.Roles.Contains(Roles.Owner))
            return;
        if (!_currentUser.Roles.Contains(Roles.Staff) || _currentUser.UserId is not { } staffId ||
            !await _appointments.IsInCareAsync(staffId, customerId, cancellationToken))
            throw CareErrors.CustomerNotInCare();
    }

    private static (string Allergen, AllergySeverity Severity, string? Note) Read(SaveAllergyRequest request)
    {
        CareEnumText<AllergySeverity>.TryParse(request.Severity, out var severity);
        return (request.Allergen!.Trim(), severity, string.IsNullOrWhiteSpace(request.Note) ? null : request.Note.Trim());
    }

    private static CustomerAllergyDto ToDto(CustomerAllergy allergy) =>
        new(allergy.Id, allergy.Allergen, allergy.Severity, allergy.Note, allergy.RecordedAtUtc);
}
