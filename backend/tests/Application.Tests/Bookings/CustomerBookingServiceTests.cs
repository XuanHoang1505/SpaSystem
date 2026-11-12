using FluentAssertions;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.DTOs.Catalog;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.DTOs.Purchases;
using NhuNguyetSpa.Application.Interfaces.Payments;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Orders;
using NhuNguyetSpa.Application.Tests.Orders;
using NhuNguyetSpa.Application.Tests.Staff;
using NhuNguyetSpa.Application.UseCases.Bookings;
using NhuNguyetSpa.Application.UseCases.Orders;
using NhuNguyetSpa.Application.UseCases.Payments;
using NhuNguyetSpa.Application.UseCases.Promotions;
using NhuNguyetSpa.Application.Validators.Bookings;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;
using NSubstitute;
using NSubstitute.ExceptionExtensions;
using Xunit;

namespace NhuNguyetSpa.Application.Tests.Bookings;

/// <summary>
/// UC-SPA-15 both flows (docs/specs/bookings.md BR-BKG-05, 06, 15; BKG-T25, T31, T32, T35, T36, T37). The clock is 00:30 VN on 27/10/2026;
/// bookings are 28/10 09:00 with one staff member on a 08:00–12:00 shift.
/// </summary>
public sealed class CustomerBookingServiceTests
{
    private static readonly DateTime Now = StaffTestDoubles.Now;
    private static readonly DateOnly Day = StaffTestDoubles.VietnamToday.AddDays(1);
    private readonly ISpaServiceRepository _services = Substitute.For<ISpaServiceRepository>();
    private readonly IPurchaseRepository _purchases = Substitute.For<IPurchaseRepository>();
    private readonly IAppointmentRepository _appointments = Substitute.For<IAppointmentRepository>();
    private readonly IOrderRepository _orders = Substitute.For<IOrderRepository>();
    private readonly IOrderService _orderService = Substitute.For<IOrderService>();
    private readonly IStaffMemberRepository _staff = Substitute.For<IStaffMemberRepository>();
    private readonly IWorkScheduleRepository _shifts = Substitute.For<IWorkScheduleRepository>();
    private readonly IPaymentGateway _gateway = Substitute.For<IPaymentGateway>();
    private readonly IUnitOfWork _unitOfWork = OrderTestDoubles.UnitOfWork();
    private readonly ICurrentUserService _user = StaffTestDoubles.User("customer");
    private readonly AvailabilityCandidate _an = new(Guid.NewGuid(), "An");
    private readonly Guid _serviceId = Guid.NewGuid();
    private readonly List<Appointment> _addedAppointments = [];
    private readonly List<Order> _addedOrders = [];

