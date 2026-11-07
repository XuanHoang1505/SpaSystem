using FluentAssertions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.DTOs.Payments;
using NhuNguyetSpa.Application.Interfaces.Payments;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Tests.Orders;
using NhuNguyetSpa.Application.Tests.Staff;
using NhuNguyetSpa.Application.UseCases.Payments;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Payments;

/// <summary>Payment attempts and gateway results (docs/specs/orders.md: BR-ORD-05, 06, 10; Q-19, Q-20; ORD-T14–T22, T27).</summary>
public sealed class PaymentServiceTests
{
    private static readonly DateTime Now = StaffTestDoubles.Now;
    private readonly IOrderRepository _orders = Substitute.For<IOrderRepository>();
    private readonly IPaymentRepository _payments = Substitute.For<IPaymentRepository>();
    private readonly IRepository<ServiceEntitlement> _entitlements = Substitute.For<IRepository<ServiceEntitlement>>();
    private readonly ICartRepository _carts = Substitute.For<ICartRepository>();
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();
    private readonly IPaymentGateway _gateway = Substitute.For<IPaymentGateway>();
    private readonly IUnitOfWork _unitOfWork = OrderTestDoubles.UnitOfWork();
    private readonly ListLogger<PaymentService> _logs = new();
    private readonly NhuNguyetSpa.Application.Common.Interfaces.ICurrentUserService _user = StaffTestDoubles.User("customer");
    private readonly Order _order;
    private readonly Payment _payment;
    private BookingOptions _bookingOptions = new();

    public PaymentServiceTests()
    {
        _order = new Order
        {
            Code = "DH261027ABCDEF",
            CustomerId = _user.UserId!.Value,
            Subtotal = 500_000,
            GrandTotal = 500_000,
            Status = OrderStatus.PendingPayment,
            PaymentDueAtUtc = Now.AddMinutes(10),
        };
        _order.Items.Add(new OrderItem { OrderId = _order.Id, SpaServiceId = Guid.NewGuid(), ProductName = "Da", UnitPrice = 500_000, LineTotal = 500_000 });
        _payment = new Payment
        {
            OrderId = _order.Id, Provider = "vnpay", Amount = 500_000, Status = PaymentStatus.Pending, RequestCode = "DH261027ABCDEF01",
            ExpiresAtUtc = _order.PaymentDueAtUtc,
        };
        _order.Payments.Add(_payment);
        _orders.LockAsync(_order.Id, Arg.Any<CancellationToken>()).Returns(_order);
        _payments.FindByRequestCodeAsync("DH261027ABCDEF01", Arg.Any<CancellationToken>()).Returns(new PaymentReference(_payment.Id, _order.Id));
        _gateway.Provider.Returns("vnpay");
        _gateway.ProcessesReturnUrl.Returns(true);
        _gateway.CreatePaymentUrl(Arg.Any<PaymentUrlRequest>()).Returns(call => "https://pay.test/" + call.Arg<PaymentUrlRequest>().RequestCode);
    }

    private PaymentService Create() => new(_orders, _payments,
        new EntitlementIssuer(_entitlements, Substitute.For<IRepository<CustomerPackage>>(), Substitute.For<IRepository<TreatmentPlan>>(),
            Substitute.For<IServicePackageRepository>(), _carts, _appointments, NullLogger<EntitlementIssuer>.Instance),
        _gateway, _unitOfWork, _user, StaffTestDoubles.Clock(), Options.Create(new PaymentOptions()), _logs, _appointments,
        Options.Create(_bookingOptions));

    private void Gateway(bool valid = true, string code = "DH261027ABCDEF01", decimal amount = 500_000, bool success = true) =>
        _gateway.ParseCallback(Arg.Any<IReadOnlyDictionary<string, string>>())
            .Returns(new PaymentCallback(valid, code, amount, success, success ? "00" : "24", "14123456"));

    private Task<PaymentCallbackOutcome> Callback(bool fromReturnUrl = false) =>
        Create().ProcessCallbackAsync(new Dictionary<string, string>(), fromReturnUrl, CancellationToken.None);

