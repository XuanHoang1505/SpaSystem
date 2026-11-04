using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.Interfaces.Payments;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Orders;
using NhuNguyetSpa.Application.UseCases.Catalog;
using NhuNguyetSpa.Application.UseCases.Payments;
using NhuNguyetSpa.Application.UseCases.Promotions;
using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Orders;

/// <summary>
/// UC-SPA-11 preview and order creation (docs/specs/orders.md, BR-ORD-02, 03, 07–09); UC-SPA-12 list and cancel (BR-ORD-04, 11).
/// </summary>
public sealed class OrderService : IOrderService
{
    private readonly IOrderRepository _orders;
    private readonly PromotionApplier _promotionApplier;
    private readonly OrderPlacement _placement;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<OrderOptions> _orderOptions;
    private readonly IOptions<PaymentOptions> _paymentOptions;
    private readonly IValidator<OrderRequest> _validator;
    private readonly OrderCancellation _cancellation;
    private readonly IValidator<OrderListQuery> _listValidator;
    private readonly IValidator<CancelOrderRequest> _cancelValidator;

    public OrderService(
        ICartRepository carts,
        ISpaServiceRepository services,
        IServicePackageRepository packages,
        IOrderRepository orders,
        IRepository<PromotionRedemption> redemptions,
        PromotionApplier promotionApplier,
        EntitlementIssuer entitlementIssuer,
        IPaymentGateway gateway,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IDateTimeProvider clock,
        IOptions<OrderOptions> orderOptions,
        IOptions<PaymentOptions> paymentOptions,
        IValidator<OrderRequest> validator,
        OrderCancellation cancellation,
        IValidator<OrderListQuery> listValidator,
        IValidator<CancelOrderRequest> cancelValidator)
    {
        _orders = orders;
        _promotionApplier = promotionApplier;
        // Same collaborators as book now's placement; built here so the order API keeps its constructor.
        _placement = new OrderPlacement(carts, services, packages, orders, redemptions, promotionApplier, entitlementIssuer, gateway, unitOfWork,
            clock, orderOptions);
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _clock = clock;
        _orderOptions = orderOptions;
        _paymentOptions = paymentOptions;
        _validator = validator;
        _cancellation = cancellation;
        _listValidator = listValidator;
        _cancelValidator = cancelValidator;
    }

    private Guid CustomerId
    {
        get { return _currentUser.UserId ?? throw new UnauthorizedException("Vui lòng đăng nhập.", "unauthorized"); }
    }

    public async Task<OperationResult<OrderPreviewDto>> PreviewAsync(OrderRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _validator.ValidateAndThrowAsync(request, cancellationToken);
        var (lines, unavailable) = await _placement.PriceAsync(request, CustomerId, cancellationToken);
        var subtotal = lines.Sum(line => line.Price);
        var promotion = await _promotionApplier.ApplyAsync(request.PromotionCode, subtotal, CustomerId, lockRow: false, cancellationToken);
        var discounts = DiscountCalculator.Allocate(promotion.DiscountTotal, lines.Select(line => line.Price).ToList());

        var items = lines.Select((line, index) => new OrderPreviewItemDto(
            line.Type, line.ProductId, line.Name, line.Price, discounts[index], line.Price - discounts[index])).ToList();
        return OperationResult<OrderPreviewDto>.Success(new OrderPreviewDto(
            items,
            unavailable,
            subtotal,
            promotion.DiscountTotal,
            subtotal - promotion.DiscountTotal,
            promotion.Promotion != null ? new AppliedPromotionDto(promotion.Code!, promotion.DiscountTotal) : null,
            promotion.HasError ? new PromotionErrorDto(promotion.ErrorCode!, promotion.ErrorMessage!) : null));
    }

