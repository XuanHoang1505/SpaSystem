using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.Interfaces.Payments;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.UseCases.Catalog;
using NhuNguyetSpa.Application.UseCases.Payments;
using NhuNguyetSpa.Application.UseCases.Promotions;
using NhuNguyetSpa.Domain.Common;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;

namespace NhuNguyetSpa.Application.UseCases.Orders;

/// <summary>A catalog product priced now (BR-ORD-02).</summary>
public sealed record PricedOrderLine(CatalogItemType Type, Guid ProductId, string Name, decimal Price);

/// <summary>
/// Creates an order exactly as <c>POST /me/orders</c> does (BR-ORD-02, 03, 07–09), inside the caller's transaction. Book now
/// (UC-SPA-15) reuses it and attaches its held appointment before a zero-amount order is paid, so the hold is confirmed with it.
/// </summary>
public sealed class OrderPlacement
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
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<OrderOptions> _orderOptions;

    public OrderPlacement(
        ICartRepository carts,
        ISpaServiceRepository services,
        IServicePackageRepository packages,
        IOrderRepository orders,
        IRepository<PromotionRedemption> redemptions,
        PromotionApplier promotionApplier,
        EntitlementIssuer entitlementIssuer,
        IPaymentGateway gateway,
        IUnitOfWork unitOfWork,
        IDateTimeProvider clock,
        IOptions<OrderOptions> orderOptions)
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
        _clock = clock;
        _orderOptions = orderOptions;
    }

    /// <summary>
    /// Prices, applies the promotion (row-locked), saves the order and its redemption, calls <paramref name="attach"/>, saves again,
    /// and pays a zero-amount order at once with its entitlements.
    /// </summary>
    public async Task<Order> PlaceAsync(OrderRequest request, Guid customerId, Guid? idempotencyKey, Func<Order, CancellationToken, Task>? attach,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var (lines, unavailable) = await PriceAsync(request, customerId, cancellationToken);
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
        if (attach != null)
            await attach(order, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);

        // BR-ORD-09: nothing to pay → paid at once, no gateway.
        if (grandTotal == 0)
        {
            order.MarkPaid();
            await _entitlementIssuer.IssueAsync(order, now, cancellationToken);
            await _unitOfWork.SaveChangesAsync(cancellationToken);
        }
        return order;
    }

    /// <summary>Current catalog prices (BR-ORD-02): cart lines split into sellable and unavailable, or the one product bought now.</summary>
    public async Task<(IReadOnlyList<PricedOrderLine> Lines, IReadOnlyList<UnavailableItemDto> Unavailable)> PriceAsync(
        OrderRequest request, Guid customerId, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        var today = SpaTime.Today(_clock.UtcNow);
        if (request.Source == OrderSource.Cart)
        {
            var cart = await _carts.GetLinesAsync(customerId, today, cancellationToken);
            if (cart.Count == 0)
                throw OrderErrors.CartEmpty();
            return (
                cart.Where(line => line.IsAvailable).Select(line => new PricedOrderLine(line.Type, line.ProductId, line.Name, line.CurrentPrice)).ToList(),
                cart.Where(line => !line.IsAvailable).Select(line => new UnavailableItemDto(line.Type, line.ProductId, line.Name)).ToList());
        }

        if (request.SpaServiceId.HasValue)
        {
            var service = await _services.GetDetailAsync(request.SpaServiceId.Value, true, cancellationToken) ?? throw CatalogErrors.ServiceNotFound();
            return ([new PricedOrderLine(CatalogItemType.Service, service.Id, service.Name, service.Price)], []);
        }
        var package = await _packages.GetDetailAsync(request.ServicePackageId!.Value, today, cancellationToken) ?? throw CatalogErrors.PackageNotFound();
        return ([new PricedOrderLine(CatalogItemType.Package, package.Id, package.Name, package.Price)], []);
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
}
