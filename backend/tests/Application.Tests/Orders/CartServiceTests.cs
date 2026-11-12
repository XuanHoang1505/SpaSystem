using FluentAssertions;
using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Tests.Staff;
using NhuNguyetSpa.Application.UseCases.Orders;
using NhuNguyetSpa.Application.Validators.Orders;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Orders;

/// <summary>UC-SPA-10 (docs/specs/orders.md: BR-ORD-01; ORD-T01, T03–T06). Vietnam today = 27/10/2026.</summary>
public sealed class CartServiceTests
{
    private static readonly DateOnly Today = StaffTestDoubles.VietnamToday;
    private readonly ICartRepository _carts = Substitute.For<ICartRepository>();
    private readonly ISpaServiceRepository _services = Substitute.For<ISpaServiceRepository>();
    private readonly IServicePackageRepository _packages = Substitute.For<IServicePackageRepository>();
    private readonly IUnitOfWork _unitOfWork = Substitute.For<IUnitOfWork>();
    private readonly ICurrentUserService _user = StaffTestDoubles.User("customer");
    private readonly Guid _cartId = Guid.NewGuid();
    private readonly Guid _serviceId = Guid.NewGuid();

    public CartServiceTests()
    {
        _carts.EnsureCartIdAsync(Arg.Any<Guid>(), Arg.Any<DateTime>(), Arg.Any<CancellationToken>()).Returns(_cartId);
        _carts.GetLinesAsync(Arg.Any<Guid>(), Arg.Any<DateOnly>(), Arg.Any<CancellationToken>()).Returns([]);
        _services.GetDetailAsync(_serviceId, true, Arg.Any<CancellationToken>()).Returns(
            new ServiceDetailDto(_serviceId, "Chăm sóc da", Guid.Empty, "Da", null, 350_000, 60, null, CatalogStatus.OnSale, StaffTestDoubles.Now, null));
    }

    private CartService Create(int maxItems = 20) => new(_carts, _services, _packages, _unitOfWork, _user, StaffTestDoubles.Clock(),
        Options.Create(new CartOptions { MaxItems = maxItems }), new AddCartItemRequestValidator());

    [Theory]
    [InlineData(true, true)]
    [InlineData(false, false)]
    public async Task AddRejectsBothOrNoIds(bool service, bool package)
    {
        var request = new AddCartItemRequest(service ? _serviceId : null, package ? Guid.NewGuid() : null);

        await FluentActions.Invoking(() => Create().AddItemAsync(request, CancellationToken.None)).Should().ThrowAsync<ValidationException>();
        await _carts.DidNotReceiveWithAnyArgs().EnsureCartIdAsync(default, default, default);
    }

    [Fact]
    public async Task AddStoresCurrentPrice()
    {
        await Create().AddItemAsync(new AddCartItemRequest(_serviceId, null), CancellationToken.None);

        _carts.Received(1).AddItem(Arg.Is<CartItem>(item =>
            item.CartId == _cartId && item.SpaServiceId == _serviceId && item.ServicePackageId == null && item.UnitPrice == 350_000 &&
            item.AddedAtUtc == StaffTestDoubles.Now));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AddHiddenServiceIsNotFound()
    {
        var exception = await FluentActions.Invoking(() => Create().AddItemAsync(new AddCartItemRequest(Guid.NewGuid(), null), CancellationToken.None))
            .Should().ThrowAsync<NotFoundException>();

        exception.Which.Code.Should().Be("service_not_found");
    }

    [Fact]
    public async Task AddHiddenPackageIsNotFoundForToday()
    {
        var packageId = Guid.NewGuid();

        var exception = await FluentActions.Invoking(() => Create().AddItemAsync(new AddCartItemRequest(null, packageId), CancellationToken.None))
            .Should().ThrowAsync<NotFoundException>();

        exception.Which.Code.Should().Be("package_not_found");
        await _packages.Received(1).GetDetailAsync(packageId, Today, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task AddFullCartIsRejected()
    {
        _carts.CountItemsAsync(_cartId, Arg.Any<CancellationToken>()).Returns(2);

        var exception = await FluentActions.Invoking(() => Create(maxItems: 2).AddItemAsync(new AddCartItemRequest(_serviceId, null), CancellationToken.None))
            .Should().ThrowAsync<BusinessRuleException>();

        exception.Which.Code.Should().Be("cart_full");
        _carts.DidNotReceiveWithAnyArgs().AddItem(default!);
    }

    [Fact]
    public async Task AddDuplicateConflicts()
    {
        _carts.HasProductAsync(_cartId, _serviceId, null, Arg.Any<CancellationToken>()).Returns(true);

        var exception = await FluentActions.Invoking(() => Create().AddItemAsync(new AddCartItemRequest(_serviceId, null), CancellationToken.None))
            .Should().ThrowAsync<ConflictException>();

        exception.Which.Code.Should().Be("cart_item_exists");
    }

    [Fact]
    public async Task RemoveForeignItemIsNotFound()
    {
        var exception = await FluentActions.Invoking(() => Create().RemoveItemAsync(Guid.NewGuid(), CancellationToken.None))
            .Should().ThrowAsync<NotFoundException>();

        exception.Which.Code.Should().Be("cart_item_not_found");
    }

    [Fact]
    public async Task RemoveDeletesOwnItem()
    {
        var item = new CartItem { CartId = _cartId, SpaServiceId = _serviceId };
        _carts.GetItemAsync(_user.UserId!.Value, item.Id, Arg.Any<CancellationToken>()).Returns(item);

        await Create().RemoveItemAsync(item.Id, CancellationToken.None);

        _carts.Received(1).RemoveItem(item);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task TotalIgnoresUnavailableLines()
    {
        _carts.GetLinesAsync(_user.UserId!.Value, Today, Arg.Any<CancellationToken>()).Returns([
            new CartLine(Guid.NewGuid(), CatalogItemType.Service, Guid.NewGuid(), "A", null, 300_000, 350_000, true, StaffTestDoubles.Now),
            new CartLine(Guid.NewGuid(), CatalogItemType.Package, Guid.NewGuid(), "B", null, 2_000_000, 2_000_000, false, StaffTestDoubles.Now),
        ]);

        var cart = (await Create().GetAsync(CancellationToken.None)).Data!;

        cart.ItemCount.Should().Be(2);
        cart.TotalAmount.Should().Be(350_000);
        cart.Items[0].PriceChanged.Should().BeTrue();
        cart.Items[1].PriceChanged.Should().BeFalse();
        cart.Items[1].IsAvailable.Should().BeFalse();
    }
}
