using FluentValidation;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.DTOs.Care;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Care;

namespace NhuNguyetSpa.Application.UseCases.Care;

/// <summary>UC-SPA-26 (BR-CARE-07): only the caller's completed visits, newest first (BR-SEC-01, Q-73).</summary>
public sealed class CareHistoryService : ICareHistoryService
{
    private readonly IAppointmentRepository _appointments;
    private readonly ICurrentUserService _currentUser;
    private readonly IValidator<PagedQuery> _pagingValidator;
    private readonly IValidator<CareHistoryQuery> _validator;

    public CareHistoryService(
        IAppointmentRepository appointments, ICurrentUserService currentUser, IValidator<PagedQuery> pagingValidator,
        IValidator<CareHistoryQuery> validator)
    {
        _appointments = appointments;
        _currentUser = currentUser;
        _pagingValidator = pagingValidator;
        _validator = validator;
    }

    public async Task<OperationResult<PagedResult<CareHistoryItemDto>>> ListAsync(
        PagedQuery paging, CareHistoryQuery query, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(paging);
        ArgumentNullException.ThrowIfNull(query);
        await _pagingValidator.ValidateAndThrowAsync(paging, cancellationToken);
        await _validator.ValidateAndThrowAsync(query, cancellationToken);
        var staffId = _currentUser.UserId ?? throw new InvalidOperationException("The caller has no user id.");
        var search = string.IsNullOrWhiteSpace(paging.Search) ? null : paging.Search.Trim();
        var criteria = new CareHistoryCriteria(search, query.FromDate, query.ToDate, query.CustomerId, paging.PageNumber, paging.PageSize);
        return OperationResult<PagedResult<CareHistoryItemDto>>.Success(
            await _appointments.SearchCareHistoryAsync(staffId, criteria, cancellationToken));
    }
}
