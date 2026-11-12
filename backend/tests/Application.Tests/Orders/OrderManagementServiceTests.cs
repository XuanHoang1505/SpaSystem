using FluentAssertions;
using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
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

/// <summary>UC-SPA-13: the owner's order list, detail and cancel (docs/specs/orders.md: BR-ORD-04, BR-ORD-11, ORD-T39…T41).</summary>
public sealed class OrderManagementServiceTests
{
    private static readonly DateTime Now = StaffTestDoubles.Now;
    private readonly IOrderRepository _orders = Substitute.For<IOrderRepository>();
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();
    private readonly IUnitOfWork _unitOfWork = OrderTestDoubles.UnitOfWork();
    private OrderSearchCriteria? _criteria;

    public OrderManagementServiceTests()
    {
        _appointments.GetHoldsForOrdersAsync(Arg.Any<IReadOnlyCollection<Guid>>(), Arg.Any<CancellationToken>()).Returns([]);
        _orders.SearchAsync(Arg.Do<OrderSearchCriteria>(criteria => _criteria = criteria), Arg.Any<CancellationToken>())
            .Returns(new PagedResult<OrderListItemDto>([], 1, 10, 0));
    }

    private OrderManagementService Create()
    {
        var clock = StaffTestDoubles.Clock();
        // Owners are never blocked by Q-44, even when it is configured.
        var orderOptions = Options.Create(new OrderOptions { CancelBlockMinutesAfterPaymentStart = 5 });
        return new OrderManagementService(_orders, new OrderCancellation(_orders, _appointments, _unitOfWork, clock, orderOptions), clock,
            Options.Create(new PaymentOptions()), new OrderListQueryValidator(), new CancelOrderRequestValidator());
    }

    private static OwnerOrderDetailDto Detail(Guid id, OrderStatus status, int dueInMinutes, params OwnerOrderPaymentDto[] payments) => new(
        id, "DH1", status, 0, 0, 0, Now.AddMinutes(dueInMinutes), Now, false, false, null, null,
        new OrderCustomerDto(Guid.NewGuid(), "Nguyệt", "0901234567", "a@spa.test"), [], payments, null, null);

    [Fact]
    public async Task ListDefaultsToNewestFirst()
    {
        await Create().ListAsync(new PagedQuery { SortDirection = SortDirection.Asc }, new OrderListQuery(), CancellationToken.None);

        _criteria!.CustomerId.Should().BeNull();
        _criteria.SortBy.Should().Be(OrderSortField.CreatedAtUtc);
        _criteria.Direction.Should().Be(SortDirection.Desc);
        _criteria.Search.Should().BeNull();
    }

    [Fact]
    public async Task ListUsesRequestedSortAndDirection()
    {
        var day = new DateOnly(2026, 11, 1);

        await Create().ListAsync(new PagedQuery { SortBy = " grandTotal ", SortDirection = SortDirection.Asc, Search = "  dh2611  " },
            new OrderListQuery { Status = "pending_payment", FromDate = day, ToDate = day }, CancellationToken.None);

        _criteria!.SortBy.Should().Be(OrderSortField.GrandTotal);
        _criteria.Direction.Should().Be(SortDirection.Asc);
        _criteria.Search.Should().Be("dh2611");
        _criteria.Status.Should().Be(OrderStatus.PendingPayment);
        _criteria.FromUtc.Should().Be(new DateTime(2026, 10, 31, 17, 0, 0, DateTimeKind.Utc));
        _criteria.ToUtcExclusive.Should().Be(new DateTime(2026, 11, 1, 17, 0, 0, DateTimeKind.Utc));
    }

    [Fact]
    public async Task ListRejectsBadSortAndLongSearch()
    {
        var act = () => Create().ListAsync(new PagedQuery { SortBy = "customer", Search = new string('a', 101) }, new OrderListQuery(),
            CancellationToken.None);

        var errors = (await act.Should().ThrowAsync<ValidationException>()).Which.Errors.ToList();
        errors.Select(error => (error.PropertyName, error.ErrorMessage)).Should().BeEquivalentTo(new[]
        {
            ("search", "Từ khóa tối đa 100 ký tự."),
            ("sortBy", "Chỉ sắp xếp được theo createdAtUtc hoặc grandTotal."),
        });
    }

    [Fact]
    public async Task GetMissingIsNotFound()
    {
        var act = () => Create().GetAsync(Guid.NewGuid(), CancellationToken.None);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("order_not_found");
    }

    [Fact]
    public async Task GetFillsFlags()
    {
        var id = Guid.NewGuid();
        var justStarted = new OwnerOrderPaymentDto(Guid.NewGuid(), "vnpay", 0, PaymentStatus.Pending, "DH101", null, Now.AddMinutes(-1), Now.AddMinutes(5), null);
        _orders.GetOwnerDetailAsync(id, Arg.Any<CancellationToken>()).Returns(Detail(id, OrderStatus.PendingPayment, 5, justStarted));

        var detail = (await Create().GetAsync(id, CancellationToken.None)).Data!;

        detail.IsPayable.Should().BeTrue();
        detail.CanCancel.Should().BeTrue();
    }

    [Fact]
    public async Task CancelPassesNullCustomer()
    {
        var order = new Order { Code = "DH1", CustomerId = Guid.NewGuid(), Status = OrderStatus.PendingPayment, PaymentDueAtUtc = Now.AddMinutes(5) };
        order.Payments.Add(new Payment { Status = PaymentStatus.Pending, CreatedAtUtc = Now.AddMinutes(-1) });
        _orders.LockAsync(order.Id, Arg.Any<CancellationToken>()).Returns(order);
        _orders.GetOwnerDetailAsync(order.Id, Arg.Any<CancellationToken>()).Returns(_ => Detail(order.Id, order.Status, 5));

        await FluentActions.Invoking(() => Create().CancelAsync(order.Id, new CancelOrderRequest(null), CancellationToken.None))
            .Should().ThrowAsync<ValidationException>();
        var detail = (await Create().CancelAsync(order.Id, new CancelOrderRequest("Khách gọi điện hủy"), CancellationToken.None)).Data!;

        order.Status.Should().Be(OrderStatus.Cancelled);
        order.CancellationReason.Should().Be("Khách gọi điện hủy");
        detail.Status.Should().Be(OrderStatus.Cancelled);
    }
}
