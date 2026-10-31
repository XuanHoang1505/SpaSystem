using FluentValidation;
using Microsoft.Extensions.Options;
using NhuNguyetSpa.Application.Common.Interfaces;
using NhuNguyetSpa.Application.Common.Models;
using NhuNguyetSpa.Application.Common.Options;
using NhuNguyetSpa.Application.DTOs.Bookings;
using NhuNguyetSpa.Application.DTOs.Orders;
using NhuNguyetSpa.Application.Interfaces.Persistence;
using NhuNguyetSpa.Application.Interfaces.Repositories;
using NhuNguyetSpa.Application.Interfaces.Services.Bookings;
using NhuNguyetSpa.Application.Interfaces.Services.Orders;
using NhuNguyetSpa.Application.UseCases.Catalog;
using NhuNguyetSpa.Application.UseCases.Orders;
using NhuNguyetSpa.Domain.Entities;
using NhuNguyetSpa.Domain.Enums;
using NhuNguyetSpa.Domain.Exceptions;

namespace NhuNguyetSpa.Application.UseCases.Bookings;

/// <summary>
/// UC-SPA-15 (docs/specs/bookings.md). Flow 1 holds the slot and creates its order like <c>POST /me/orders</c>; the payment result
/// confirms it (BR-BKG-06). Flow 2 books with a bought service or package session (BR-BKG-05), re-reading it after the customer
/// lock so two requests for one entitlement run one after the other.
/// </summary>
public sealed class CustomerBookingService : ICustomerBookingService
{
    private readonly ISpaServiceRepository _services;
    private readonly IPurchaseRepository _purchases;
    private readonly IAppointmentRepository _appointments;
    private readonly IOrderRepository _orders;
    private readonly IOrderService _orderService;
    private readonly OrderPlacement _placement;
    private readonly BookingSlotReserver _reserver;
    private readonly IUnitOfWork _unitOfWork;
    private readonly ICurrentUserService _currentUser;
    private readonly IDateTimeProvider _clock;
    private readonly IOptions<OrderOptions> _orderOptions;
    private readonly IOptions<OrderExpiryOptions> _expiryOptions;
    private readonly IValidator<BookNowRequest> _bookNowValidator;
    private readonly IValidator<BookAppointmentRequest> _bookValidator;

    public CustomerBookingService(
        ISpaServiceRepository services,
        IPurchaseRepository purchases,
        IAppointmentRepository appointments,
        IOrderRepository orders,
        IOrderService orderService,
        OrderPlacement placement,
        BookingSlotReserver reserver,
        IUnitOfWork unitOfWork,
        ICurrentUserService currentUser,
        IDateTimeProvider clock,
        IOptions<OrderOptions> orderOptions,
        IOptions<OrderExpiryOptions> expiryOptions,
        IValidator<BookNowRequest> bookNowValidator,
        IValidator<BookAppointmentRequest> bookValidator)
    {
        _services = services;
        _purchases = purchases;
        _appointments = appointments;
        _orders = orders;
        _orderService = orderService;
        _placement = placement;
        _reserver = reserver;
        _unitOfWork = unitOfWork;
        _currentUser = currentUser;
        _clock = clock;
        _orderOptions = orderOptions;
        _expiryOptions = expiryOptions;
        _bookNowValidator = bookNowValidator;
        _bookValidator = bookValidator;
    }

    private Guid CustomerId => _currentUser.UserId ?? throw new UnauthorizedException("Vui lòng đăng nhập.", "unauthorized");

    public async Task<OperationResult<BookNowResult>> BookNowAsync(BookNowRequest request, Guid? idempotencyKey, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _bookNowValidator.ValidateAndThrowAsync(request, cancellationToken);
        var customerId = CustomerId;
        if (idempotencyKey is { } key && await _orders.FindIdByIdempotencyKeyAsync(customerId, key, cancellationToken) is { } existing)
            return await BookNowResultAsync(existing, created: false, cancellationToken);

        var service = await _services.GetDetailAsync(request.SpaServiceId!.Value, true, cancellationToken) ?? throw CatalogErrors.ServiceNotFound();
        var (date, start) = (request.Date!.Value, request.StartTime!.Value);
        var grace = TimeSpan.FromMinutes(_expiryOptions.Value.GraceMinutes);
        // BR-BKG-06 / Q-03: the hold lasts as long as the order can still be paid, plus the IPN grace.
        var holdEnd = _clock.UtcNow.AddMinutes(_orderOptions.Value.PaymentTimeoutMinutes).Add(grace);
        EntitlementEligibility.EnsureBookNowStart(date, start, holdEnd);

        Order order = null!;
        try
        {
            await _unitOfWork.ExecuteInTransactionAsync(async token =>
            {
                var slot = await _reserver.ReserveAsync(customerId, service.Id, date, start, service.DurationMinutes, request.StaffMemberId, token);
                order = await _placement.PlaceAsync(new OrderRequest(OrderSource.BuyNow, service.Id, null, request.PromotionCode), customerId,
                    idempotencyKey, (placed, innerToken) => _appointments.AddAsync(new Appointment
                    {
                        CustomerId = customerId,
                        StaffMemberId = slot.StaffMemberId,
                        OrderItemId = placed.Items.Single().Id,
                        Date = date,
                        StartTime = start,
                        EndTime = slot.End,
                        Status = AppointmentStatus.Held,
                        HoldExpiresAtUtc = placed.PaymentDueAtUtc.Add(grace),
                        CreatedAtUtc = _clock.UtcNow,
                    }, innerToken), token);
            }, cancellationToken);
        }
        catch (ConflictException) when (idempotencyKey != null)
        {
            // The same key won a concurrent request (ux_orders_customer_id_idempotency_key); a slot conflict has no winner and rethrows.
            var winner = await _orders.FindIdByIdempotencyKeyAsync(customerId, idempotencyKey.Value, cancellationToken);
            if (winner == null)
                throw;
            return await BookNowResultAsync(winner.Value, created: false, cancellationToken);
        }
        return await BookNowResultAsync(order.Id, created: true, cancellationToken);
    }