    public CustomerBookingServiceTests()
    {
        _gateway.MinAmount.Returns(5000m);
        _services.GetDetailAsync(_serviceId, true, Arg.Any<CancellationToken>()).Returns(new ServiceDetailDto(
            _serviceId, "Chăm sóc da", Guid.Empty, "Da", null, 300_000, 60, null, CatalogStatus.OnSale, Now, null));
        _services.GetByIdAsync(_serviceId, Arg.Any<CancellationToken>()).Returns(new SpaService { Id = _serviceId, DurationMinutes = 60 });
        _staff.GetAvailabilityCandidatesAsync(_serviceId, Day, Arg.Any<Guid?>(), Arg.Any<CancellationToken>()).Returns([_an]);
        _shifts.GetActiveRangesAsync(default!, default, default, default).ReturnsForAnyArgs(call =>
            call.ArgAt<IReadOnlyCollection<Guid>>(0).Select(id => (id, call.ArgAt<DateOnly>(1), new TimeOnly(8, 0), new TimeOnly(12, 0))).ToList());
        _appointments.GetOccupyingForStaffOnAsync(default!, default, default, default, default).ReturnsForAnyArgs([]);
        _appointments.GetCustomerOccupyingOnAsync(default, default, default, default, default).ReturnsForAnyArgs([]);
        _appointments.AddAsync(Arg.Do<Appointment>(_addedAppointments.Add), Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);
        _appointments.GetMineAsync(Arg.Any<Guid>(), Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(call => Mine(call.ArgAt<Guid>(0)));
        _orders.AddAsync(Arg.Do<Order>(_addedOrders.Add), Arg.Any<CancellationToken>()).Returns(Task.CompletedTask);
        _orderService.GetAsync(Arg.Any<Guid>(), Arg.Any<CancellationToken>()).Returns(call => OperationResult<OrderDetailDto>.Success(new OrderDetailDto(
            call.ArgAt<Guid>(0), "DH1", OrderStatus.PendingPayment, 300_000, 0, 300_000, Now.AddMinutes(15), Now, true, [], [], null,
            new OrderAppointmentDto(_addedAppointments.FirstOrDefault()?.Id ?? Guid.Empty, Day, new TimeOnly(9, 0), new TimeOnly(10, 0),
                AppointmentStatus.Held, new AppointmentStaffDto(_an.StaffMemberId, "An")))));
    }

    private static MyAppointmentRow Mine(Guid id) => new(new MyAppointmentDto(
        id, Day, new TimeOnly(9, 0), new TimeOnly(10, 0), AppointmentStatus.Confirmed, null, null, null, Now,
        new AppointmentServiceDto(Guid.Empty, "Chăm sóc da"), new AppointmentStaffDto(Guid.Empty, "An"), AppointmentBookingSource.Entitlement,
        null, null, null), new AppointmentChangeFacts(AppointmentStatus.Confirmed, Day, new TimeOnly(9, 0), null, null, null, null));

    private CustomerBookingService Create()
    {
        var clock = StaffTestDoubles.Clock();
        var issuer = new EntitlementIssuer(Substitute.For<IRepository<ServiceEntitlement>>(), Substitute.For<IRepository<CustomerPackage>>(),
            Substitute.For<IRepository<TreatmentPlan>>(), Substitute.For<IServicePackageRepository>(), Substitute.For<ICartRepository>(),
            _appointments, NullLogger<EntitlementIssuer>.Instance);
        var placement = new OrderPlacement(Substitute.For<ICartRepository>(), _services, Substitute.For<IServicePackageRepository>(), _orders,
            Substitute.For<IRepository<PromotionRedemption>>(), new PromotionApplier(Substitute.For<IPromotionRepository>(), clock), issuer,
            _gateway, _unitOfWork, clock, Options.Create(new OrderOptions()));
        var reserver = new BookingSlotReserver(_staff, _shifts, _appointments, clock);
        var reader = new MyAppointmentReader(_appointments, clock, Options.Create(new BookingOptions()));
        return new CustomerBookingService(_services, _purchases, _appointments, _orders, _orderService, placement, reserver, reader, _unitOfWork, _user,
            clock, Options.Create(new OrderOptions()), Options.Create(new OrderExpiryOptions()),
            new BookNowRequestValidator(clock, Options.Create(new BookingOptions())),
            new BookAppointmentRequestValidator(clock, Options.Create(new BookingOptions())));
    }

    private BookNowRequest BookNow(Guid? staffId = null) => new(_serviceId, Day, new TimeOnly(9, 0), staffId ?? _an.StaffMemberId, null);

    [Fact]
    public async Task BookNowCreatesHeldAppointmentLinkedToOrderLine()
    {
        var result = await Create().BookNowAsync(BookNow(), null, default);

        var order = _addedOrders.Single();
        var appointment = _addedAppointments.Single();
        appointment.Status.Should().Be(AppointmentStatus.Held);
        appointment.OrderItemId.Should().Be(order.Items.Single().Id);
        appointment.CustomerId.Should().Be(_user.UserId!.Value);
        appointment.StaffMemberId.Should().Be(_an.StaffMemberId);
        (appointment.Date, appointment.StartTime, appointment.EndTime).Should().Be((Day, new TimeOnly(9, 0), new TimeOnly(10, 0)));
        order.Status.Should().Be(OrderStatus.PendingPayment);
        order.Items.Single().SpaServiceId.Should().Be(_serviceId);
        result.Data!.Created.Should().BeTrue();
        result.Data.Order.Id.Should().Be(order.Id);
    }

    [Fact]
    public async Task BookNowHoldEndsAtDuePlusGrace()
    {
        await Create().BookNowAsync(BookNow(), null, default);

        _addedAppointments.Single().HoldExpiresAtUtc.Should().Be(_addedOrders.Single().PaymentDueAtUtc.AddMinutes(5));
        _addedOrders.Single().PaymentDueAtUtc.Should().Be(Now.AddMinutes(15));
    }

    [Fact]
    public async Task BookNowDiscontinuedServiceIsNotFound()
    {
        var act = () => Create().BookNowAsync(BookNow() with { SpaServiceId = Guid.NewGuid() }, null, default);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be("service_not_found");
        _addedAppointments.Should().BeEmpty();
    }

    [Fact]
    public async Task BookNowTooSoonIsRejected()
    {
        // 00:30 VN now → hold ends 00:50; a 00:30 start today is past, 01:00 tomorrow is fine, so use today 01:00 with a long hold.
        var act = () => Create().BookNowAsync(new BookNowRequest(_serviceId, StaffTestDoubles.VietnamToday, new TimeOnly(0, 30), null, null), null,
            default);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be(BookingErrors.SlotTooSoonCode);
    }

    [Fact]
    public async Task BookNowReplayReturnsExisting()
    {
        var key = Guid.NewGuid();
        var existing = Guid.NewGuid();
        _orders.FindIdByIdempotencyKeyAsync(_user.UserId!.Value, key, Arg.Any<CancellationToken>()).Returns(existing);

        var result = await Create().BookNowAsync(BookNow(), key, default);

        result.Data!.Created.Should().BeFalse();
        result.Data.Order.Id.Should().Be(existing);
        _addedOrders.Should().BeEmpty();
    }

    [Fact]
    public async Task ExcludeViolationWithIdempotencyKeyIsSlotUnavailable()
    {
        _unitOfWork.SaveChangesAsync(Arg.Any<CancellationToken>()).ThrowsAsync(BookingErrors.SlotUnavailable());

        var act = () => Create().BookNowAsync(BookNow(), Guid.NewGuid(), default);

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be(BookingErrors.SlotUnavailableCode);
    }

    [Fact]
    public async Task FlowTwoBooksEntitlement()
    {
        var entitlement = AvailableEntitlement();

        await Create().BookFromEntitlementAsync(new BookAppointmentRequest(entitlement.Id, null, Day, new TimeOnly(9, 0), null), default);

        entitlement.Status.Should().Be(EntitlementStatus.Booked);
        var appointment = _addedAppointments.Single();
        appointment.Status.Should().Be(AppointmentStatus.Confirmed);
        appointment.ServiceEntitlementId.Should().Be(entitlement.Id);
        appointment.StaffMemberId.Should().Be(_an.StaffMemberId);
        await _unitOfWork.Received().SaveChangesAsync(Arg.Any<CancellationToken>());
    }

    [Fact]
    public async Task FlowTwoRereadsAfterLock()
    {
        var entitlement = AvailableEntitlement();
        entitlement.Status = EntitlementStatus.Booked; // a concurrent request booked it while we waited for the lock

        var act = () => Create().BookFromEntitlementAsync(new BookAppointmentRequest(entitlement.Id, null, Day, new TimeOnly(9, 0), null), default);

        (await act.Should().ThrowAsync<ConflictException>()).Which.Code.Should().Be(BookingErrors.EntitlementNotEligibleCode);
        _addedAppointments.Should().BeEmpty();
    }

    [Fact]
    public async Task FlowTwoOthersEntitlementIsNotFound()
    {
        var act = () => Create().BookFromEntitlementAsync(new BookAppointmentRequest(Guid.NewGuid(), null, Day, new TimeOnly(9, 0), null), default);

        (await act.Should().ThrowAsync<NotFoundException>()).Which.Code.Should().Be(BookingErrors.EntitlementNotFoundCode);
    }

    [Fact]
    public async Task FlowTwoSessionTooEarly()
    {
        var sessionId = Guid.NewGuid();
        var facts = new SessionBookingFacts(sessionId, _serviceId, 45, 2, TreatmentSessionStatus.NotBooked, CustomerPackageStatus.Active,
            Now.AddDays(90), TreatmentPlanStatus.InProgress, true, new PreviousVisit(Day, new TimeOnly(8, 0)), 7);
        _purchases.GetSessionFactsAsync(sessionId, _user.UserId!.Value, Arg.Any<CancellationToken>()).Returns(facts);

        var act = () => Create().BookFromEntitlementAsync(new BookAppointmentRequest(null, sessionId, Day, new TimeOnly(9, 0), null), default);

        (await act.Should().ThrowAsync<BusinessRuleException>()).Which.Code.Should().Be(BookingErrors.SessionTooEarlyCode);
    }

    [Fact]
    public async Task FlowTwoBooksSessionWithSnapshotDuration()
    {
        var session = new TreatmentSession { SpaServiceId = _serviceId, SequenceNumber = 1, DurationMinutes = 45, Status = TreatmentSessionStatus.NotBooked };
        var facts = new SessionBookingFacts(session.Id, _serviceId, 45, 1, TreatmentSessionStatus.NotBooked, CustomerPackageStatus.Active,
            Now.AddDays(90), TreatmentPlanStatus.NotStarted, true, null, 7);
        _purchases.GetSessionFactsAsync(session.Id, _user.UserId!.Value, Arg.Any<CancellationToken>()).Returns(facts);
        _purchases.GetSessionForUpdateAsync(session.Id, Arg.Any<CancellationToken>()).Returns(session);

        await Create().BookFromEntitlementAsync(new BookAppointmentRequest(null, session.Id, Day, new TimeOnly(9, 0), null), default);

        session.Status.Should().Be(TreatmentSessionStatus.Booked);
        var appointment = _addedAppointments.Single();
        appointment.TreatmentSessionId.Should().Be(session.Id);
        appointment.EndTime.Should().Be(new TimeOnly(9, 45));
    }

    private ServiceEntitlement AvailableEntitlement()
    {
        var entitlement = new ServiceEntitlement { CustomerId = _user.UserId!.Value, Status = EntitlementStatus.Available };
        _purchases.GetServiceAsync(entitlement.Id, _user.UserId.Value, Arg.Any<CancellationToken>()).Returns(new PurchasedServiceRow(
            entitlement.Id, _serviceId, "Chăm sóc da", null, 60, EntitlementStatus.Available, null, Now, null, new PurchaseOrderRefDto(Guid.NewGuid(), "DH1")));
        _purchases.GetEntitlementForBookingAsync(entitlement.Id, _user.UserId.Value, Arg.Any<CancellationToken>()).Returns((entitlement, _serviceId));
        return entitlement;
    }
}
