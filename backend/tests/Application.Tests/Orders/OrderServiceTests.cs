using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.Interfaces.Payments;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Tests.Staff;
using NhuNguyetSpa.Application.UseCases.Orders;
using NhuNguyetSpa.Application.UseCases.Payments;
using NhuNguyetSpa.Application.UseCases.Promotions;
using NhuNguyetSpa.Application.Validators.Orders;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Orders;

/// <summary>UC-SPA-11 preview and order creation (docs/specs/orders.md: BR-ORD-02, 03, 08, 09; BR-PRM-01..03).</summary>
public sealed class OrderServiceTests
{
    private static readonly DateTime Now = StaffTestDoubles.Now;
    private readonly ICartRepository _carts = Substitute.For<ICartRepository>();
    private readonly ISpaServiceRepository _services = Substitute.For<ISpaServiceRepository>();
    private readonly IServicePackageRepository _packages = Substitute.For<IServicePackageRepository>();
    private readonly IOrderRepository _orders = Substitute.For<IOrderRepository>();
    private readonly IRepository<PromotionRedemption> _redemptions = Substitute.For<IRepository<PromotionRedemption>>();
    private readonly IPromotionRepository _promotions = Substitute.For<IPromotionRepository>();
    private readonly IRepository<ServiceEntitlement> _entitlements = Substitute.For<IRepository<ServiceEntitlement>>();
    private readonly IPaymentGateway _gateway = Substitute.For<IPaymentGateway>();
    private readonly IUnitOfWork _unitOfWork = OrderTestDoubles.UnitOfWork();
    private readonly ICurrentUserService _user = StaffTestDoubles.User("customer");
    private readonly List<Order> _added = [];
    private readonly Guid _serviceA = Guid.NewGuid();
    private readonly Guid _serviceB = Guid.NewGuid();

    public OrderServiceTests()
    {
        _gateway.MinAmount.Returns(5000m);
        _orders.AddAsync(Arg.Do<Order>(_added.Add), Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);
        _orders.GetDetailAsync(Arg.Any<Guid>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>())
            .Returns(call => _added.Where(order => order.Id == call.ArgAt<Guid>(0)).Select(Detail).FirstOrDefault());
        Lines(Line(_serviceA, "Chăm sóc da", 300_000, 360_000), Line(_serviceB, "Massage", 440_000, 440_000));
    }

    private static OrderDetailDto Detail(Order order) => new(
        order.Id, order.Code, order.Status, order.Subtotal, order.DiscountTotal, order.GrandTotal, order.PaymentDueAtUtc, Now, false, [], [], null);

    private static CartLine Line(Guid id, string name, decimal unitPrice, decimal currentPrice, bool available = true) =>
        new(Guid.NewGuid(), CatalogItemType.Service, id, name, null, unitPrice, currentPrice, available, Now);

    private void Lines(params CartLine[] lines) =>
        _carts.GetLinesAsync(_user.UserId!.Value, StaffTestDoubles.VietnamToday, Arg.Any<CancellationToken>()).Returns(lines);

    private OrderService Create()
    {
        var clock = StaffTestDoubles.Clock();
        var issuer = new EntitlementIssuer(_entitlements, Substitute.For<IRepository<CustomerPackage>>(), Substitute.For<IRepository<TreatmentPlan>>(),
            _packages, _carts, Substitute.For<IAppointmentRepository>(), NullLogger<EntitlementIssuer>.Instance);
        return new OrderService(_carts, _services, _packages, _orders, _redemptions, new PromotionApplier(_promotions, clock), issuer, _gateway,
            _unitOfWork, _user, clock, Options.Create(new OrderOptions()), Options.Create(new PaymentOptions()), new OrderRequestValidator(),
            new OrderCancellation(_orders, Substitute.For<IAppointmentRepository>(), _unitOfWork, clock, Options.Create(new OrderOptions())),
            new OrderListQueryValidator(), new CancelOrderRequestValidator());
    }

    private void Promotion(decimal value = 20, decimal? max = 100_000, decimal minOrder = 0)
    {
        var promotion = new Promotion
        {
            Code = "SALE20",
            DiscountType = DiscountType.Percentage,
            DiscountValue = value,
            MaxDiscountAmount = max,
            MinOrderAmount = minOrder,
            StartsAtUtc = Now.AddDays(-1),
            EndsAtUtc = Now.AddDays(1),
            Status = PromotionStatus.Active,
        };
        _promotions.GetByCodeAsync("SALE20", Arg.Any<bool>(), Arg.Any<CancellationToken>()).Returns(promotion);
    }

