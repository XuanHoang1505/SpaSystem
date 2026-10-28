using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Orders;
using NhuNguyetSpa.Application.UseCases.Catalog;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Orders;

/// <summary>UC-SPA-10 cart management (docs/specs/orders.md, BR-ORD-01).</summary>
public sealed class CartService : ICartService
{
    private readonly ICartRepository _carts;
    private readonly ISpaServiceRepository _services;
    private readonly IServicePackageRepository _packages;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<CartOptions> _options;
    private readonly IValidator<AddCartItemRequest> _addValidator;

    public CartService(
        ICartRepository carts,
        ISpaServiceRepository services,
        IServicePackageRepository packages,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IDateTimeProvider clock,
        IOptions<CartOptions> options,
        IValidator<AddCartItemRequest> addValidator)
    {
        _carts = carts;
        _services = services;
        _packages = packages;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _clock = clock;
        _options = options;
        _addValidator = addValidator;
    }

    private Guid CustomerId
    {
        get { return _currentUser.UserId ?? throw new UnauthorizedException("Vui lòng đăng nhập.", "unauthorized"); }
    }

    public async Task<OperationResult<CartDto>> GetAsync(CancellationToken cancellationToken)
    {
        var lines = await _carts.GetLinesAsync(CustomerId, SpaTime.Today(_clock.UtcNow), cancellationToken);
        var items = lines.Select(line => new CartItemDto(
                line.ItemId, line.Type, line.ProductId, line.Name, line.ImageUrl, line.UnitPrice, line.CurrentPrice,
                line.CurrentPrice != line.UnitPrice, line.IsAvailable, line.AddedAtUtc))
            .ToList();
        var total = lines.Where(line => line.IsAvailable).Sum(line => line.CurrentPrice);
        return OperationResult<CartDto>.Success(new CartDto(items, items.Count, total));
    }

    public async Task<OperationResult<CartDto>> AddItemAsync(AddCartItemRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _addValidator.ValidateAndThrowAsync(request, cancellationToken);
        var now = _clock.UtcNow;
        decimal price;
        if (request.SpaServiceId.HasValue)
        {
            var service = await _services.GetDetailAsync(request.SpaServiceId.Value, true, cancellationToken) ?? throw CatalogErrors.ServiceNotFound();
            price = service.Price;
        }
        else
        {
            var package = await _packages.GetDetailAsync(request.ServicePackageId!.Value, SpaTime.Today(now), cancellationToken)
                          ?? throw CatalogErrors.PackageNotFound();
            price = package.Price;
        }

        var cartId = await _carts.EnsureCartIdAsync(CustomerId, now, cancellationToken);
        var maxItems = _options.Value.MaxItems;
        if (await _carts.CountItemsAsync(cartId, cancellationToken) >= maxItems)
            throw CartErrors.CartFull(maxItems);
        // Pre-check for a clean message; two concurrent adds are caught by the unique index (cart_item_exists).
        if (await _carts.HasProductAsync(cartId, request.SpaServiceId, request.ServicePackageId, cancellationToken))
            throw CartErrors.CartItemExists();

        _carts.AddItem(new CartItem
        {
            CartId = cartId,
            SpaServiceId = request.SpaServiceId,
            ServicePackageId = request.ServicePackageId,
            UnitPrice = price,
            AddedAtUtc = now,
        });
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetAsync(cancellationToken);
    }

    public async Task<OperationResult<CartDto>> RemoveItemAsync(Guid itemId, CancellationToken cancellationToken)
    {
        var item = await _carts.GetItemAsync(CustomerId, itemId, cancellationToken) ?? throw CartErrors.CartItemNotFound();
        _carts.RemoveItem(item);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return await GetAsync(cancellationToken);
    }
}