    [Fact]
    public async Task AttemptCodeAndAmount()
    {
        _order.Payments.Clear();

        var attempt = (await Create().CreateAttemptAsync(_order.Id, new CreatePaymentRequest(PaymentClient.Mobile), "10.0.0.5", CancellationToken.None)).Data!;

        attempt.PaymentUrl.Should().Be("https://pay.test/DH261027ABCDEF01");
        attempt.ExpiresAtUtc.Should().Be(_order.PaymentDueAtUtc);
        await _payments.Received(1).AddAsync(Arg.Is<Payment>(payment =>
            payment.Id == attempt.PaymentId && payment.OrderId == _order.Id && payment.Provider == "vnpay" && payment.Amount == 500_000 &&
            payment.Status == PaymentStatus.Pending && payment.RequestCode == "DH261027ABCDEF01" && payment.PaymentUrl == attempt.PaymentUrl),
            Arg.Any<CancellationToken>());
        _gateway.Received(1).CreatePaymentUrl(new PaymentUrlRequest(
            "DH261027ABCDEF01", 500_000, "DH261027ABCDEF", Now, _order.PaymentDueAtUtc, "10.0.0.5", PaymentClient.Mobile));
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task SecondAttemptGetsNextNumber()
    {
        var attempt = (await Create().CreateAttemptAsync(_order.Id, new CreatePaymentRequest(null), "::1", CancellationToken.None)).Data!;

        attempt.PaymentUrl.Should().EndWith("DH261027ABCDEF02");
    }

    [Fact]
    public async Task AttemptOnForeignOrderIsNotFound()
    {
        _order.CustomerId = Guid.NewGuid();

        var exception = await FluentActions.Invoking(() => Create().CreateAttemptAsync(_order.Id, new CreatePaymentRequest(null), "::1", CancellationToken.None))
            .Should().ThrowAsync<NotFoundException>();

        exception.Which.Code.Should().Be("order_not_found");
    }

    [Theory]
    [InlineData(OrderStatus.Paid, 10)]
    [InlineData(OrderStatus.PendingPayment, 0)]
    public async Task AttemptRejectedWhenPaidOrPastDue(OrderStatus status, int minutesLeft)
    {
        _order.Status = status;
        _order.PaymentDueAtUtc = Now.AddMinutes(minutesLeft);

        var exception = await FluentActions.Invoking(() => Create().CreateAttemptAsync(_order.Id, new CreatePaymentRequest(null), "::1", CancellationToken.None))
            .Should().ThrowAsync<ConflictException>();

        exception.Which.Code.Should().Be("order_not_payable");
    }

    [Fact]
    public async Task SixthAttemptRejected()
    {
        for (var i = 0; i < 4; i++)
            _order.Payments.Add(new Payment { Status = PaymentStatus.Failed });

        var exception = await FluentActions.Invoking(() => Create().CreateAttemptAsync(_order.Id, new CreatePaymentRequest(null), "::1", CancellationToken.None))
            .Should().ThrowAsync<ConflictException>();

        exception.Which.Code.Should().Be("payment_attempts_exceeded");
        _gateway.DidNotReceiveWithAnyArgs().CreatePaymentUrl(default!);
    }

    [Fact]
    public async Task GatewayUnavailableSavesNothing()
    {
        _gateway.CreatePaymentUrl(Arg.Any<PaymentUrlRequest>()).Returns(_ => throw PaymentErrors.GatewayUnavailable());

        await FluentActions.Invoking(() => Create().CreateAttemptAsync(_order.Id, new CreatePaymentRequest(null), "::1", CancellationToken.None))
            .Should().ThrowAsync<ServiceUnavailableException>();

        await _unitOfWork.DidNotReceiveWithAnyArgs().SaveChangesAsync(default);
    }

    [Fact]
    public async Task InvalidSignatureChangesNothing()
    {
        Gateway(valid: false);

        (await Callback()).Should().Be(new PaymentCallbackOutcome(PaymentCallbackStatus.InvalidSignature, null));
        await _orders.DidNotReceiveWithAnyArgs().LockAsync(default, default);
    }

    [Fact]
    public async Task UnknownRequestCodeIsNotFound()
    {
        Gateway(code: "NOPE01");

        (await Callback()).Status.Should().Be(PaymentCallbackStatus.PaymentNotFound);
    }

    [Fact]
    public async Task WrongAmountChangesNothing()
    {
        Gateway(amount: 400_000);

        (await Callback()).Status.Should().Be(PaymentCallbackStatus.InvalidAmount);
        _payment.Status.Should().Be(PaymentStatus.Pending);
        await _unitOfWork.DidNotReceiveWithAnyArgs().SaveChangesAsync(default);
    }

    [Fact]
    public async Task SuccessPaysOrderAndIssuesEntitlements()
    {
        Gateway();

        var outcome = await Callback();

        outcome.Should().Be(new PaymentCallbackOutcome(PaymentCallbackStatus.Confirmed, _order.Id));
        _payment.Status.Should().Be(PaymentStatus.Succeeded);
        _payment.PaidAtUtc.Should().Be(Now);
        _payment.ProviderTransactionId.Should().Be("14123456");
        _order.Status.Should().Be(OrderStatus.Paid);
        await _entitlements.Received(1).AddAsync(Arg.Is<ServiceEntitlement>(entitlement => entitlement.CustomerId == _order.CustomerId),
            Arg.Any<CancellationToken>());
        await _unitOfWork.Received(1).SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task SecondDeliveryIsAlreadyProcessed()
    {
        Gateway();
        await Callback();

        (await Callback()).Status.Should().Be(PaymentCallbackStatus.AlreadyProcessed);
        await _entitlements.Received(1).AddAsync(Arg.Any<ServiceEntitlement>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task FailureKeepsOrderPayable()
    {
        Gateway(success: false);

        (await Callback()).Status.Should().Be(PaymentCallbackStatus.Confirmed);

        _payment.Status.Should().Be(PaymentStatus.Failed);
        _order.Status.Should().Be(OrderStatus.PendingPayment);
        await _entitlements.DidNotReceiveWithAnyArgs().AddAsync(default!, default);
    }

    [Fact]
    public async Task LateSuccessRevivesExpiredOrder()
    {
        _order.Status = OrderStatus.Expired;
        _payment.Status = PaymentStatus.Expired;
        Gateway();

        (await Callback()).Status.Should().Be(PaymentCallbackStatus.Confirmed);

        _payment.Status.Should().Be(PaymentStatus.Succeeded);
        _order.Status.Should().Be(OrderStatus.Paid);
        await _entitlements.Received(1).AddAsync(Arg.Any<ServiceEntitlement>(), Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task SecondSuccessKeepsOrderAndLogsWarning()
    {
        _order.Status = OrderStatus.Paid;
        _order.Payments.Add(new Payment { Status = PaymentStatus.Succeeded, RequestCode = "DH261027ABCDEF02" });
        Gateway();

        (await Callback()).Status.Should().Be(PaymentCallbackStatus.Confirmed);

        _payment.Status.Should().Be(PaymentStatus.Succeeded);
        _order.Status.Should().Be(OrderStatus.Paid);
        await _entitlements.DidNotReceiveWithAnyArgs().AddAsync(default!, default);
        _logs.Entries.Should().ContainSingle(entry => entry.Level == LogLevel.Warning && entry.Message.Contains("DH261027ABCDEF01") &&
                                                      entry.Message.Contains("manual refund"));
    }

    [Fact]
    public async Task ReturnUrlNotProcessedWhenDisabled()
    {
        _gateway.ProcessesReturnUrl.Returns(false);
        Gateway();

        (await Callback(fromReturnUrl: true)).Should().Be(new PaymentCallbackOutcome(PaymentCallbackStatus.NotProcessed, _order.Id));

        _payment.Status.Should().Be(PaymentStatus.Pending);
        await _orders.DidNotReceiveWithAnyArgs().LockAsync(default, default);
    }

    [Fact]
    public async Task ReturnUrlProcessedWhenEnabled()
    {
        Gateway();

        (await Callback(fromReturnUrl: true)).Status.Should().Be(PaymentCallbackStatus.Confirmed);
        _order.Status.Should().Be(OrderStatus.Paid);
    }

    private Appointment Hold()
    {
        var hold = new Appointment { OrderItemId = _order.Items.Single().Id, Status = AppointmentStatus.Held, HoldExpiresAtUtc = Now.AddMinutes(15) };
        _appointments.GetHoldsForOrdersAsync(Arg.Is<IReadOnlyCollection<Guid>>(ids => ids.Contains(_order.Id)), Arg.Any<CancellationToken>())
            .Returns([hold]);
        return hold;
    }

    [Fact]
    public async Task FailureKeepsHoldByDefault()
    {
        var hold = Hold();
        Gateway(success: false);

        await Callback();

        hold.Status.Should().Be(AppointmentStatus.Held);
        _order.Status.Should().Be(OrderStatus.PendingPayment);
    }

    [Fact]
    public async Task FailureReleasesHoldWhenConfigured()
    {
        _bookingOptions = new BookingOptions { ReleaseHoldOnPaymentFailure = true };
        var hold = Hold();
        Gateway(success: false);

        await Callback();

        hold.Status.Should().Be(AppointmentStatus.HoldExpired);
    }

    [Fact]
    public async Task SuccessConfirmsHold()
    {
        var hold = Hold();
        Gateway();

        await Callback();

        hold.Status.Should().Be(AppointmentStatus.Confirmed);
        hold.ServiceEntitlementId.Should().NotBeNull();
    }

    [Fact]
    public async Task DuplicateCallbackConfirmsOnce()
    {
        var hold = Hold();
        Gateway();

        await Callback();
        var second = await Callback(fromReturnUrl: true);

        second.Status.Should().Be(PaymentCallbackStatus.AlreadyProcessed);
        await _entitlements.Received(1).AddAsync(Arg.Any<ServiceEntitlement>(), Arg.Any<CancellationToken>());
        hold.Status.Should().Be(AppointmentStatus.Confirmed);
    }
}