    public async Task<OperationResult<MyAppointmentDto>> BookFromEntitlementAsync(BookAppointmentRequest request, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(request);
        await _bookValidator.ValidateAndThrowAsync(request, cancellationToken);
        var customerId = CustomerId;
        var (date, start) = (request.Date!.Value, request.StartTime!.Value);
        var nowUtc = _clock.UtcNow;

        // Untracked first read: the service and duration to reserve, and an early answer when the source cannot be booked.
        Guid spaServiceId;
        int duration;
        if (request.ServiceEntitlementId is { } entitlementId)
        {
            var bought = await _purchases.GetServiceAsync(entitlementId, customerId, cancellationToken) ?? throw BookingErrors.EntitlementNotFound();
            if (EntitlementEligibility.ForService(bought.Status, bought.ExpiresAtUtc, nowUtc) is { } reason)
                throw BookingErrors.EntitlementNotEligible(reason);
            spaServiceId = bought.SpaServiceId;
            // Q-29: a discontinued service can still be booked with what was bought; its current duration applies.
            duration = (await _services.GetByIdAsync(spaServiceId, cancellationToken))?.DurationMinutes ?? bought.DurationMinutes;
        }
        else
        {
            var facts = await SessionFactsAsync(request.TreatmentSessionId!.Value, customerId, cancellationToken);
            EntitlementEligibility.EnsureSessionSlot(facts, date, start, nowUtc);
            spaServiceId = facts.SpaServiceId;
            duration = facts.DurationMinutes;
        }

        var appointment = new Appointment();
        await _unitOfWork.ExecuteInTransactionAsync(async token =>
        {
            var slot = await _reserver.ReserveAsync(customerId, spaServiceId, date, start, duration, request.StaffMemberId, token);
            appointment = new Appointment
            {
                CustomerId = customerId,
                StaffMemberId = slot.StaffMemberId,
                Date = date,
                StartTime = start,
                EndTime = slot.End,
                Status = AppointmentStatus.Confirmed,
                CreatedAtUtc = _clock.UtcNow,
            };
            // Read again after the customer lock: a concurrent booking of the same source has committed by now.
            if (request.ServiceEntitlementId is { } id)
            {
                var (entitlement, _) = await _purchases.GetEntitlementForBookingAsync(id, customerId, token) ?? throw BookingErrors.EntitlementNotFound();
                if (EntitlementEligibility.ForService(entitlement.Status, entitlement.ExpiresAtUtc, nowUtc) is { } reason)
                    throw BookingErrors.EntitlementNotEligible(reason);
                entitlement.Book();
                appointment.ServiceEntitlementId = entitlement.Id;
            }
            else
            {
                var sessionId = request.TreatmentSessionId!.Value;
                EntitlementEligibility.EnsureSessionSlot(await SessionFactsAsync(sessionId, customerId, token), date, start, nowUtc);
                var session = await _purchases.GetSessionForUpdateAsync(sessionId, token) ?? throw BookingErrors.TreatmentSessionNotFound();
                session.Book();
                appointment.TreatmentSessionId = session.Id;
            }
            await _appointments.AddAsync(appointment, token);
            await _unitOfWork.SaveChangesAsync(token);
        }, cancellationToken);
        return await GetAsync(appointment.Id, cancellationToken);
    }

    public async Task<OperationResult<MyAppointmentDto>> GetAsync(Guid id, CancellationToken cancellationToken)
    {
        var mine = await _appointments.GetMineAsync(id, CustomerId, cancellationToken) ?? throw BookingErrors.AppointmentNotFound();
        return OperationResult<MyAppointmentDto>.Success(mine);
    }

    private async Task<SessionBookingFacts> SessionFactsAsync(Guid sessionId, Guid customerId, CancellationToken cancellationToken) =>
        await _purchases.GetSessionFactsAsync(sessionId, customerId, cancellationToken) ?? throw BookingErrors.TreatmentSessionNotFound();

    private async Task<OperationResult<BookNowResult>> BookNowResultAsync(Guid orderId, bool created, CancellationToken cancellationToken)
    {
        var order = (await _orderService.GetAsync(orderId, cancellationToken)).Data!;
        // An Idempotency-Key first used for a plain order cannot be replayed as a booking.
        var appointmentId = order.Appointment?.Id
                            ?? throw new BusinessRuleException("Idempotency-Key này đã được dùng cho một đơn hàng khác.", "validation_error");
        var appointment = (await GetAsync(appointmentId, cancellationToken)).Data!;
        return OperationResult<BookNowResult>.Success(new BookNowResult(appointment, order, created));
    }
}
