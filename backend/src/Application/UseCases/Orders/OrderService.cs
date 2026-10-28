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

/// <summary>UC-SPA-11 preview and order creation (docs/specs/orders.md, BR-ORD-02, 03, 07–09).</summary>
public sealed class OrderService : IOrderService
{
    private const int MaxCodeAttempts = 3;

    private readonly ICartRepository _carts;
    private readonly ISpaServiceRepository _services;
    private readonly IServicePackageRepository _packages;
    private readonly IOrderRepository _orders;
    private readonly IRepository<PromotionRedemption> _redemptions;
    private readonly PromotionApplier _promotionApplier;
    private readonly EntitlementIssuer _entitlementIssuer;
    private readonly IPaymentGateway _gateway;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<OrderOptions> _orderOptions;
    private readonly IOptions<PaymentOptions> _paymentOptions;
    private readonly IValidator<OrderRequest> _validator;

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
        IValidator<OrderRequest> validator)
    {
        _carts = carts;
        _services = services;
        _packages = packages;
        _orders = orders;
        _redemptions = redemptions;
        _promotionApplier = promotionApplier;
        _entitlementIssuer = entitlementIssuer;
        _gateway = gateway;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _clock = clock;
        _orderOptions = orderOptions;
        _paymentOptions = paymentOptions;
        _validator = validator;
    }

    private Guid CustomerId
    {
        get { return _currentUser.UserId ?? throw new UnauthorizedException("Vui lòng đăng nhập.", "unauthorized"); }
    }

    public async Task<OperationResult<OrderPreviewDto>> PreviewAsync(OrderRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _validator.ValidateAndThrowAsync(request, cancellationToken);
        var (lines, unavailable) = await PriceAsync(request, cancellationToken);
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
            await _unitOfWork.ExecuteInTransactionAsync(async token => order = await BuildAndSaveAsync(request, customerId, idempotencyKey, token),
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
        var payable = order.Status == OrderStatus.PendingPayment && _clock.UtcNow < order.PaymentDueAtUtc &&
                      order.Payments.Count < _paymentOptions.Value.MaxAttemptsPerOrder;
        var detail = new OrderDetailDto(
            order.Id,
            order.Code,
            order.Status,
            order.Subtotal,
            order.DiscountTotal,
            order.GrandTotal,
            order.PaymentDueAtUtc,
            order.CreatedAtUtc,
            payable,
            order.Items,
            order.Payments,
            order.Promotion);
        return OperationResult<OrderDetailDto>.Success(detail);
    }

    private async Task<OperationResult<CreatedOrder>> CreatedAsync(Guid id, bool created, CancellationToken cancellationToken)
    {
        var detail = await GetAsync(id, cancellationToken);
        return OperationResult<CreatedOrder>.Success(new CreatedOrder(detail.Data!, created));
    }

    private async Task<Order> BuildAndSaveAsync(OrderRequest request, Guid customerId, Guid? idempotencyKey, CancellationToken cancellationToken)
    {
        var (lines, unavailable) = await PriceAsync(request, cancellationToken);
        if (unavailable.Count > 0)
            throw OrderErrors.ItemsUnavailable(unavailable.Select(item => item.Name));
        var subtotal = lines.Sum(line => line.Price);
        // Row lock: two orders cannot both take a promotion's last use (BR-PRM-01).
        var promotion = await _promotionApplier.ApplyAsync(request.PromotionCode, subtotal, customerId, lockRow: true, cancellationToken);
        if (promotion.HasError)
            throw promotion.ErrorCode == PromotionErrors.InvalidCode ? PromotionErrors.Invalid() : PromotionErrors.NotApplicable();
        var grandTotal = subtotal - promotion.DiscountTotal;
        if (grandTotal > 0 && grandTotal < _gateway.MinAmount)
            throw OrderErrors.AmountTooSmall(_gateway.MinAmount);

        var now = _clock.UtcNow;
        var order = new Order
        {
            Code = await NewCodeAsync(now, cancellationToken),
            CustomerId = customerId,
            Subtotal = subtotal,
            DiscountTotal = promotion.DiscountTotal,
            GrandTotal = grandTotal,
            Status = OrderStatus.PendingPayment,
            PaymentDueAtUtc = now.AddMinutes(_orderOptions.Value.PaymentTimeoutMinutes),
            IdempotencyKey = idempotencyKey,
        };
        var discounts = DiscountCalculator.Allocate(promotion.DiscountTotal, lines.Select(line => line.Price).ToList());
        for (var i = 0; i < lines.Count; i++)
        {
            order.Items.Add(new OrderItem
            {
                OrderId = order.Id,
                SpaServiceId = lines[i].Type == CatalogItemType.Service ? lines[i].ProductId : null,
                ServicePackageId = lines[i].Type == CatalogItemType.Package ? lines[i].ProductId : null,
                ProductName = lines[i].Name,
                UnitPrice = lines[i].Price,
                DiscountAmount = discounts[i],
                LineTotal = lines[i].Price - discounts[i],
            });
        }
        await _orders.AddAsync(order, cancellationToken);
        var applied = promotion.Promotion;
        if (applied != null)
        {
            await _redemptions.AddAsync(new PromotionRedemption
            {
                OrderId = order.Id,
                PromotionId = applied.Id,
                PromotionCode = applied.Code,
                DiscountAmount = promotion.DiscountTotal,
                RedeemedAtUtc = now,
            }, cancellationToken);
        }
        // BR-ORD-09: nothing to pay → paid at once, no gateway.
        if (grandTotal == 0)
        {
            order.MarkPaid();
            await _entitlementIssuer.IssueAsync(order, now, cancellationToken);
        }
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return order;
    }

    private async Task<string> NewCodeAsync(DateTime now, CancellationToken cancellationToken)
    {
        for (var attempt = 1; ; attempt++)
        {
            var code = OrderCodeGenerator.NewOrderCode(now);
            // The unique index still guards the tiny race between this check and the insert.
            if (attempt == MaxCodeAttempts || !await _orders.CodeExistsAsync(code, cancellationToken))
                return code;
        }
    }

    /// <summary>Current catalog prices (BR-ORD-02): cart lines split into sellable and unavailable, or the one product bought now.</summary>
    private async Task<(IReadOnlyList<PricedLine> Lines, IReadOnlyList<UnavailableItemDto> Unavailable)> PriceAsync(
        OrderRequest request, CancellationToken cancellationToken)
    {
        var today = SpaTime.Today(_clock.UtcNow);
        if (request.Source == OrderSource.Cart)
        {
            var cart = await _carts.GetLinesAsync(CustomerId, today, cancellationToken);
            if (cart.Count == 0)
                throw OrderErrors.CartEmpty();
            return (
                cart.Where(line => line.IsAvailable).Select(line => new PricedLine(line.Type, line.ProductId, line.Name, line.CurrentPrice)).ToList(),
                cart.Where(line => !line.IsAvailable).Select(line => new UnavailableItemDto(line.Type, line.ProductId, line.Name)).ToList());
        }

        if (request.SpaServiceId.HasValue)
        {
            var service = await _services.GetDetailAsync(request.SpaServiceId.Value, true, cancellationToken) ?? throw CatalogErrors.ServiceNotFound();
            var serviceLines = new List<PricedLine> { new PricedLine(CatalogItemType.Service, service.Id, service.Name, service.Price) };
            return (serviceLines, new List<UnavailableItemDto>());
        }
        var package = await _packages.GetDetailAsync(request.ServicePackageId!.Value, today, cancellationToken) ?? throw CatalogErrors.PackageNotFound();
        var packageLines = new List<PricedLine> { new PricedLine(CatalogItemType.Package, package.Id, package.Name, package.Price) };
        return (packageLines, new List<UnavailableItemDto>());
    }

    private sealed record PricedLine(CatalogItemType Type, Guid ProductId, string Name, decimal Price);
}