    public async Task<OperationResult<CreatedOrder>> CreateAsync(OrderRequest request, Guid? idempotencyKey, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _validator.ValidateAndThrowAsync(request, cancellationToken);
        var customerId = CustomerId;
        if (idempotencyKey.HasValue)
        {
            var existingId = await _orders.FindIdByIdempotencyKeyAsync(customerId, idempotencyKey.Value, cancellationToken);
            if (existingId.HasValue)
                return await CreatedAsync(existingId.Value, created: false, cancellationToken);
        }

        var order = new Order();
        try
        {
            await _unitOfWork.ExecuteInTransactionAsync(
                async token => order = await _placement.PlaceAsync(request, customerId, idempotencyKey, null, token),
                cancellationToken);
        }
        catch (ConflictException) when (idempotencyKey != null)
        {
            // The same key won a concurrent request (ux_orders_customer_id_idempotency_key): answer with that order.
            var winner = await _orders.FindIdByIdempotencyKeyAsync(customerId, idempotencyKey.Value, cancellationToken);
            if (winner == null)
                throw;
            return await CreatedAsync(winner.Value, created: false, cancellationToken);
        }
        return await CreatedAsync(order.Id, created: true, cancellationToken);
    }

    public async Task<OperationResult<OrderDetailDto>> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var order = await _orders.GetDetailAsync(id, CustomerId, cancellationToken) ?? throw OrderErrors.OrderNotFound();
        var facts = OrderActionFacts.From(order.Status, order.PaymentDueAtUtc, order.Payments);
        var now = _clock.UtcNow;
        var detail = order with
        {
            IsPayable = OrderActionPolicy.IsPayable(facts, now, _paymentOptions.Value.MaxAttemptsPerOrder),
            CanCancel = OrderActionPolicy.CustomerCanCancel(facts, now, _orderOptions.Value.CancelBlockMinutesAfterPaymentStart),
        };
        return OperationResult<OrderDetailDto>.Success(detail);
    }

    public async Task<OperationResult<PagedResult<MyOrderListItemDto>>> ListAsync(PagedQuery paging, OrderListQuery query,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(paging);
        ArgumentNullException.ThrowIfNull(query);
        await _listValidator.ValidateAndThrowAsync(query, cancellationToken);
        OrderStatusText.TryParse(query.Status, out var status);
        var criteria = new OrderSearchCriteria(
            CustomerId,
            status,
            query.FromDate.HasValue ? SpaTime.StartOfDayUtc(query.FromDate.Value) : null,
            query.ToDate.HasValue ? SpaTime.StartOfDayUtc(query.ToDate.Value.AddDays(1)) : null,
            null,
            OrderSortField.CreatedAtUtc,
            SortDirection.Desc,
            paging.PageNumber,
            paging.PageSize);
        var page = await _orders.SearchMineAsync(criteria, cancellationToken);
        var now = _clock.UtcNow;
        var maxAttempts = _paymentOptions.Value.MaxAttemptsPerOrder;
        var blockMinutes = _orderOptions.Value.CancelBlockMinutesAfterPaymentStart;
        var items = page.Items.Select(row => row.Item with
        {
            IsPayable = OrderActionPolicy.IsPayable(row.Facts, now, maxAttempts),
            CanCancel = OrderActionPolicy.CustomerCanCancel(row.Facts, now, blockMinutes),
        });
        return OperationResult<PagedResult<MyOrderListItemDto>>.Success(
            new PagedResult<MyOrderListItemDto>(items, page.PageNumber, page.PageSize, page.TotalCount));
    }

    public async Task<OperationResult<OrderDetailDto>> CancelAsync(Guid id, CancelOrderRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _cancelValidator.ValidateAndThrowAsync(request, cancellationToken);
        await _cancellation.CancelAsync(id, CustomerId, request.Reason!, cancellationToken);
        return await GetAsync(id, cancellationToken);
    }

    private async Task<OperationResult<CreatedOrder>> CreatedAsync(Guid id, bool created, CancellationToken cancellationToken)
    {
        var detail = await GetAsync(id, cancellationToken);
        return OperationResult<CreatedOrder>.Success(new CreatedOrder(detail.Data!, created));
    }
}
