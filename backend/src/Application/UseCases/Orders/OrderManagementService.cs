using FluentValidation;
using FluentValidation.Results;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Orders;

namespace NhuNguyetSpa.Application.UseCases.Orders;

/// <summary>UC-SPA-13: the owner's order list, detail and cancel (docs/specs/orders.md, BR-ORD-04, 11, 12).</summary>
public sealed class OrderManagementService : IOrderManagementService
{
    public const int MaxSearchLength = 100;

    private readonly IOrderRepository _orders;
    private readonly OrderCancellation _cancellation;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<PaymentOptions> _paymentOptions;
    private readonly IValidator<OrderListQuery> _listValidator;
    private readonly IValidator<CancelOrderRequest> _cancelValidator;

    public OrderManagementService(IOrderRepository orders, OrderCancellation cancellation, IDateTimeProvider clock,
        IOptions<PaymentOptions> paymentOptions, IValidator<OrderListQuery> listValidator, IValidator<CancelOrderRequest> cancelValidator)
    {
        _orders = orders;
        _cancellation = cancellation;
        _clock = clock;
        _paymentOptions = paymentOptions;
        _listValidator = listValidator;
        _cancelValidator = cancelValidator;
    }

    public async Task<OperationResult<PagedResult<OrderListItemDto>>> ListAsync(PagedQuery paging, OrderListQuery query,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(paging);
        ArgumentNullException.ThrowIfNull(query);
        await _listValidator.ValidateAndThrowAsync(query, cancellationToken);
        var failures = new List<ValidationFailure>();
        var search = string.IsNullOrWhiteSpace(paging.Search) ? null : paging.Search.Trim();
        if (search?.Length > MaxSearchLength)
            failures.Add(new ValidationFailure("search", $"Từ khóa tối đa {MaxSearchLength} ký tự.") { ErrorCode = "validation_error" });
        // No sortBy means "newest first"; with a sortBy the requested direction applies.
        var sortBy = OrderSortField.CreatedAtUtc;
        var direction = SortDirection.Desc;
        if (!string.IsNullOrWhiteSpace(paging.SortBy))
        {
            if (!Enum.TryParse(paging.SortBy.Trim(), ignoreCase: true, out sortBy) || !Enum.IsDefined(sortBy))
                failures.Add(new ValidationFailure("sortBy", "Chỉ sắp xếp được theo createdAtUtc hoặc grandTotal.") { ErrorCode = "validation_error" });
            direction = paging.SortDirection;
        }
        if (failures.Count > 0)
            throw new ValidationException(failures);

        OrderStatusText.TryParse(query.Status, out var status);
        var criteria = new OrderSearchCriteria(
            null,
            status,
            query.FromDate.HasValue ? SpaTime.StartOfDayUtc(query.FromDate.Value) : null,
            query.ToDate.HasValue ? SpaTime.StartOfDayUtc(query.ToDate.Value.AddDays(1)) : null,
            search,
            sortBy,
            direction,
            paging.PageNumber,
            paging.PageSize);
        return OperationResult<PagedResult<OrderListItemDto>>.Success(await _orders.SearchAsync(criteria, cancellationToken));
    }

    public async Task<OperationResult<OwnerOrderDetailDto>> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var order = await _orders.GetOwnerDetailAsync(id, cancellationToken) ?? throw OrderErrors.OrderNotFound();
        var facts = new OrderActionFacts(order.Status, order.PaymentDueAtUtc, order.Payments.Count, null);
        return OperationResult<OwnerOrderDetailDto>.Success(order with
        {
            IsPayable = OrderActionPolicy.IsPayable(facts, _clock.UtcNow, _paymentOptions.Value.MaxAttemptsPerOrder),
            CanCancel = OrderActionPolicy.OwnerCanCancel(order.Status),
        });
    }

    public async Task<OperationResult<OwnerOrderDetailDto>> CancelAsync(Guid id, CancelOrderRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _cancelValidator.ValidateAndThrowAsync(request, cancellationToken);
        await _cancellation.CancelAsync(id, null, request.Reason!, cancellationToken);
        return await GetAsync(id, cancellationToken);
    }
}
