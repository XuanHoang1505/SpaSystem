using FluentAssertions;
using FluentValidation;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
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
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Orders;

/// <summary>UC-SPA-12: the customer's order list, flags and cancel (docs/specs/orders.md: BR-ORD-04, BR-ORD-11, ORD-T30, T31).</summary>
public sealed class OrderServiceListCancelTests
{
    private static readonly DateTime Now = StaffTestDoubles.Now;
    private readonly IOrderRepository _orders = Substitute.For<IOrderRepository>();
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();
    private readonly IUnitOfWork _unitOfWork = OrderTestDoubles.UnitOfWork();
    private readonly ICurrentUserService _user = StaffTestDoubles.User("customer");
    private OrderSearchCriteria? _criteria;

    public OrderServiceListCancelTests()
    {
        _appointments.GetHoldsForOrdersAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>()).Returns([]);
    }

    private OrderService Create()
    {
        var clock = StaffTestDoubles.Clock();
        var packages = Substitute.For<IServicePackageRepository>();
        var carts = Substitute.For<ICartRepository>();
        var issuer = new EntitlementIssuer(Substitute.For<IRepository<ServiceEntitlement>>(), Substitute.For<IRepository<CustomerPackage>>(),
            Substitute.For<IRepository<TreatmentPlan>>(), packages, carts, _appointments, NullLogger<EntitlementIssuer>.Instance);
        var orderOptions = Options.Create(new OrderOptions());
        return new OrderService(carts, Substitute.For<ISpaServiceRepository>(), packages, _orders, Substitute.For<IRepository<PromotionRedemption>>(),
            new PromotionApplier(Substitute.For<IPromotionRepository>(), clock), issuer, Substitute.For<IPaymentGateway>(), _unitOfWork, _user, clock,
            orderOptions, Options.Create(new PaymentOptions()), new OrderRequestValidator(),
            new OrderCancellation(_orders, _appointments, _unitOfWork, clock, orderOptions), new OrderListQueryValidator(),
            new CancelOrderRequestValidator());
    }

    private static (MyOrderListItemDto, OrderActionFacts) Row(OrderStatus status, int dueInMinutes) =>
        (new MyOrderListItemDto(Guid.NewGuid(), "DH" + status, status, Now, Now.AddMinutes(dueInMinutes), 500_000, 1, ["Massage"], false, false),
            new OrderActionFacts(status, Now.AddMinutes(dueInMinutes), 0, null));

    private void Page(params (MyOrderListItemDto, OrderActionFacts)[] rows) =>
        _orders.SearchMineAsync(Arg.Do<OrderSearchCriteria>(criteria => _criteria = criteria), Arg.Any<CancellationToken>())
            .Returns(new PagedResult<(MyOrderListItemDto Item, OrderActionFacts Facts)>(rows, 1, 10, rows.Length));

    [Fact]
    public async Task ListFillsFlagsFromFacts()
    {
        Page(Row(OrderStatus.PendingPayment, 10), Row(OrderStatus.PendingPayment, -2), Row(OrderStatus.Paid, -60));

        var items = (await Create().ListAsync(new PagedQuery(), new OrderListQuery(), CancellationToken.None)).Data!.Items;

        items.Select(item => (item.IsPayable, item.CanCancel)).Should().Equal((true, true), (false, true), (false, false));
        _criteria!.CustomerId.Should().Be(_user.UserId);
        _criteria.SortBy.Should().Be(OrderSortField.CreatedAtUtc);
        _criteria.Direction.Should().Be(SortDirection.Desc);
    }

    [Fact]
    public async Task ListPassesVietnamDayRange()
    {
        Page();
        var day = new DateOnly(2026, 11, 1);

        await Create().ListAsync(new PagedQuery { PageNumber = 2, PageSize = 5, Search = "ignored", SortBy = "grandTotal" },
            new OrderListQuery { Status = "paid", FromDate = day, ToDate = day }, CancellationToken.None);

        _criteria!.FromUtc.Should().Be(new DateTime(2026, 10, 31, 17, 0, 0, DateTimeKind.Utc));
        _criteria.ToUtcExclusive.Should().Be(new DateTime(2026, 11, 1, 17, 0, 0, DateTimeKind.Utc));
        _criteria.Status.Should().Be(OrderStatus.Paid);
        _criteria.Search.Should().BeNull();
        _criteria.SortBy.Should().Be(OrderSortField.CreatedAtUtc);
        (_criteria.PageNumber, _criteria.PageSize).Should().Be((2, 5));
    }

    [Fact]
    public async Task ListRejectsBadStatus()
    {
        var act = () => Create().ListAsync(new PagedQuery(), new OrderListQuery { Status = "done" }, CancellationToken.None);

        await act.Should().ThrowAsync<ValidationException>();
    }

    [Fact]
    public async Task CancelValidatesThenDelegates()
    {
        var order = new Order { Code = "DH1", CustomerId = _user.UserId!.Value, Status = OrderStatus.PendingPayment, PaymentDueAtUtc = Now.AddMinutes(5) };
        _orders.LockAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _orders.GetDetailAsync(order.Id, order.CustomerId, Arg.Any<CancellationToken>()).Returns(_ => new OrderDetailDto(
            order.Id, order.Code, order.Status, 0, 0, 0, order.PaymentDueAtUtc, Now, false, [], [], null));

        await FluentActions.Invoking(() => Create().CancelAsync(order.Id, new CancelOrderRequest(" "), CancellationToken.None))
            .Should().ThrowAsync<ValidationException>();
        order.Status.Should().Be(OrderStatus.PendingPayment);

        var detail = (await Create().CancelAsync(order.Id, new CancelOrderRequest("Đổi ý"), CancellationToken.None)).Data!;

        order.Status.Should().Be(OrderStatus.Cancelled);
        detail.Status.Should().Be(OrderStatus.Cancelled);
        detail.CanCancel.Should().BeFalse();
    }

    [Fact]
    public async Task GetFillsCanCancel()
    {
        var id = Guid.NewGuid();
        _orders.GetDetailAsync(id, _user.UserId!.Value, Arg.Any<CancellationToken>()).Returns(new OrderDetailDto(
            id, "DH1", OrderStatus.PendingPayment, 0, 0, 0, Now.AddMinutes(-1), Now, false, [], [], null));

        var detail = (await Create().GetAsync(id, CancellationToken.None)).Data!;

        detail.IsPayable.Should().BeFalse();
        detail.CanCancel.Should().BeTrue();
    }
}

/// <summary>Filters shared by the customer and owner order lists (BR-ORD-11).</summary>
public sealed class OrderListQueryValidatorTests
{
    private readonly OrderListQueryValidator _validator = new();

    [Fact]
    public void ReversedRangeIsInvalid()
    {
        var result = _validator.Validate(new OrderListQuery { FromDate = new DateOnly(2026, 11, 2), ToDate = new DateOnly(2026, 11, 1) });

        result.Errors.Single().ErrorMessage.Should().Be("Ngày kết thúc phải từ ngày bắt đầu trở đi.");
    }

    [Theory]
    [InlineData("done", false)]
    [InlineData("Paid", false)]
    [InlineData("pending_payment", true)]
    [InlineData(null, true)]
    public void StatusMustBeSnakeCaseOrderStatus(string? status, bool valid)
    {
        _validator.Validate(new OrderListQuery { Status = status }).IsValid.Should().Be(valid);
    }
}
