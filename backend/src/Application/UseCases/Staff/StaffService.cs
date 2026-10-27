using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.Common.Security;
using NhuNguyetSpa.Application.DTOs.Staff;
using NhuNguyetSpa.Application.Interfaces.Authentication;
using NhuNguyetSpa.Application.Interfaces.Notifications;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Staff;
using NhuNguyetSpa.Application.UseCases.Auth;
using NhuNguyetSpa.Application.Validators.Staff;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Staff;

/// <summary>UC-SPA-22 staff management (docs/specs/staff.md).</summary>
public sealed class StaffService : IStaffService
{
    private readonly IStaffMemberRepository _staff;
    private readonly IUserRepository _users;
    private readonly ISpaServiceRepository _services;
    private readonly IAppointmentRepository _appointments;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IEmailSender _emailSender;
    private readonly IUnitOfWork _unitOfWork;
    private readonly IDateTimeProvider _clock;
    private readonly ICurrentUserService _currentUser;
    private readonly IOptions<StaffOptions> _options;
    private readonly IValidator<CreateStaffRequest> _createValidator;
    private readonly IValidator<UpdateStaffRequest> _updateValidator;
    private readonly IValidator<UpdateStaffServicesRequest> _servicesValidator;
    private readonly IValidator<ResignStaffRequest> _resignValidator;
    private readonly IValidator<StaffFilter> _filterValidator;

    public StaffService(
        IStaffMemberRepository staff,
        IUserRepository users,
        ISpaServiceRepository services,
        IAppointmentRepository appointments,
        IRefreshTokenRepository refreshTokens,
        IPasswordHasher passwordHasher,
        IEmailSender emailSender,
        IUnitOfWork unitOfWork,
        IDateTimeProvider clock,
        ICurrentUserService currentUser,
        IOptions<StaffOptions> options,
        IValidator<CreateStaffRequest> createValidator,
        IValidator<UpdateStaffRequest> updateValidator,
        IValidator<UpdateStaffServicesRequest> servicesValidator,
        IValidator<ResignStaffRequest> resignValidator,
        IValidator<StaffFilter> filterValidator)
    {
        _staff = staff;
        _users = users;
        _services = services;
        _appointments = appointments;
        _refreshTokens = refreshTokens;
        _passwordHasher = passwordHasher;
        _emailSender = emailSender;
        _unitOfWork = unitOfWork;
        _clock = clock;
        _currentUser = currentUser;
        _options = options;
        _createValidator = createValidator;
        _updateValidator = updateValidator;
        _servicesValidator = servicesValidator;
        _resignValidator = resignValidator;
        _filterValidator = filterValidator;
    }

    private DateOnly Today => SpaTime.Today(_clock.UtcNow);

    public async Task<OperationResult<PagedResult<StaffListItemDto>>> SearchAsync(PagedQuery query, StaffFilter filter, CancellationToken cancellationToken)
    {
        if (!_currentUser.IsAuthenticated || !_currentUser.Roles.Contains(Roles.Owner))
            throw new ForbiddenException("Bạn không có quyền xem danh sách đầy đủ của nhân viên.", "forbidden");
        var criteria = await CriteriaAsync(query, filter, ownerView: true, cancellationToken);
        return OperationResult<PagedResult<StaffListItemDto>>.Success(await _staff.SearchAsync(criteria, cancellationToken));
    }

    public async Task<OperationResult<PagedResult<PublicStaffListItemDto>>> SearchPublicAsync(PagedQuery query, StaffFilter filter, CancellationToken cancellationToken)
    {
        var criteria = await CriteriaAsync(query, filter, ownerView: false, cancellationToken);
        return OperationResult<PagedResult<PublicStaffListItemDto>>.Success(await _staff.SearchPublicAsync(criteria, cancellationToken));
    }

    public async Task<OperationResult<StaffDetailDto>> GetAsync(Guid id, CancellationToken cancellationToken) =>
        OperationResult<StaffDetailDto>.Success(await _staff.GetDetailAsync(id, cancellationToken) ?? throw StaffErrors.StaffNotFound());