    private static OrderRequest FromCart(string? code = null) => new(OrderSource.Cart, null, null, code);

    [Fact]
    public async Task PreviewUsesCurrentPricesAndDoesNotSave()
    {
        Promotion();

        var preview = (await Create().PreviewAsync(FromCart("sale20"), CancellationToken.None)).Data!;

        preview.Subtotal.Should().Be(800_000);
        preview.DiscountTotal.Should().Be(100_000);
        preview.GrandTotal.Should().Be(700_000);
        preview.Promotion.Should().Be(new AppliedPromotionDto("SALE20", 100_000));
        preview.PromotionError.Should().BeNull();
        preview.Items.Select(item => (item.UnitPrice, item.DiscountAmount, item.LineTotal))
            .Should().Equal((360_000m, 45_000m, 315_000m), (440_000m, 55_000m, 385_000m));
        await _unitOfWork.DidNotReceiveWithAnyArgs().SaveChangesAsync(default);
        await _orders.DidNotReceiveWithAnyArgs().AddAsync(default!, default);
        await _promotions.Received().GetByCodeAsync("SALE20", false, Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task PreviewReportsPromotionErrorAndPricesWithoutIt()
    {
        Promotion(minOrder: 1_000_000);

        var preview = (await Create().PreviewAsync(FromCart("SALE20"), CancellationToken.None)).Data!;

        preview.PromotionError!.Code.Should().Be("promotion_not_applicable");
        preview.Promotion.Should().BeNull();
        preview.DiscountTotal.Should().Be(0);
        preview.GrandTotal.Should().Be(800_000);
    }

    [Fact]
    public async Task PreviewListsUnavailableAndPricesTheRest()
    {
        Lines(Line(_serviceA, "Chăm sóc da", 300_000, 300_000), Line(_serviceB, "Massage", 440_000, 440_000, available: false));

        var preview = (await Create().PreviewAsync(FromCart(), CancellationToken.None)).Data!;

        preview.UnavailableItems.Should().ContainSingle().Which.Name.Should().Be("Massage");
        preview.Items.Should().ContainSingle();
        preview.Subtotal.Should().Be(300_000);
    }

    [Fact]
    public async Task EmptyCartIsRejected()
    {
        Lines();

        var exception = await FluentActions.Invoking(() => Create().PreviewAsync(FromCart(), CancellationToken.None))
            .Should().ThrowAsync<BusinessRuleException>();

        exception.Which.Code.Should().Be("cart_empty");
    }

    [Fact]
    public async Task BuyNowHiddenServiceIsNotFound()
    {
        var exception = await FluentActions.Invoking(() =>
                Create().PreviewAsync(new OrderRequest(OrderSource.BuyNow, Guid.NewGuid(), null, null), CancellationToken.None))
            .Should().ThrowAsync<NotFoundException>();

        exception.Which.Code.Should().Be("service_not_found");
    }

    [Fact]
    public async Task CreateUsesCurrentPricesAndSetsDueTime()
    {
        var result = (await Create().CreateAsync(FromCart(), null, CancellationToken.None)).Data!;

        result.Created.Should().BeTrue();
        var order = _added.Should().ContainSingle().Subject;
        order.Code.Should().MatchRegex("^DH261027[A-HJ-NP-Z2-9]{6}$");
        order.CustomerId.Should().Be(_user.UserId!.Value);
        order.Status.Should().Be(OrderStatus.PendingPayment);
        order.PaymentDueAtUtc.Should().Be(Now.AddMinutes(15));
        order.Subtotal.Should().Be(800_000);
        order.GrandTotal.Should().Be(800_000);
        order.Items.Select(item => (item.SpaServiceId, item.ProductName, item.UnitPrice, item.LineTotal))
            .Should().Equal((_serviceA, "Chăm sóc da", 360_000m, 360_000m), (_serviceB, "Massage", 440_000m, 440_000m));
        await _redemptions.DidNotReceiveWithAnyArgs().AddAsync(default!, default);
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateWithPromotionLocksRowAndRecordsRedemption()
    {
        Promotion();

        await Create().CreateAsync(FromCart("SALE20"), null, CancellationToken.None);

        var order = _added.Single();
        order.DiscountTotal.Should().Be(100_000);
        order.GrandTotal.Should().Be(700_000);
        order.Items.Sum(item => item.DiscountAmount).Should().Be(100_000);
        await _promotions.Received().GetByCodeAsync("SALE20", true, Arg.Any<CancellationToken>());
        await _redemptions.Received(1).AddAsync(Arg.Is<PromotionRedemption>(redemption =>
            redemption.OrderId == order.Id && redemption.PromotionCode == "SALE20" && redemption.DiscountAmount == 100_000 &&
            redemption.RedeemedAtUtc == Now), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task CreateThrowsOnPromotionError()
    {
        Promotion(minOrder: 1_000_000);

        var exception = await FluentActions.Invoking(() => Create().CreateAsync(FromCart("SALE20"), null, CancellationToken.None))
            .Should().ThrowAsync<BusinessRuleException>();

        exception.Which.Code.Should().Be("promotion_not_applicable");
        _added.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateThrowsOnUnavailable()
    {
        Lines(Line(_serviceA, "Chăm sóc da", 300_000, 300_000), Line(_serviceB, "Massage", 440_000, 440_000, available: false));

        var exception = await FluentActions.Invoking(() => Create().CreateAsync(FromCart(), null, CancellationToken.None))
            .Should().ThrowAsync<BusinessRuleException>();

        exception.Which.Code.Should().Be("order_items_unavailable");
        exception.Which.Message.Should().Contain("Massage");
        _added.Should().BeEmpty();
    }

    [Fact]
    public async Task CreateRejectsSmallAmount()
    {
        Lines(Line(_serviceA, "Gội đầu", 3_000, 3_000));

        var exception = await FluentActions.Invoking(() => Create().CreateAsync(FromCart(), null, CancellationToken.None))
            .Should().ThrowAsync<BusinessRuleException>();

        exception.Which.Code.Should().Be("order_amount_too_small");
    }

    [Fact]
    public async Task ZeroTotalIsPaidAndIssued()
    {
        Lines(Line(_serviceA, "Tư vấn da", 0, 0));

        await Create().CreateAsync(FromCart(), null, CancellationToken.None);

        _added.Single().Status.Should().Be(OrderStatus.Paid);
        await _entitlements.Received(1).AddAsync(Arg.Any<ServiceEntitlement>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task IdempotencyHitReturnsExisting()
    {
        var existing = new Order { Code = "DH261027AAAAAA", Status = OrderStatus.PendingPayment, PaymentDueAtUtc = Now.AddMinutes(10) };
        _added.Add(existing);
        var key = Guid.NewGuid();
        _orders.FindIdByIdempotencyKeyAsync(_user.UserId!.Value, key, Arg.Any<CancellationToken>()).Returns(existing.Id);

        var result = (await Create().CreateAsync(FromCart(), key, CancellationToken.None)).Data!;

        result.Created.Should().BeFalse();
        result.Order.Id.Should().Be(existing.Id);
        _added.Should().ContainSingle();
    }

    [Fact]
    public async Task IdempotencyKeyIsStored()
    {
        var key = Guid.NewGuid();

        await Create().CreateAsync(FromCart(), key, CancellationToken.None);

        _added.Single().IdempotencyKey.Should().Be(key);
    }

    [Fact]
    public async Task GetMarksPayableOnlyBeforeDue()
    {
        var order = new Order { CustomerId = _user.UserId!.Value, Status = OrderStatus.PendingPayment, PaymentDueAtUtc = Now.AddMinutes(1) };
        var late = new Order { CustomerId = _user.UserId!.Value, Status = OrderStatus.PendingPayment, PaymentDueAtUtc = Now };
        _added.AddRange([order, late]);

        (await Create().GetAsync(order.Id, CancellationToken.None)).Data!.IsPayable.Should().BeTrue();
        (await Create().GetAsync(late.Id, CancellationToken.None)).Data!.IsPayable.Should().BeFalse();
        await FluentActions.Invoking(() => Create().GetAsync(Guid.NewGuid(), CancellationToken.None)).Should().ThrowAsync<NotFoundException>();
    }
}
