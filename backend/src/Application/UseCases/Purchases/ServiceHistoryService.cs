using FluentValidation;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Purchases;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Purchases;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Purchases;

/// <summary>UC-SPA-20 (docs/specs/purchases-treatments.md BR-TRT-11): completed and no-show visits of the signed-in customer (Q-40).</summary>
public sealed class ServiceHistoryService : IServiceHistoryService
{
    private readonly IAppointmentRepository _appointments;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<PagedQuery> _pagingValidator;
    private readonly IValidator<ServiceHistoryQuery> _validator;

    public ServiceHistoryService(IAppointmentRepository appointments, ICurrentUserService currentUser, IValidator<PagedQuery> pagingValidator,
        IValidator<ServiceHistoryQuery> validator)
    {
        _appointments = appointments;
        _currentUser = currentUser;
        _pagingValidator = pagingValidator;
        _validator = validator;
    }

    private Guid CustomerId => _currentUser.UserId ?? throw new UnauthorizedException("Vui lòng đăng nhập.", "unauthorized");

    public async Task<OperationResult<PagedResult<ServiceHistoryItemDto>>> ListAsync(
        PagedQuery paging, ServiceHistoryQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(paging);
        ArgumentNullException.ThrowIfNull(query);
        await _pagingValidator.ValidateAndThrowAsync(paging, cancellationToken);
        await _validator.ValidateAndThrowAsync(query, cancellationToken);
        AppointmentStatusText.TryParse(query.Status, out var status);
        var criteria = new ServiceHistoryCriteria(query.FromDate, query.ToDate, query.SpaServiceId, status, paging.PageNumber, paging.PageSize);
        return OperationResult<PagedResult<ServiceHistoryItemDto>>.Success(
            await _appointments.SearchHistoryAsync(CustomerId, criteria, cancellationToken));
    }

    public async Task<OperationResult<ServiceHistoryDetailDto>> GetAsync(Guid appointmentId, CancellationToken cancellationToken) =>
        OperationResult<ServiceHistoryDetailDto>.Success(
            await _appointments.GetHistoryDetailAsync(CustomerId, appointmentId, cancellationToken) ?? throw BookingErrors.AppointmentNotFound());
}