    public async Task<OperationResult<StaffDetailDto>> CreateAsync(CreateStaffRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        request = request with
        {
            FullName = Trim(request.FullName),
            Email = Trim(request.Email),
            PhoneNumber = Trim(request.PhoneNumber),
            Specialty = TrimToNull(request.Specialty),
        };
        await _createValidator.ValidateAndThrowAsync(request, cancellationToken);
        if (await _users.ExistsByEmailAsync(request.Email, cancellationToken))
            throw AccountErrors.EmailExists();
        if (await _users.ExistsByPhoneAsync(request.PhoneNumber, cancellationToken))
            throw AccountErrors.PhoneExists();
        var serviceIds = request.SpaServiceIds!;
        await EnsureAssignableAsync(serviceIds, cancellationToken);

        var password = TemporaryPasswordGenerator.Generate(_options.Value.TemporaryPasswordLength);
        var user = new User
        {
            FullName = request.FullName,
            Email = request.Email,
            PhoneNumber = request.PhoneNumber,
            PasswordHash = _passwordHasher.Hash(password),
            Role = UserRole.Staff,
            Status = UserStatus.Active,
        };
        var staff = new StaffMember { Id = user.Id, User = user, HireDate = request.HireDate!.Value, Specialty = request.Specialty };
        staff.ReplaceSkills(serviceIds);

        // Saved first so unique-key errors surface before any mail; a mail failure throws and rolls the account back (BR-STF-08).
        await _unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            await _users.AddAsync(user, token);
            await _staff.AddAsync(staff, token);
            await _unitOfWork.SaveChangesAsync(token);
            await _emailSender.SendAsync(StaffAccountEmailTemplates.Create(user.Email, user.FullName, password), token);
        }, cancellationToken);
        return await GetAsync(user.Id, cancellationToken);
    }

    public async Task<OperationResult<StaffDetailDto>> UpdateAsync(Guid id, UpdateStaffRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        request = request with
        {
            FullName = Trim(request.FullName),
            PhoneNumber = Trim(request.PhoneNumber),
            Specialty = TrimToNull(request.Specialty),
        };
        await _updateValidator.ValidateAndThrowAsync(request, cancellationToken);
        var staff = await _staff.GetForUpdateAsync(id, cancellationToken) ?? throw StaffErrors.StaffNotFound();
        if (request.PhoneNumber != staff.User.PhoneNumber && await _users.ExistsByPhoneAsync(request.PhoneNumber, cancellationToken))
            throw AccountErrors.PhoneExists();
        var hireDate = request.HireDate!.Value;
        if (staff.ResignationDate is { } resignation && hireDate > resignation)
            throw StaffErrors.ResignationBeforeHireDate();
        if (await _staff.GetEarliestActiveShiftDateAsync(id, cancellationToken) is { } earliestShift && hireDate > earliestShift)
            throw StaffErrors.HireDateAfterShift(earliestShift);

        staff.User.FullName = request.FullName;
        staff.User.PhoneNumber = request.PhoneNumber;
        staff.HireDate = hireDate;
        staff.Specialty = request.Specialty;
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetAsync(id, cancellationToken);
    }

    public async Task UpdateServicesAsync(Guid id, UpdateStaffServicesRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _servicesValidator.ValidateAndThrowAsync(request, cancellationToken);
        var staff = await _staff.GetForUpdateAsync(id, cancellationToken) ?? throw StaffErrors.StaffNotFound();
        var ids = request.SpaServiceIds!;
        // Services the staff member already had are kept even if discontinued since; only new ones must be on sale.
        var current = staff.Skills.Select(skill => skill.SpaServiceId).ToHashSet();
        await EnsureAssignableAsync(ids.Where(serviceId => !current.Contains(serviceId)).ToList(), cancellationToken);
        staff.ReplaceSkills(ids);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
    }

    public async Task<OperationResult<ResignationResultDto>> ResignAsync(Guid id, ResignStaffRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _resignValidator.ValidateAndThrowAsync(request, cancellationToken);
        var staff = await _staff.GetForUpdateAsync(id, cancellationToken) ?? throw StaffErrors.StaffNotFound();
        if (staff.ResignationDate is not null)
            throw StaffErrors.StaffAlreadyResigned();
        var date = request.ResignationDate!.Value;
        if (date < staff.HireDate)
            throw StaffErrors.ResignationBeforeHireDate();

        var now = _clock.UtcNow;
        await _unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            staff.Resign(date);
            await _staff.CancelActiveShiftsFromAsync(id, date, token);
            // A future date keeps the account active until then; AuthService refuses sign-in from that day (BR-STF-05).
            if (date <= SpaTime.Today(now))
            {
                staff.User.Status = UserStatus.Inactive;
                await _refreshTokens.RevokeAllActiveAsync(id, now, token);
            }
            await _unitOfWork.SaveChangesAsync(token);
        }, cancellationToken);

        var appointments = await _appointments.GetOccupyingFromAsync(id, date, now, cancellationToken);
        var detail = await _staff.GetDetailAsync(id, cancellationToken) ?? throw StaffErrors.StaffNotFound();
        return OperationResult<ResignationResultDto>.Success(new ResignationResultDto(detail, appointments));
    }

    private async Task<StaffSearchCriteria> CriteriaAsync(PagedQuery query, StaffFilter filter, bool ownerView, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(query);
        ArgumentNullException.ThrowIfNull(filter);
        var search = string.IsNullOrWhiteSpace(query.Search) ? null : query.Search.Trim();
        if (search?.Length > StaffQuery.MaxSearchLength)
            throw new ValidationException([
                new ValidationFailure("search", $"Từ khóa tối đa {StaffQuery.MaxSearchLength} ký tự.") { ErrorCode = "validation_error" }]);
        bool? resigned = null;
        if (ownerView)
        {
            await _filterValidator.ValidateAndThrowAsync(filter, cancellationToken);
            StaffQuery.TryParseStatus(filter.Status, out resigned);
        }
        return new StaffSearchCriteria(search, resigned, filter.SpaServiceId, Today, query.PageNumber, query.PageSize);
    }

    /// <summary>Every id must exist and be on sale (E3).</summary>
    private async Task EnsureAssignableAsync(IReadOnlyCollection<Guid> serviceIds, CancellationToken cancellationToken)
    {
        if (serviceIds.Count == 0)
            return;
        var found = await _services.GetByIdsAsync(serviceIds, cancellationToken);
        if (found.Count != serviceIds.Count)
            throw StaffErrors.StaffServiceNotFound();
        if (found.FirstOrDefault(service => service.Status != CatalogStatus.OnSale) is { } discontinued)
            throw StaffErrors.StaffServiceDiscontinued(discontinued.Name);
    }

    private static string Trim(string? value) => value?.Trim() ?? string.Empty;

    private static string? TrimToNull(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
